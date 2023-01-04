import Model from "./Model.js";
import jsonMapper from "./json-mappers/jsonMapper.js";
import Component from "../components/Component.js";
import RestResource from "./RestResource.js";

interface fieldsMap<T extends typeof Model> extends Map<T, Record<string, FieldProperties<any> & Partial<ModelFieldProperties<any>>>> {
}

const fields: fieldsMap<any> = new Map();

const getFields = <T extends Model>(instance: T) => {
    let foundFields: Record<string, FieldProperties<any> & Partial<ModelFieldProperties<any>>> = {};
    fields.forEach((value, key) => {
        if (instance instanceof key) {
            foundFields = {...foundFields, ...value};
        }
    });
    return foundFields;
};
const getFieldsForModel = <T extends typeof RestResource>(model: (T) | (new () => InstanceType<T>)) => {
    let foundFields: Record<string, FieldProperties<any> & Partial<ModelFieldProperties<any>>> = {};
    fields.forEach((value, key) => {
        if (model === key || model.prototype instanceof key) {
            foundFields = {...foundFields, ...value};
        }
    });
    return foundFields;
};


type ModelFieldProperties<T extends RestResource> = FieldProperties<T> & {
    modelType: string, cascading?: boolean, lazy?: boolean, nameField?: keyof T, backReference?: keyof T, modelList?: boolean
}

type FieldProperties<T> = {
    transient?: boolean
    readonly?: boolean
    nonZero?: boolean
    required?: boolean
    label?: string
    jsonMapper?: jsonMapper<T>
    tableCellFactory?: <M extends RestResource>(value: T, entity: M, fieldProperties: FieldProperties<T>) => Component,
    name: string
    // modelList: never,
    // modelType: never,
    // cascading: never,
    // lazy: never,
    // nameField: never,
    // backReference: never,
}

const fieldCallback = <TValue, TProps>(fieldProperties: Omit<FieldProperties<TProps>, "name"> = {}) => {
    return <T extends Model & { [KA in TKey]?: TValue }, TKey extends keyof T>(
        target: Pick<T, TKey>,
        name: TKey & string
    ) => {
        const model = target.constructor as { new(): T };
        if (!fields.has(model)) {
            fields.set(model, {});
        }
        fields.get(model)![name] = {name, ...fieldProperties};
    };
};

function field<TValue>(fieldProperties?: Omit<FieldProperties<TValue>, "name">) {
    return fieldCallback<TValue, TValue>(fieldProperties);
}

function modelField<TValue extends RestResource>(fieldProperties: Omit<ModelFieldProperties<TValue>, "name">) {
    return fieldCallback<TValue, TValue>(fieldProperties);
}

function modelListField<TValue extends RestResource>(fieldProperties: Omit<ModelFieldProperties<TValue>, "name">) {
    fieldProperties.modelList = true;
    return fieldCallback<TValue[], TValue>(fieldProperties);
}

class ChangeEvent {
    changes: Record<string, [any, any]>;

    constructor(changes: Record<string, [any, any]>) {
        this.changes = changes;
    }
}


export {
    field as default,
    modelField,
    modelListField,
    FieldProperties,
    ModelFieldProperties,
    getFields,
    getFieldsForModel
};
