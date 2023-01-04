import RestResource from "./RestResource.js";
import {getConstructor, getRestResourcePropertiesForClass} from "./resourceDecorator.js";
import {AbstractFilter, Filter, FilterOperator, Predicate} from "./Filter.js";
import {FieldProperties, getFieldsForModel, ModelFieldProperties} from "./fieldDecorator.js";

type JunctionOperator = "or" | "and";

type StringKeysOf<T> = Extract<keyof T, string>

type Join<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;

type KeyValueType<T extends RestResource, Types = any, D extends number = 2, P extends string = ""> = KeyValueTypeInner<FieldsType<T>, Types, D, P>;
type KeyValueTypeInner<T extends Record<string, any>, Types = any, D extends number = 2, P extends string = ""> = [D] extends [never] ? never : {
    [K in keyof T]-?: K extends string ?
        (Required<T>[K] extends Types ? [Join<P, K>, Required<T>[K]] : never)
        | (T[K] extends RestResource | RestResource[] ? KeyValueType<Unpacked<T[K]>, Types, Prev[D], Join<P, K>> : never)
        : never
}[keyof T]

type FieldsType<T extends RestResource> = {
    [K in StringKeysOf<Omit<T, keyof RestResource>>]: Required<T>[K]
} & { id: number };
type Unpacked<T> = T extends (infer U)[] ? U : T;
type Prev = [never, 0, 1, 2, 3, 4, ...0[]];

class Query<Model extends typeof RestResource, Instance extends InstanceType<Model>> {

    readonly #model;
    readonly #props;
    readonly #fields;

    #filter?: AbstractFilter<Instance>;
    #junction: JunctionOperator = "and";

    constructor(model: Model) {
        this.#model = model;
        this.#props = getRestResourcePropertiesForClass(model);
        this.#fields = getFieldsForModel(model);
    }

    #addFilter = (filter: Filter<Instance>) => {
        if (!this.#filter) {
            this.#filter = filter;
        } else {
            if (this.#junction === "and") {
                this.#filter = Filter.and(this.#filter, filter);
            } else {
                this.#filter = Filter.or(this.#filter, filter);
            }
        }
        this.#junction = "and";
        return this;
    };

    or = () => {
        this.#junction = "or";
        return this;
    };

    #getFieldProps = (dotNotatedName: string): FieldProperties<any> & Partial<ModelFieldProperties<any>> => {
        let currentModel: any;
        let currentFieldProps;
        currentModel = this.#model;
        dotNotatedName.split(".").forEach(namePart => {
            if (currentModel === null) {
                throw new Error("Illegal state");
            }
            currentFieldProps = getFieldsForModel(currentModel)[namePart];
            if (!currentFieldProps) {
                throw new Error("Illegal state");
            }
            currentModel = currentFieldProps.modelType ? getConstructor(currentFieldProps.modelType) : null;
        });
        if (!currentFieldProps) {
            throw new Error("Illegal state");
        }
        return currentFieldProps;
    };
    #createKeyValueFilter = (operator: FilterOperator, test: Predicate<Instance>, key: string, value: any) => {
        const fieldProps = this.#getFieldProps(key);
        if (fieldProps.modelType) {
            if (Array.isArray(value)) {
                value = value.filter(resource => resource.id!!).map(resource => resource.id);

                console.log(key, fieldProps, value);
            } else {
                value = value.id;
            }
            key = key + ".id";
        } else if (fieldProps.jsonMapper) {
            value = fieldProps.jsonMapper.toJson(value, null);
        }
        this.#addFilter(new Filter(operator, test, key, value));
        return this;
    };

    eq = (...keyValue: KeyValueType<Instance>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) === value;
        return this.#createKeyValueFilter("=", predicate, key, value);
    };
    ne = (...keyValue: KeyValueType<Instance>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) !== value;
        return this.#createKeyValueFilter("!=", predicate, key, value);
    };
    gt = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) > value;
        return this.#createKeyValueFilter(">", predicate, key, value);
    };
    lt = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) < value;
        return this.#createKeyValueFilter("<", predicate, key, value);
    };
    ge = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) >= value;
        return this.#createKeyValueFilter(">=", predicate, key, value);
    };
    le = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) <= value;
        return this.#createKeyValueFilter("<=", predicate, key, value);
    };
    in = <U, T extends KeyValueType<Instance, U>>(key: T[0], value: U[]) => {
        const predicate = (entity: InstanceType<Model>) => value.includes(entity.getValue(key));
        return this.#createKeyValueFilter("in", predicate, key, value);
    };
    notIn = <U, T extends KeyValueType<Instance, U>>(key: T[0], value: U[]) => {
        const predicate = (entity: InstanceType<Model>) => !value.includes(entity.getValue(key));
        return this.#createKeyValueFilter("!in", predicate, key, value);
    };
    like = <T extends KeyValueType<Instance, string>>(key: T[0], value: string) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key)?.includes(value);
        return this.#createKeyValueFilter("~", predicate, key, value);
    };
    startsWith = <T extends KeyValueType<Instance, string>>(key: T[0], value: string) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key)?.startsWith(value);
        return this.#createKeyValueFilter("=~", predicate, key, value);
    };

    year = <T extends KeyValueType<Instance, Date>>(key: T[0], value: number) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key)?.getFullYear() === value;
        return this.#addFilter(new Filter("year", predicate, key, value));
    };
    month = <T extends KeyValueType<Instance, Date>>(key: T[0], value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key)?.getMonth() === value - 1;
        return this.#addFilter(new Filter("month", predicate, key, value));
    };
    toString = () => this.#filter?.toJSON() || "{}";
    test = (entity: Instance) => this.#filter?.test(entity) ?? true;
}

export {Query as default, KeyValueType};
