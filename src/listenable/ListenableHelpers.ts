import Listener, {EventHandler} from "./Listener.js";
import {removeByValue} from "../JuisUtils.js";
import Listenable from "./Listenable.js";
import Event from "./JuisEvent.js";

const listeners: Map<symbol, Listener<any>[]> = new Map();

const getListeners = (id: symbol) => {
    let listenerList = listeners.get(id);
    if (!listenerList) {
        listenerList = [];
        listeners.set(id, listenerList);
    }
    return listenerList;
};

const registerListener = <T extends typeof Event>(id: symbol, listener: Listener<T>) => {
    getListeners(id).push(listener);
};

const createListener = function <T extends typeof Event>(listenable: Listenable, listensTo: T, handler?: EventHandler<InstanceType<T>>, once = false) {
    let listener = new Listener(listensTo, listenable, handler, once);
    registerListener(listenable.getListenableId(), listener);
    triggerListenerAddedEvent(listenable, listener);
    listenable.firePersistingEvents(listensTo);
    return listener;
};

class ListenerAddedEvent extends Event {
    readonly listener;

    constructor(listener: Listener<any>) {
        super({propagating: false});
        this.listener = listener;
    }
}

const triggerListenerAddedEvent = function (listenable: Listenable, listener: Listener<any>) {
    listenable.trigger(new ListenerAddedEvent(listener));
};


const removeAllListeners = (id: symbol) => {
    listeners.delete(id);
};

const unRegisterListener = (listener: Listener<any>) => {
    const listenable = listener.getListenable();
    const listenerList = getListeners(listenable.getListenableId());
    removeByValue(listenerList, listener);
};
export {
    unRegisterListener,
    removeAllListeners,
    createListener,
    triggerListenerAddedEvent,
    getListeners
};
