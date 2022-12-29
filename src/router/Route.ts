import Component from "../components/Component.js";
import {dynamicImport} from "./Router.js";
import {concatenateUrls} from "./NavigationUtils.js";

class Route {
    readonly urlString?: string;
    readonly urlRegExp?: RegExp;
    readonly #component?: Component;
    readonly #componentPath?: string;
    readonly componentName: string = "default";
    readonly #parameterNames: string[];
    cacheComponents: boolean = true;
    #componentCache: Record<string, Component> = {};

    constructor(url: string | RegExp, view: Component | string, ...parameterNames: string[]) {
        if (typeof url === "string") {
            if (!url.startsWith("/")) {
                url = "/" + url;
            }
            this.urlString = url;
        } else {
            this.urlRegExp = url;
        }
        if (typeof view === "string") {
            this.#componentPath = view;
        } else {
            this.#component = view;
        }
        this.#parameterNames = parameterNames;
    };

    getComponent = (consumedUrl: string, dynamicImport: dynamicImport, viewsPath = "./") => {
        if (this.#component) {
            return this.#component.whenReady();
        }
        if (this.cacheComponents && this.#componentCache[consumedUrl]) {
            return this.#componentCache[consumedUrl].whenReady();
        }
        if (this.#componentPath) {
            return dynamicImport(concatenateUrls(viewsPath, this.#componentPath)).then(module => {
                let component = this.#getComponentFromModule(module);
                if (this.cacheComponents) {
                    this.#componentCache[consumedUrl] = component;
                }
                return component.whenReady();
            });
        }
        return Promise.reject();
    };

    #getComponentFromModule = (module: { [x: string]: any; }): Component => {
        // @ts-ignore
        let component = module[this.componentName];
        if (component instanceof Component) {
            return component;
        } else {
            return new component;
        }
    };

    isMatchingUrl = (url: string) => this.#isMatchingUrlString(url) || this.#isMatchingUrlRegexp(url);

    #isMatchingUrlString = (url: string) => {
        if (!this.urlString) {
            return false;
        }
        return url.startsWith(this.urlString);
    };

    #isMatchingUrlRegexp = (url: string) => {
        if (!this.urlRegExp) {
            return false;
        }
        return this.urlRegExp.test(url);
    };

    getParameters = (consumedUrl: string): Record<string, string> => {
        const parameters: Record<string, string> = {};
        if (this.urlRegExp) {
            let matches = consumedUrl.match(this.urlRegExp);
            if (matches && matches.length > 1) {
                matches.slice(1).forEach((match, index) => parameters[this.#parameterNames[index]] = match);
            }
        }
        return parameters;
    };

    consumeUrl = (url: string) => {
        if (this.urlRegExp) {
            let matches = url.match(this.urlRegExp);
            if (matches === null) {
                throw new Error(`Cannot consume url ${url} that does not match pattern ${this.urlRegExp.toString()}`);
            }
            return url.substring(0, matches[0].length);
        }
        if (this.urlString) {
            return url.substring(0, this.urlString.length);
        }
        throw new Error("This route has neither a string nor a RegExp to match");
    };
}


export default Route;
