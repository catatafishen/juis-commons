import {arrayWrap} from "../JuisUtils.js";
import Event, {ResolvableEvent} from "./JuisEvent.js";
import {unRegisterListener} from "./ListenableHelpers.js";
import Listenable from "./Listenable.js";

interface EventHandler<EventType extends Event> {
    (event: EventType): any;
}

interface EventHandlerFilter<EventType extends Event> {
    (event: EventType): boolean;
}

class Listener<T extends typeof Event> {
    #autoResume = false;
    readonly #filters: EventHandlerFilter<InstanceType<T>>[] = [];
    readonly listensTo;
    readonly #thisListenable;
    readonly #once;
    #handler;
    active = true;
    #redirectTo?: Listenable;

    constructor(listensTo: T, thisListenable: Listenable, handler?: EventHandler<InstanceType<T>>, once = false) {
        this.listensTo = arrayWrap(listensTo);
        this.#thisListenable = thisListenable;
        this.#handler = handler;
        this.#once = once;
    }

    pause = () => this.active = false;
    pauseOnce = () => {
        this.active = false;
        this.#autoResume = true;
    };
    resume = () => {
        this.active = true;
        this.#autoResume = false;
    };

    redirect = (listenable: Listenable) => this.#redirectTo = listenable;


    do = (newHandler: EventHandler<InstanceType<T>>) => {
        this.#handler = newHandler;
        this.listensTo.forEach(this.#thisListenable.firePersistingEvents);
        return this;
    };

    filter = (filter: EventHandlerFilter<InstanceType<T>>) => {
        this.#filters.push(filter);
        return this;
    };

    isListeningTo = <U extends Event>(event: U) => {
        return this.listensTo.find(listensTo => event instanceof listensTo)!!;
    };

    handle = (event: InstanceType<T>) => {
        if (!this.isListeningTo(event)) {
            return;
        }
        if (this.#redirectTo) {
            event.setNext(this.#redirectTo);
            return;
        }
        if (!this.active) {
            if (this.#autoResume) {
                this.resume();
            }
            return;
        }
        if (!this.#filters.every(filter => filter.call(this.#thisListenable, event))) {
            return;
        }
        let returnValue = this.#handler?.call(this.#thisListenable, event);
        if (event instanceof ResolvableEvent) {
            event.resolve(returnValue);
        }
        if (this.#once === true) {
            this.destruct();
        }
    };
    destruct = () => {
        this.active = false;
        unRegisterListener(this);
    };
    getListenable = () => this.#thisListenable;
}

export {Listener as default, EventHandler};
