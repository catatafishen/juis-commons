import RestResource from "./RestResource.js";
import AbstractEntityStore from "./AbstractEntityStore.js";
import {removeByValue} from "../JuisUtils.js";

type StoreOptions<T> = {
    recentAmount?: number;
    indexes?: (keyof T)[];
}

class EntityStore<T extends RestResource> extends AbstractEntityStore<T> {
    #entitiesPerId: Record<string, T> = {};
    #recentHits: T[] = [];
    readonly #recentAmount;

    constructor(options: StoreOptions<T> = {}) {
        super(options);
        this.#recentAmount = this.getOptions().recentAmount || 100;
    }

    hit = (entity: T) => {
        removeByValue(this.#recentHits, entity);
        this.#recentHits.push(entity);
        this.#recentHits = this.#recentHits.slice(0, this.#recentAmount);
    };

    addEntity = (entity: T) => {
        if (!entity.id) {
            throw new Error("A cached instance must have an Id");
        }
        if (this.#entitiesPerId[entity.id] && this.#entitiesPerId[entity.id] !== entity) {
            throw new Error(`Another instance of ${entity} already exists in the cache`);
        }
        this.#entitiesPerId[entity.id] = entity;
        this.hit(entity);
    };

    removeEntity = (entity: T) => {
        if (!entity.id) {
            throw new Error("A cached instance must have an Id");
        }
        if (this.#entitiesPerId[entity.id] && this.#entitiesPerId[entity.id] !== entity) {
            throw new Error(`Another instance of #${entity} already exists in the cache`);
        }
        delete this.#entitiesPerId[entity.id];
        removeByValue(this.#recentHits, entity);
    };

    getById = (id: string | number) => {
        const entity = this.#entitiesPerId[id];
        if (entity) {
            this.hit(entity);
            return entity;
        }
    };

    find = (callback: (entity: T) => boolean) => Object.values(this.#entitiesPerId).find(callback);

    findAll = (callback: (entity: T) => boolean) => Object.values(this.#entitiesPerId).filter(callback);

    getRecent = () => [...this.#recentHits];
}

export {EntityStore as default, StoreOptions};
