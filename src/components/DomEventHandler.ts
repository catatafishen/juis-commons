import {getRootElement} from "../RootElement.js";
import DomEvent, {DomEvents} from "./DomEvents.js";

const eventListenerOptions = {passive: false, capture: true};
let globalListeners: Record<string, { element: Element, callbacks: ((eventPackage: DomEvent) => void)[] }[]> = {};

let createFirstGlobalListener = (eventName: keyof typeof DomEvents) => {
    globalListeners[eventName] = [];
    const rootElement = getRootElement();
    // Find the node which is the furthest down the hierarchy and is listening to this event and call its callback
    rootElement.addEventListener(eventName, (event) => {
        let callbacksPerElement = globalListeners[eventName];
        let element = event.target as Element;
        let eventPackage = packageEvent(element, eventName, event);
        while (element !== null) {
            if (!(element as HTMLInputElement).disabled) {
                let elementCallbacks = callbacksPerElement.find(elementCallback => elementCallback.element === element);
                if (elementCallbacks) {
                    elementCallbacks.callbacks.forEach(callback => {
                        callback(eventPackage);
                    });
                    break;
                }
            }
            if (element === rootElement) {
                break;
            }
            element = element.parentNode as HTMLElement;
        }
    }, eventListenerOptions);
};


let packageEvent = (element: Element, eventName: keyof typeof DomEvents, event: Event) => {
    return new (DomEvents[eventName])(eventName, event);
};

let registerGlobalListener = (element: Element, eventName: keyof typeof DomEvents, callbacks: ((eventPackage: DomEvent) => void)[]) => {
    if (globalListeners[eventName] === undefined) {
        createFirstGlobalListener(eventName);
    }
    globalListeners[eventName].push({element, callbacks});
};

let unRegisterGlobalListener = (element: Element, eventName: string) => {
    globalListeners[eventName] = globalListeners[eventName].filter(globalListener => globalListener.element != element);
};

export {registerGlobalListener, unRegisterGlobalListener};
