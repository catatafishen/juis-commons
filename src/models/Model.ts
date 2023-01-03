import {FieldProperties, getFields} from "./fieldDecorator.js";
import createEntityArrayProxy from "./createEntityArrayProxy.js";
import Listenable from "../listenable/Listenable.js";
import {Change} from "./Events.js";

class Model extends Listenable {
    readonly #fieldNames: string[];
    readonly #fields;

    constructor() {
        super();
        const fields = getFields(this);
        Object.entries(fields).forEach(([name, fieldProperties]) => {
            Object.defineProperty(this, name, {
                set: this.#getFieldSetter(name, fieldProperties),
                get: this.#getFieldGetter(name, fieldProperties),
                enumerable: true
            });
        });
        this.#fieldNames = Object.keys(fields);
        this.#fields = fields;
    }

    #savedProperties: Record<string, any> = {};
    #unsavedProperties: Record<string, any> = {};

    hasUnsavedProperties = () => {
        return Object.keys(this.#unsavedProperties).length > 0;
    };

    #getFieldSetter = <T extends Model>(name: string, fieldProperties: FieldProperties<any>) => {
        return (newValue: any) => {
            const oldValue = this.getPropertyValue(name);
            if (newValue === oldValue) {
                return newValue;
            }
            if (fieldProperties.transient) {
                return this.setSavedProperty(name, newValue);
            } else {
                return this.setUnsavedProperty(name, newValue);
            }
        };
    };
    #getFieldGetter = <T extends Model>(name: string, fieldProperties: FieldProperties<any>) => {
        return () => this.getPropertyValue(name);
    };
    setUnsavedProperty = (propertyName: string, value: any, triggerChange = true) => {
        this.#setProperty(propertyName, value, triggerChange, this.#unsavedProperties);
    };

    setSavedProperty = (propertyName: string, value: any, triggerChange = true) => {
        this.#setProperty(propertyName, value, triggerChange, this.#savedProperties, this.#unsavedProperties);
    };

    #isModelList(fieldName: string) {
        return this.#fields[fieldName].modelList;
    }

    #setProperty = (propertyName: string, value: any, triggerChange = true, target: Record<string, any>, removal?: Record<string, any>) => {
        const oldValue = this.getPropertyValue(propertyName);
        if (this.#isModelList(propertyName)) {
            value = this.#getArrayProxy(propertyName, value);
        }
        if (!this.#fieldNames.includes(propertyName)) {
            console.warn(`Trying to set unknown field "${propertyName}" on model ${this.constructor.name}`);
        }
        target[propertyName] = value;
        if (removal) {
            delete removal[propertyName];
        }
        if (triggerChange && value !== oldValue) {
            this.trigger(new Change(propertyName, value, oldValue));
        }
    };

    #getArrayProxy(propertyName: string, value?: any[]) {
        const oldValue = this.getPropertyValue(propertyName);
        if (oldValue) {
            if (value) {
                if (oldValue === value) {
                    return value;
                }
                return oldValue.replaceAll(value);
            } else {
                return oldValue;
            }
        }
        return createEntityArrayProxy(({previous, current}) => {
            this.trigger(new Change(propertyName, current, previous));
        }, value);
    }

    getPropertyValue = (propertyName: string) => {
        if (Object.keys(this.#unsavedProperties).includes(propertyName)) {
            return this.#unsavedProperties[propertyName];
        }
        if (Object.keys(this.#savedProperties).includes(propertyName)) {
            return this.#savedProperties[propertyName];
        }
        return undefined;
    };
    getUnsavedProperties = () => {
        return this.#unsavedProperties;
    };

    toJSON() {
        const value: Record<string, any> = {};
        Object.entries(this.#fields).forEach(([name, props]) => {
            if (!props.cascading) {
                return;
            }
            // @ts-ignore
            value[name] = this[name];
        });
        return value;
    }
}

export default Model;
