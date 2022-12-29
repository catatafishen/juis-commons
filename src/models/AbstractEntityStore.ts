import RestResource from "./RestResource.js";
import {StoreOptions} from "./EntityStore.js";

export default abstract class AbstractEntityStore<T extends RestResource> {
    readonly #options: StoreOptions<any>;

    protected constructor(options: StoreOptions<any>) {
        this.#options = options;
    }

    getOptions = () => this.#options;

    abstract hit(entity: T): void;

    abstract addEntity(entity: T): void;

    abstract removeEntity(entity: T): void;

    abstract getById(id: string | number): T | undefined;

    abstract find(callback: (entity: T) => boolean): T | undefined;

    abstract findAll(callback: (entity: T) => boolean): T[];

    abstract getRecent(): T[];
}
