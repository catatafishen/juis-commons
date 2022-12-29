import Listenable from "./Listenable.js";
import {arrayWrap} from "../JuisUtils.js";

type EventProperties = {
    propagating?: boolean,
    persistent?: boolean,
    skipOrigin?: boolean,
    origin?: Listenable,
    resolve?: (result: any) => void,
    reject?: (result: string) => void
}

class JuisEvent {
    readonly #propagationPath: Listenable[];
    readonly #persistent: boolean;
    readonly #skipOrigin;
    #propagating: boolean;
    #next?: Listenable;

    constructor(eventProperties: Omit<EventProperties, "resolve" | "reject"> = {}) {
        this.#propagationPath = arrayWrap(eventProperties.origin);
        this.#propagating = eventProperties.propagating ?? true;
        this.#persistent = eventProperties.persistent ?? false;
        this.#skipOrigin = eventProperties.skipOrigin ?? false;
    }

    setNext = (listenable?: Listenable) => this.#next = listenable;
    getNext = () => this.#next;
    hasNext = () => !!this.#next;
    getOrigin = () => this.#propagationPath[0];
    getPropagationPath = () => [...this.#propagationPath];
    stopPropagation = () => this.#propagating = false;
    isPropagating = () => this.#propagating;
    isPersistent = () => this.#persistent;
    trigger = (origin: Listenable) => {
        if (this.#propagationPath.length > 0) {
            throw new Error("Cannot trigger more than once");
        }
        this.#propagationPath.push(origin);
        this.setNext(origin.nextListenable);

        if (this.#skipOrigin) {
            this.propagate();
        } else {
            origin.fire(this);
        }
    };

    propagate = () => {
        if (this.#propagating) {
            if (this.#next) {
                let tempNext = this.#next;
                this.#propagationPath.push(this.#next);
                this.setNext(this.#next.nextListenable);
                tempNext.fire(this);
            } else {
                this.stopPropagation();
            }
        }
    };
}

class ResolvableEvent<ResolveType> extends JuisEvent {
    readonly #resolve: (result: ResolveType) => void;
    readonly #reject: (result: string) => void;
    #resolved = false;

    constructor(eventProperties: EventProperties & Required<Pick<EventProperties, "resolve" | "reject">>) {
        super(eventProperties);
        this.#resolve = eventProperties.resolve;
        this.#reject = eventProperties.reject;
    }

    resolve = (result: ResolveType) => {
        if (this.#resolved) {
            throw new Error("Tried to resolve event " + this.toString() + " more than once. Value was " + result);
        }
        if (!!this.#resolve) {
            this.#resolve(result);
        }
        this.stopPropagation();
        this.#resolved = true;
    };
    isResolved = () => this.#resolved;


    propagate = () => {
        let hadNext = this.hasNext();
        super.propagate();
        if (!hadNext) {
            this.#reject(`Unhandled event of type ${this.toString()}.`);
        }
    };
}

export {JuisEvent as default, ResolvableEvent, EventProperties};
