import JuisEvent from "./JuisEvent.js";
import Event, {ResolvableEvent} from "./JuisEvent.js";
import {createListener, getListeners, removeAllListeners} from "./ListenableHelpers.js";
import {EventHandler} from "./Listener.js";


class Listenable {
    readonly persistingEvents: JuisEvent[] = [];
    nextListenable?: Listenable;
    readonly #listenableIdentifier = Symbol();
    fire = (event: JuisEvent, local = false) => {
        [...getListeners(this.#listenableIdentifier)].forEach((listener) => {
            if (!(event instanceof ResolvableEvent) || !event.isResolved()) {
                listener.handle(event);
            }
        });
        if (event.isPersistent()) {
            this.persistingEvents.push(event);
        }
        if (!local) {
            event.propagate();
        }
    };


    on = <T extends JuisEvent>(listensTo: { new(...args: any): T }, handler?: EventHandler<T>) => createListener(this, listensTo, handler);

    replaceListeners = <T extends JuisEvent>(listensTo: { new(...args: any): T }, handler: EventHandler<T>) => {
        getListeners(this.#listenableIdentifier)
            .filter(listener => listener.listensTo.includes(listensTo))
            .forEach(listener => listener.destruct());
        return this.on(listensTo, handler);
    };

    redirectEvent = <T extends JuisEvent>(listensTo: { new(...args: any): T }, listenable: Listenable) => {
        let redirectListener = createListener(this, listensTo);
        redirectListener.redirect(listenable);
        return redirectListener;
    };

    when = <T extends JuisEvent>(listensTo: { new(...args: any): T }) => {
        return new Promise(resolve => this.listenOnce(listensTo, resolve));
    };

    listenOnce = <T extends JuisEvent>(listensTo: { new(...args: any): T }, handler: EventHandler<T>) => {
        return createListener(this, listensTo, handler, true);
    };

    removeAllListeners = () => {
        removeAllListeners(this.#listenableIdentifier);
    };

    trigger = <T extends JuisEvent>(event: T) => {
        event.trigger(this);
    };

    dontPropagate = <T extends typeof JuisEvent>(eventTypes: T | T[]) => {
        if (!Array.isArray(eventTypes)) {
            eventTypes = [eventTypes];
        }
        eventTypes.forEach(eventType => this.on(eventType, (event) => event.stopPropagation()));
    };

    setEventOrigin = (origin: Listenable) => {
        this.trigger = (...triggerArgs) => origin.trigger.apply(origin, triggerArgs);
    };
    getListenableId = () => this.#listenableIdentifier;
    firePersistingEvents = <T extends typeof Event>(listensTo: T) =>{
        let persistentEvent = this.persistingEvents.find(event => event instanceof listensTo);
        if (persistentEvent) {
            this.fire(persistentEvent, true);
        }
    };
}

export {Listenable as default};
