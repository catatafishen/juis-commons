import test from "ava";
import Listenable from "./Listenable.js";
import Event from "./JuisEvent.js";

class Event1 extends Event {
}

class Event2 extends Event {


    constructor(test: string) {
        super();
    }
}


test("Listener is triggered on event", test => {
    const myListenable = new Listenable();
    myListenable.on(Event1, () => test.pass());
    myListenable.trigger(new Event1());
});

test("Listener should not trigger for wrong event", test => {
    const myListenable = new Listenable();
    myListenable.on(Event1, () => test.fail());
    myListenable.trigger(new Event2("asd"));
    test.pass();
});

test("Event should propagate to next listener", test => {
    const myListenable = new Listenable();
    const myListenable2 = new Listenable();
    myListenable.nextListenable = myListenable2;
    myListenable2.on(Event1, () => test.pass());
    myListenable.trigger(new Event1());
});

test("Promise type listeners are triggered", test => {
    const myListenable = new Listenable();
    const myListenable2 = new Listenable();
    myListenable.nextListenable = myListenable2;
    let promise = myListenable2.when(Event1).then(() => test.pass());
    myListenable.trigger(new Event1());
    return promise;
});
