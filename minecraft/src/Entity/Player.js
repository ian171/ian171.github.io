import Entity from "./Entity.js";
import { vec3, vec2, EPSILON } from "../utils/gmath.js";
import Block from "../World/Block.js";

class Player extends Entity {
    constructor(world = null, {
        position = [0, 10, 0],
        pitch = 0, yaw = 0,
    } = {}) {
        super({
            min: [-0.25, 0, -0.25],
            max: [0.25, 1.8, 0.25]
        }, {eyePos: [0, 1.65, 0], position, pitch, yaw, world});

        this.normalMoveSpeed = 4.317;
        this.runMoveSpeed = 5.612;
        this.flyMoveSpeed = 11;
        this.flyRunMoveSpeed = 22;
        this.moveSpeed = this.normalMoveSpeed;     // block / s
        super.gravityAcceleration = 30; // block / s ^ 2
        // h = v^2 / 2g = 1.25 -> v = √2gh
        this.jumpSpeed = Math.sqrt(2 * this.gravityAcceleration * 1.25);
        this.normalJumpSpeed = this.jumpSpeed;
        this.flyJumpSpeed = 20;

        this._horiMoveDir = vec2.create();
        this.horiVelocity = vec2.create();
        this.horiAcceleration = 0;
        this._vertMoveDir = 0;
        this.vertVelocity = 0;
        this.vertAcceleration = -this.gravityAcceleration;

        this.rest = vec3.create();
        this.lastChunk = [];
        this.isFly = false; this.isRun = false;

        this._onHandItem = Block.getBlockByBlockName("air");
        this._velocity = vec3.create();
        this._acceleration = vec3.create();
        this.eyeInFluid = false;
    };
    get onHandItem() { return this._onHandItem; };
    set onHandItem(value) {
        if (value instanceof Block)
            this._onHandItem = value;
        else if (typeof value === "string")
            this._onHandItem = Block.getBlockByBlockName(value) || this._onHandItem;
    };
    get horiMoveDir() { return this._horiMoveDir; };
    set horiMoveDir(arr) {
        vec2.create(arr[0], arr[1], this._horiMoveDir);
        vec2.normalize(this._horiMoveDir, this._horiMoveDir);
    };
    get vertMoveDir() { return this._vertMoveDir; };
    set vertMoveDir(val) { this._vertMoveDir = val? val > 0? 1: -1: 0; };
    get velocity() {
        return vec3.create(this.horiVelocity[0], this.vertVelocity, this.horiVelocity[1], this._velocity);
    };
    get acceleration() {
        return vec3.create(this.horiAcceleration, this.vertAcceleration, this.horiAcceleration, this._acceleration);
    };
    toFlyMode(fly = false) {
        this.isFly = fly;
        if (fly) {
            this.vertAcceleration = 0;
            this.moveSpeed = this.isRun? this.flyRunMoveSpeed: this.flyMoveSpeed;
        }
        else {
            this.vertAcceleration = -this.gravityAcceleration;
            this.moveSpeed = this.isRun? this.normalMoveSpeed: this.runMoveSpeed;
        }
    };
    toRunMode(run = false) {
        this.isRun = run;
        if (run) {
            this.moveSpeed = this.isFly? this.flyRunMoveSpeed: this.runMoveSpeed;
            if (this.camera) {
                this.camera.changeFovyWithAnimation(10);
            }
        }
        else {
            this.moveSpeed = this.isFly? this.flyMoveSpeed: this.normalMoveSpeed;
            if (this.camera) {
                this.camera.changeFovyWithAnimation(0);
            }
        }
    };
    get onGround() { return this.rest[1] === -1; };
    move_and_collide(motion, dt) {
        let ds = vec3.scale(motion, dt);
        let chunkFn = (x, y, z) => {
            let b = this.world.getBlock(x, y, z);
            return b && b.name !== "air" && b.renderType !== Block.renderType.FLOWER && b.renderType !== Block.renderType.FLUID;
        };
        vec3.create(0, 0, 0, this.rest);
        for (let i = 0, dSpatium = vec3.create(); i < 3; dSpatium[i++] = 0) {
            dSpatium[i] = ds[i];
            let hit = this.world.hitboxesCollision(this.getGloBox(), dSpatium, chunkFn);
            while (hit) {
                this.position[hit.axis] = hit.pos - (hit.step > 0
                    ? this.hitboxes.max[hit.axis]: this.hitboxes.min[hit.axis]);
                this.rest[hit.axis] = hit.step;
                motion[hit.axis] = ds[hit.axis] = dSpatium[hit.axis] = 0;
                if (hit.axis !== 1) this.toRunMode(false);
                hit = this.world.hitboxesCollision(this.getGloBox(), dSpatium, chunkFn);
            }
        }
        this.horiVelocity.set([motion[0], motion[2]]);
        this.vertVelocity = motion[1];
        vec3.add(this.position, ds, this.position);
        this.eyeInFluid = this.world.getBlock(...this.getEyePosition())?.isFluid ?? false;
    };
    update(dt) {
        if (!this.world) return;
        dt /= 1000;
        if (this.isFly) {
            this.vertVelocity = this.vertMoveDir * this.flyJumpSpeed;
            this.vertVelocity += this.vertAcceleration * dt;
        }
        else {
            if (this.onGround)
                this.vertVelocity = Math.max(0, this.vertMoveDir) * this.jumpSpeed;
            this.vertVelocity += this.vertAcceleration * dt;
        }
        if (this.isFly) {
            this.horiAcceleration = 12;
        }
        else {
            let pos = this.position,
                block = this.world.getBlock(pos[0], pos[1] - 1, pos[2]),
                blockFriction = block? (block.friction || 1): 1;
            this.horiAcceleration = blockFriction * 20;
        }
        let horiVel = vec2.create();
        if (vec2.length(this.horiMoveDir) > EPSILON) {
            let deltaYaw = vec2.angle(vec2.create(0, 1, horiVel), this.horiMoveDir);
            vec2.rotateOrigin(vec2.create(0, -this.moveSpeed, horiVel), -(this.yaw + deltaYaw), horiVel);
        }
        vec2.move_toward(this.horiVelocity, horiVel, this.horiAcceleration * dt, this.horiVelocity);
        this.move_and_collide(this.velocity, dt);
    };
};

export {
    Player,
    Player as default
};
