import Model from "../Model.js";

type jsonMapper<T> = {
    fromJson(value: string | number | boolean | undefined | Record<string, any>, entity: Model): T | undefined;
    toJson(value: T, entity: Model | null): string | number | boolean | undefined | Record<string, any>;
};

const isoStringToDate: jsonMapper<Date> = {
    fromJson(isoDate: string | undefined) {
        if (isoDate) {
            return new Date(Date.parse(isoDate));
        }
    },
    toJson(date: Date | undefined) {
        return date?.toISOString();
    }
};

const stringMapper: jsonMapper<string> = {
    fromJson(value: number | undefined) {
        return value?.toString();
    },
    toJson(value: string | undefined) {
        if (value) {
            return parseInt(value, 10);
        }
    }
};
export {jsonMapper as default, isoStringToDate, stringMapper};
