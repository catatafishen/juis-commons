import Container from "./components/Container.js";
import {Navigation} from "./router/Events.js";

let rootElement: HTMLElement;
let getIsCalled = false;
let registerRootElement = (newRoot: HTMLElement) => {
    if (!getIsCalled) {
        rootElement = newRoot;
    } else {
        throw new Error("Too late to register root. It should be registered before first usage.");
    }
};
const getRootElement = () => {
    getIsCalled = true;
    return rootElement || document.body;
};
const getRootContainer = () => {
    return new class extends Container {
        constructor() {
            super(getRootElement());
            this.addCssClass("juis");
            const triggerNavigate = () => {
                const urlParameters = new URLSearchParams(window.location.search);
                const parameters: Record<string, string> = {};
                urlParameters.forEach((value, key) => parameters[key] = value);
                this.trigger(new Navigation(document.location.pathname, "", parameters));
            };
            window.onpopstate = triggerNavigate;
            triggerNavigate();
        }
    };
};
export {registerRootElement, getRootElement, getRootContainer};
