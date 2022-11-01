import {arrayWrap, removeByValue} from "./JuisUtils.js";

/**
 * @callback eventHandler
 * @param Payload {any}
 * @param Event {Event}
 *
 */

/**
 * @callback eventHandlerFilter
 * @param Payload {any}
 * @param Event {Event}
 * @returns boolean
 */


/**
 *
 * @param listenable {Listenable}
 * @param listensTo {string}
 * @param handler {eventHandler}
 * @param once {boolean}
 * @returns {Listener}
 */
const createListener = function (listenable, listensTo, handler, once = false) {
    let listener = new Listener(listensTo, handler, listenable, once);
    if (!listenable[idKey]) {
        listenable[idKey] = Symbol();
        listeners.set(listenable[idKey], []);
    }
    listeners.get(listenable[idKey]).push(listener);
    listenerAddedEvent(listenable, listener);
    firePersistingEvents(listenable, listensTo);
    return listener;
};

const listenerAddedEvent = function (listenable, listener) {
    listenable.trigger("listenerAdded", {"listener": listener});
};

const firePersistingEvents = function (listenable, listensTo) {
    if (listenable.persistingEvents && listenable.persistingEvents[listensTo]) {
        listenable.fire(listenable.persistingEvents[listensTo], true);
    }
};

/**
 *
 * @param listensTo {string}
 * @param handler {eventHandler}
 * @param thisListenable {Listenable}
 * @param once
 * @constructor
 */
const Listener = function (listensTo, handler, thisListenable, once = false) {
    let autoResume = false;
    let filters = [];
    this.listensTo = arrayWrap(listensTo);
    this.active = true;
    this.pause = () => this.active = false;
    this.pauseOnce = () => {
        this.active = false;
        autoResume = true;
    };
    this.resume = () => {
        this.active = true;
        autoResume = false;
    };
    let redirectTo;
    this.redirect = (listener) => redirectTo = listener;

    /**
     *
     * @param newHandler {eventHandler}
     * @returns {Listener}
     */
    this.do = (newHandler) => {
        handler = newHandler;
        return this;
    };

    /**
     *
     * @param filter {eventHandlerFilter}
     * @returns {Listener}
     */
    this.filter = (filter) => {
        filters.push(filter);
        return this;
    };

    this.handle = (event) => {
        if (!this.listensTo.includes(event.getType())) {
            return;
        }
        if (redirectTo) {
            event.setNext(redirectTo);
            return;
        }
        if (!this.active) {
            if (autoResume) {
                this.resume();
            }
            return;
        }
        if (!filters.every(filter => filter.call(thisListenable, event.getData(), event))) {
            return;
        }
        let returnValue = handler.call(thisListenable, event.getData(), event);
        if (event.isResolvable()) {
            event.resolve(returnValue);
        }
        if (once === true) {
            this.destruct();
        }
    };
    this.destruct = function () {
        this.active = false;
        removeByValue(listeners.get(thisListenable[idKey]), this);
    };
};

/**
 *
 * @param type
 * @param data
 * @param eventProperties
 * @constructor
 */
const Event = function (type, data, eventProperties) {
    let next;
    let propagationPath = [eventProperties.origin];
    let resolved = false;
    this.setNext = (listenable) => next = listenable;
    this.getNext = () => next;
    this.getType = () => type;
    this.getData = () => data;
    this.getOrigin = () => eventProperties.origin;
    this.getPropagationPath = () => [...propagationPath];
    this.stopPropagation = () => eventProperties.propagating = false;
    this.isPropagating = () => !!eventProperties.propagating;
    this.isPersistent = () => !!eventProperties.persistent;
    this.resolve = (result) => {
        if (resolved) {
            throw new Error("Tried to resolve event " + type + " more than once. Value was " + result);
        }
        if (eventProperties.resolve) {
            eventProperties.resolve(result);
        }
        this.stopPropagation();
        resolved = true;
    }
    this.isResolved = () => resolved;
    this.isResolvable = () => !!eventProperties.resolve;

    this.propagate = () => {
        if (eventProperties.propagating) {
            if (next && next.fire) {
                let tempNext = next;
                propagationPath.unshift(next);
                this.setNext(next.nextListenable);
                tempNext.fire(this);
            } else {
                this.stopPropagation();
                if (eventProperties.reject) {
                    eventProperties.reject(`Unhandled event of type ${type}. Event data: ${JSON.stringify(data)}`);
                }
            }
        }
    };
};

const listeners = new Map(); // ListanableId -> [listeners]
const idKey = Symbol();
/**
 * @mixin Listenable
 */
export default function () {
    /**
     *
     * @param event {Event}
     * @param local {boolean}
     */
    this.fire = function (event, local = false) {
        if (this[idKey] && listeners.has(this[idKey])) {
            [...listeners.get(this[idKey])].forEach((listener) => {
                if (!event.isResolved()) {
                    listener.handle(event);
                }
            });
        }
        if (event.isPersistent()) {
            if (!this.persistingEvents) {
                //There can ever only be one persisting event of each type on a single element
                this.persistingEvents = {};
            }
            this.persistingEvents[event.getType()] = event;
        }
        if (!local) {
            event.propagate();
        }
    };

    /**
     *
     * @param listensTo {string}
     * @param handler {eventHandler}
     * @returns {Listener}
     */
    this.on = function (listensTo, handler) {
        return createListener(this, listensTo, handler);
    };

    this.replaceListeners = function (listensTo, handler) {
        listeners.get(this[idKey])
            .filter(listener => listener.listensTo.includes(listensTo))
            .forEach(listener => listener.destruct());
        return this.on(listensTo, handler);
    };

    this.redirectEvent = function (listensTo, listener) {
        let redirectListener = createListener(this, listensTo, () => {
        });
        redirectListener.redirect(listener);
        return redirectListener;
    }

    this.when = function (listensTo) {
        return new Promise(resolve => this.listenOnce(listensTo, resolve));
    };

    this.listenOnce = function (listensTo, handler) {
        return createListener(this, listensTo, handler, true);
    };

    this.triggerOnce = function (type, data, properties = {}) {
        return new Promise((resolve, reject) => {
            properties = {...properties, resolve, reject};
            this.trigger(type, data, properties);
        });
    };

    this.removeAllListeners = function () {
        listeners.delete(this[idKey]);
    };

    /**
     * The complete Triforce, or one or more components of the Triforce.
     * @typedef {Object} EventProperties
     * @property {Listenable} [origin]
     * @property {boolean} [propagating]
     * @property {boolean} [persistent]
     * @property {boolean} [skipOrigin]
     */

    /**
     *
     * @param type {string}
     * @param data {any}
     * @param properties {EventProperties}
     */
    this.trigger = function (type, data, properties = {}) {
        properties = {origin: this, propagating: true, persistent: false, ...properties};
        let event = new Event(type, data, properties);
        event.setNext(this.nextListenable);
        if (properties.skipOrigin) {
            event.propagate();
        } else {
            this.fire(event);
        }
    };

    /**
     *
     * @param events {[string]|string}
     */
    this.dontPropagate = function (events) {
        if (!Array.isArray(events)) {
            events = [events];
        }
        events.forEach(eventName => this.on(eventName, (ignore, event) => event.stopPropagation()));
    };

    /**
     *
     * @param origin {Listenable}
     */
    this.setEventOrigin = function (origin) {
        this.trigger = (...triggerArgs) => origin.trigger.apply(origin, triggerArgs);
    };
    this.nextListenable = undefined;
}
