import JuisEvent from "../listenable/JuisEvent.js";


abstract class DomEvent extends JuisEvent {
    readonly browserEvent: Event | null;
    readonly eventName: string;

    constructor(eventName: string, browserEvent: Event | null) {
        super();
        this.eventName = eventName;
        this.browserEvent = browserEvent;
    }
}

class Click extends DomEvent {
}

class DblClick extends DomEvent {
}

class Mousedown extends DomEvent {
}

class Mouseenter extends DomEvent {
}

class Mouseleave extends DomEvent {
}

class Mousemove extends DomEvent {
}

class Mouseout extends DomEvent {
}

class Mouseover extends DomEvent {
}

class Mouseup extends DomEvent {
}

class Keydown extends DomEvent {
}

class Input extends DomEvent {
}

class Touchstart extends DomEvent {
}

let DomEvents = {
    click: Click,
    dblclick: DblClick,
    mousedown: Mousedown,
    mouseenter: Mouseenter,
    mouseleave: Mouseleave,
    mousemove: Mousemove,
    mouseout: Mouseout,
    mouseover: Mouseover,
    mouseup: Mouseup,
    keydown: Keydown,
    input: Input,
    touchstart: Touchstart
};

export {
    DomEvent as default,
    DomEvents,
    Click,
    DblClick,
    Mousedown,
    Mouseenter,
    Mouseleave,
    Mousemove,
    Mouseout,
    Mouseover,
    Mouseup,
    Keydown,
    Input,
    Touchstart
};
