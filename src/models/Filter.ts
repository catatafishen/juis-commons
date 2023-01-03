import RestResource from "./RestResource.js";

type FilterOperator = "=" | "!=" | "<" | "<=" | ">" | ">=" | "⊂" | "in" | "!in" | "~" | "=~" | "year" | "month";
type JunctionOperator = "or" | "and";
type RawFilter =
    { f1: string, f2?: string, o: FilterOperator, v?: any }
    & { f1: RawFilter, o: JunctionOperator, v: RawFilter };

abstract class AbstractFilter<T extends RestResource> {
    abstract getSimpleObj: () => Record<string, any> | boolean;
    abstract test: Predicate<T>;

    toJSON = () => {
        return JSON.stringify(this.getSimpleObj());
    };

    static and = <T extends RestResource>(filter1: AbstractFilter<T>, filter2: AbstractFilter<T>) => {
        if (filter1 === Filter.false || filter2 === Filter.false) {
            return Filter.false;
        }
        if (filter1 === Filter.true) {
            return filter2;
        }
        if (filter2 === Filter.true) {
            return filter1;
        }
        return new FilterJunction(filter1, filter2, "and");
    };

    static or<T extends RestResource>(filter1: AbstractFilter<T>, filter2: AbstractFilter<T>) {
        if (filter1 === Filter.true || filter2 === Filter.true) {
            return Filter.true;
        }
        if (filter1 === Filter.false) {
            return filter2;
        }
        if (filter2 === Filter.false) {
            return filter1;
        }
        return new FilterJunction(filter1, filter2, "or");
    };
}

class NoopFilter extends AbstractFilter<any> {
    readonly #value;

    constructor(value: boolean) {
        super();
        this.#value = value;
    }

    getSimpleObj = () => {
        return this.#value;
    };
    toString = () => JSON.stringify(this.#value);

    test = (arg: any) => {
        return this.#value;
    };
}


class FilterJunction<T extends RestResource> extends AbstractFilter<T> {
    readonly #operand1;
    readonly #operand2;
    readonly #operator;

    constructor(operand1: AbstractFilter<any>, operand2: AbstractFilter<any>, operator: JunctionOperator) {
        super();
        this.#operand1 = operand1;
        this.#operand2 = operand2;
        this.#operator = operator;
    }

    test = (entity: RestResource) => {
        if (this.#operator === "and") {
            return this.#operand1.test(entity) && this.#operand2.test(entity);
        }
        if (this.#operator === "or") {
            return this.#operand1.test(entity) || this.#operand2.test(entity);
        }
        throw new Error("Illegal state");
    };
    getSimpleObj = () => {
        return {l: this.#operand1.getSimpleObj(), o: this.#operator, r: this.#operand2.getSimpleObj()};
    };
}

type Predicate<T> = (arg: T) => boolean;
const MAX_DEPTH = 10;

class Filter<T extends RestResource> extends AbstractFilter<T> {
    readonly #field;
    readonly #operator;
    readonly #value;
    readonly #test: Predicate<T>;

    static true = new NoopFilter(true);
    static false = new NoopFilter(false);

    static every = <T extends RestResource>(filterList: AbstractFilter<T>[]) => {
        return filterList.flat(MAX_DEPTH).reduce(Filter.and, Filter.true);
    };
    static someOrTrue = <T extends RestResource>(filterList: AbstractFilter<T>[]) => {
        if (!filterList || filterList.length === 0 || (Array.isArray(filterList[0]) && filterList[0].length === 0)) {
            return Filter.true;
        }
        return Filter.some(filterList);
    };
    static some = <T extends RestResource>(filterList: AbstractFilter<T>[]) => {
        return filterList.reduce(Filter.or, Filter.false);
    };

    constructor(operator: FilterOperator, test: Predicate<T>, field: string, value: any) {
        super();
        this.#field = field;
        this.#operator = operator;
        this.#value = value;
        this.#test = test;
    }


    getSimpleObj = () => {
        return {f1: this.#field, o: this.#operator, v: this.#value};
    };

    toString = () => {
        return JSON.stringify(this.getSimpleObj());
    };
    test = (entity: T) => {
        return this.#test(entity as T);
    };
}

export {Filter, FilterJunction, AbstractFilter};
