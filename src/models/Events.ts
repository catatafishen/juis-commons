import JuisEvent from "../listenable/JuisEvent.js";

class Change<T> extends JuisEvent {
    field: string;
    oldValue?: T;
    newValue?: T;

    constructor(field: string, newValue: T, oldValue?: T) {
        super();
        this.field = field;
        this.newValue = newValue;
        this.oldValue = oldValue;
    }
}

export {Change};
