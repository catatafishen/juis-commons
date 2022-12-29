export default class Optional<T> {
    readonly #value?: T;

    constructor(value?: T) {
        this.#value = value;
    }

    static of<T>(value?: T) {
        return new Optional(value);
    }

    orElseGet = (getter: () => T) => {
        if (this.#value !== undefined && this.#value !== null) {
            return this.#value;
        } else {
            return getter();
        }
    };
    orElse = (other: T) => {
        if (this.#value !== undefined && this.#value !== null) {
            return this.#value;
        } else {
            return other;
        }
    };
    orElseGetPromise = (promiseGetter: () => Promise<T>) => {
        if (this.#value !== undefined && this.#value !== null) {
            return Promise.resolve(this.#value);
        } else {
            return promiseGetter();
        }
    };
    orElsePromise = (promise: Promise<T>): Promise<T> => {
        if (this.#value !== undefined && this.#value !== null) {
            return Promise.resolve(this.#value);
        } else {
            return promise;
        }
    };
    orElseThrow = (error: () => Error): T => {
        if (this.#value !== undefined && this.#value !== null) {
            return this.#value!;
        } else {
            throw error;
        }
    };
    map = <U>(callback: (value: T) => U): Optional<U> => {
        if (this.#value !== undefined && this.#value !== null) {
            return new Optional(callback(this.#value));
        }
        return new Optional();
    };
    peek = (callback: (value: T) => void) => {
        if (this.#value !== undefined && this.#value !== null) {
            callback(this.#value);
        }
        return this;
    };
    asPromise = () => {
        if (this.#value !== undefined && this.#value !== null) {
            return Promise.resolve(this.#value);
        }
        return Promise.reject();
    };
}
