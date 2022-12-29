import {camelCaseToDash} from "../JuisUtils.js";
import Listenable from "../listenable/Listenable.js";
import {registerGlobalListener, unRegisterGlobalListener} from "./DomEventHandler.js";
import DomEvent, {DomEvents} from "./DomEvents.js";


function createElement(tagName: (keyof HTMLElementTagNameMap) | Element = "div", ...classNames: string[]) {
    if (typeof tagName !== "string") {
        return tagName;
    }
    let element = document.createElement(tagName);
    classNames = classNames.map(camelCaseToDash);
    classNames.unshift("juis");
    element.classList.add(...classNames);
    return element;
}

class JuiSElement extends Listenable {
    readonly #element: Element;

    constructor(element: Element) {
        super();
        this.#element = element;
    }

    toggleCssClass = (token: string, value?: boolean) => {
        if (value === undefined) {
            value = !this.#element.classList.contains(token);
        }
        if (value) {
            this.#element.classList.add(token);
        } else {
            this.#element.classList.remove(token);
        }
        return value;
    };

    addCssClass = (className: string) => {
        this.#element.classList.add(camelCaseToDash(className));
    };

    setStyle = (styleAttribute: keyof Omit<CSSStyleDeclaration, "length" | "parentRule" | number>, value: string) => {
        // @ts-ignore
        (this.#element as HTMLElement).style[styleAttribute] = value;
    };

    setInnerHtml = (html: string) => this.#element.innerHTML = html;
    setInnerText = (text: string) => this.#element.textContent = text;

    getElement = () => {
        return this.#element;
    };
}

type ComponentCallback<T extends Component> = (this: T, component: T) => void

interface init<T extends Component> {
    initialize(callback: ComponentCallback<T>): void;
}

class Component extends JuiSElement {
    readonly #wrappers: JuiSElement[] = [];
    readonly #waitingFor: Promise<any>[] = [];

    constructor(tagName?: keyof HTMLElementTagNameMap | Element, ...cssClasses: string[]) {
        super(createElement(tagName, ...cssClasses));
    }

    /**
     * Convenience method for creating a scoped callback with *this* referring to an instance of a component
     * @param instance
     * @param callback
     */
    static callback = <T extends Component>(instance: T, callback?: ComponentCallback<T>) => {
        if (callback) {
            callback.call(instance, instance);
        }
        return instance;
    };
    #registeredEvents: string[] = [];
    registerDomEvents = (eventName: keyof typeof DomEvents) => {
        if (!this.#registeredEvents.includes(eventName)) {
            this.#addEventListener(eventName, (eventPackage) => this.trigger(eventPackage));
            this.#registeredEvents.push(eventName);
        }
    };
    #domEventCallbacks: Record<string, ((eventPackage: DomEvent) => void)[]> = {};
    #addEventListener = (eventName: keyof typeof DomEvents, callback: (eventPackage: DomEvent) => void) => {
        if (this.#domEventCallbacks[eventName]) {
            this.#domEventCallbacks[eventName].push(callback);
        } else {
            this.#domEventCallbacks[eventName] = [callback];
            registerGlobalListener(this.getElement(), eventName, this.#domEventCallbacks[eventName]);
        }
        if (eventName === "dblclick") {
            this.#addDoubleTapListener(callback);
        }
    };
    destroy = () => {
        this.#registeredEvents.forEach(eventType => unRegisterGlobalListener(this.getElement(), eventType));
        this.removeAllListeners();
    };

    whenReady = () => {
        return Promise.all(this.#waitingFor).then(() => this);
    };

    waitFor = (promise: Promise<any>) => this.#waitingFor.push(promise);

    /**
     * Trigger dblclick callback also on touch screens
     * @param dblclickCallback
     */
    #addDoubleTapListener = (dblclickCallback: (eventPackage: DomEvent) => void) => {
        let previousTapTime = 0;
        let previousTarget: EventTarget | null | undefined;
        const callback = (eventPackage: DomEvent) => {
            let currentTime = new Date().getTime();
            let delta = currentTime - previousTapTime;
            previousTapTime = currentTime;
            if (delta < 600 && previousTarget === eventPackage.browserEvent?.target) {
                dblclickCallback(eventPackage);
                previousTapTime = 0;
                previousTarget = null;
                eventPackage.browserEvent?.stopPropagation();
                eventPackage.browserEvent?.preventDefault();
                window.navigator.vibrate(50);
                return false;
            } else {
                previousTarget = eventPackage.browserEvent?.target;
            }
        };
        if (this.#domEventCallbacks["touchstart"]) {
            this.#domEventCallbacks["touchstart"].push(callback);
        } else {
            this.#domEventCallbacks["touchstart"] = [callback];
            registerGlobalListener(this.getElement(), "touchstart", this.#domEventCallbacks["touchstart"]);
        }
    };

    preventDefaultDomEvent = (eventName: string) => {
        this.getElement().addEventListener(eventName, (event: Event) => event.preventDefault());
    };

    getOuterElement = () => {
        return this.#wrappers[0]?.getElement() || this.getElement();
    };

    addWrapper(tagName?: keyof HTMLElementTagNameMap, ...cssClasses: string[]) {
        const newWrapper = new JuiSElement(createElement(tagName, ...cssClasses));
        let outerElement = this.getOuterElement();
        let oldParent = outerElement.parentNode;
        newWrapper.getElement().appendChild(outerElement);
        if (oldParent) {
            oldParent.appendChild(newWrapper.getElement());
        }
        this.#wrappers.unshift(newWrapper);
        return newWrapper;
    }

    // requestNavigation = (url: string, parameters?: EventProperties, eventData?: any) => {
    //     return this.triggerOnce(REQUEST_NAVIGATE, {url, parameters, ...eventData});
    // };
}

export {Component as default, ComponentCallback};
