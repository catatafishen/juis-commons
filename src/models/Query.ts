import RestResource from "./RestResource.js";
import {getRestResourcePropertiesForClass} from "./resourceDecorator.js";
import {AbstractFilter, Filter} from "./Filter.js";

type JunctionOperator = "or" | "and";

type StringKeysOf<T> = Extract<keyof T, string>

type Join<P extends string, K extends string> = P extends "" ? K : `${P}.${K}`;

type KeyValueTypeOld<T, D extends number = 2, P extends string = ""> = [D] extends [never] ? never : {
    [K in keyof Omit<T, keyof RestResource>]-?: K extends keyof pickResourceFields<T> ?
        K extends string ? [K, Required<T>[K]] | KeyValueTypeOld<T[K], Prev[D], K> : never
        : K extends string ? [Join<P, K>, Required<T>[K]] : never
}[keyof Omit<T, keyof RestResource>]

type KeyValueType2<T, Types = any, D extends number = 2, P extends string = ""> = [D] extends [never] ? never : T extends Object ? {
    [K in StringKeysOf<Omit<T, keyof RestResource>>]-?: K extends keyof pickResourceFields<T> ?
        [Required<T>[K] extends Types ? K : never, Required<T>[K]] | KeyValueType2<T[K], Types, Prev[D], K> : Required<T>[K] extends Types ? [Join<P, K>, Required<T>[K]] : never
}[StringKeysOf<Omit<T, keyof RestResource>>] : never


type KeyValueType<T, Types = any, D extends number = 2, P extends string = ""> = [D] extends [never] ? never : T extends Object ? {
    [K in StringKeysOf<Omit<T, keyof RestResource>>]-?: K extends keyof pickResourceFields<T> ?
        (Required<T>[K] extends Types ? [Join<P, K>, Required<T>[K]] : never) | KeyValueType<T[K], Types, Prev[D], K> :
        Required<T>[K] extends Types ? [Join<P, K>, Required<T>[K]] : never
}[StringKeysOf<Omit<T, keyof RestResource>>] : never

type Prev = [never, 0, 1, 2, 3, 4, ...0[]];

type PickByType<T, Value> = {
    [P in keyof T as T[P] extends Value | undefined ? P : never]: T[P]
}
type pickResourceFields<T> = PickByType<Omit<T, StringKeysOf<RestResource>>, RestResource>

class Query<Model extends typeof RestResource, Instance extends Omit<InstanceType<Model>, keyof RestResource>> {
    #model;
    #props;

    #filter?: AbstractFilter<InstanceType<Model>>;
    #junction: JunctionOperator = "and";

    constructor(model: Model) {
        this.#model = model;
        this.#props = getRestResourcePropertiesForClass(model);
    }

    #addFilter = (filter: Filter<InstanceType<Model>>) => {
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


    eq = (...keyValue: KeyValueType<Instance>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) === value;
        return this.#addFilter(new Filter("=", predicate, key, value));
    };
    ne = (...keyValue: KeyValueType<Instance>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) !== value;
        return this.#addFilter(new Filter("!=", predicate, key, value));
    };
    gt = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) > value;
        return this.#addFilter(new Filter(">", predicate, key, value));
    };
    lt = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) < value;
        return this.#addFilter(new Filter("<", predicate, key, value));
    };
    ge = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) >= value;
        return this.#addFilter(new Filter(">=", predicate, key, value));
    };
    le = (...keyValue: KeyValueType<Instance, number | Date>) => {
        const [key, value] = [...keyValue] as [string, any];
        const predicate = (entity: InstanceType<Model>) => entity.getValue(key) <= value;
        return this.#addFilter(new Filter("<=", predicate, key, value));
    };
    in = <U, T extends KeyValueType<Instance, U[]>>(field: T[0], value: U) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.includes(value);
        return this.#addFilter(new Filter("in", predicate, field, value));
    };
    notIn = <U, T extends KeyValueType<Instance, U[]>>(field: T[0], value: U) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.includes(value);
        return this.#addFilter(new Filter("!in", predicate, field, value));
    };
    like = <T extends KeyValueType<Instance, string>>(field: T[0], value: string) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.includes(value);
        return this.#addFilter(new Filter("~", predicate, field, value));
    };
    startsWith = <T extends KeyValueType<Instance, string>>(field: T[0], value: string) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.startsWith(value);
        return this.#addFilter(new Filter("=~", predicate, field, value));
    };

    year = <T extends KeyValueType<Instance, Date>>(field: T[0], value: number) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.getFullYear() === value;
        return this.#addFilter(new Filter("year", predicate, field, value));
    };
    month = <T extends KeyValueType<Instance, Date>>(field: T[0], value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => {
        const predicate = (entity: InstanceType<Model>) => entity.getValue(field)?.getMonth() === value - 1;
        return this.#addFilter(new Filter("month", predicate, field, value));
    };
    toString = () => this.#filter?.toJSON() || "{}";
    test = (entity: InstanceType<Model>) => this.#filter?.test(entity) ?? true;
}

export {Query as default, KeyValueType};
