
import { asyncLoadResByUrl, setResource, waitResource } from "../utils/loadResources.js";
const mcComponents = {};
setResource("MCComponent", mcComponents);

class MCComponent extends HTMLElement {
    static setBorderAndWaitImg(uri, styleSelector = "." + uri, styleDeclarations = {}) {
        if (!("preloadStyleRules" in this)) this.preloadStyleRules = [];
        if (!uri.startsWith("mc-ui-")) uri = "mc-ui-" + uri + "-img";
        const setIfNotExist = obj => Object.entries(obj).forEach(([property, value]) =>
            styleDeclarations[property] = styleDeclarations[property] || value);
        setIfNotExist({
            "border-color": "transparent",
            "border-style": "solid",
            "border-image": `var(--${uri})
                var(--${uri}-border-top)
                var(--${uri}-border-right)
                var(--${uri}-border-bottom)
                var(--${uri}-border-left)
                fill stretch`,
        });
        let rule = styleSelector + " {\n"
            + Object.entries(styleDeclarations).map(([property, value]) => `${property}: ${value};`).join("\n")
            + "\n}";
        this.preloadStyleRules.push(rule);
        return waitResource(uri);
    };
    static setBackgroundAndWaitImg(uri, styleSelector = "." + uri, styleDeclarations = {}) {
        if (!("preloadStyleRules" in this)) this.preloadStyleRules = [];
        if (!uri.startsWith("mc-ui-")) uri = "mc-ui-" + uri + "-img";
        const setIfNotExist = obj => Object.entries(obj).forEach(([property, value]) =>
            styleDeclarations[property] = styleDeclarations[property] || value);
        setIfNotExist({
            "background-image": `var(--${uri})`,
            "background-size": "cover",
            "background-repeat": "no-repeat",
        });
        let rule = styleSelector + " {\n"
            + Object.entries(styleDeclarations).map(([property, value]) => `${property}: ${value};`).join("\n")
            + "\n}";
        this.preloadStyleRules.push(rule);
        return waitResource(uri);
    };
    static genTemplate(text, id = text) {
        if (mcComponents[id]) return mcComponents[id];
        let template = document.createElement("template");
        template.innerHTML = (this.preloadStyleRules
            ? "<style> " + this.preloadStyleRules.join("\n") + "</style>"
            : "") + text;
        mcComponents[id] = template;
        return template;
    };
    static asyncLoadTemplateByUrl(url = this.templateUrl) {
        return asyncLoadResByUrl(url).then(text => {
            if (typeof text !== "string") return text;
            let tmp = this.genTemplate(text, url);
            setResource(url, tmp);
            return tmp;
        });
    };
    static define(componentName = this.componentName) {
        if (!componentName) throw "Component registration failed: Missing componentName.";
        return customElements.define(componentName, this);
    };
    static asyncLoadAndDefine() {
        return this.asyncLoadTemplateByUrl().then(_ => this.define());
    };
    static getTemplateByUrl(url = this.templateUrl) {
        return mcComponents[url];
    };
    get template() { return this.constructor.getTemplateByUrl(); };
    appendTemplate(template = this.template) {
        return template.content
            ? this.shadowRoot.appendChild(template.content.cloneNode(true))
            : null;
    };
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        if (this.template) this.appendTemplate();
    };
    async connectedCallback() {};
    async disconnectedCallback() {};
    async adoptedCallback() {};
    dispatchEvent(type, {
        global = false,
        data = {}
    } = {}) {
        return type instanceof Event
        ? super.dispatchEvent(type)
        : super.dispatchEvent(new CustomEvent(type, {
            ...(global? {
                bubbles: true,
                cancelable: true,
                composed: true,
            }: {}),
            detail: data,
        }));
    };
};

export {
    MCComponent,
};
