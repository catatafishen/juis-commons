import Model from "./Model.js";
import RestServerInterface from "../restserver/RestServerInterface.js";
import {getConstructor, getRestResourcePropertiesForClass} from "./resourceDecorator.js";
import jsonMapper from "./json-mappers/jsonMapper.js";
import {getFields} from "./fieldDecorator.js";
import Optional from "../Optional.js";
import throttle from "../decorators/Throttle.js";
import {onceCallback} from "../decorators/Once.js";

const getModelMapper = onceCallback(<T extends RestResource>(modelName: string): jsonMapper<T> => {
    const model = getConstructor(modelName);
    return {
        fromJson: (rawValue: Record<string, any> | number | string, owner) => {
            if (typeof rawValue === "number" || typeof rawValue === "string") {
                let id = rawValue;
                // @ts-ignore
                return model.lazyGetById(id) as T;
            }
            // @ts-ignore
            let entity = model.lazyGetById(rawValue.id);
            entity.setSavedRawData(rawValue);
            return entity as T;
        },
        toJson(value: T, owner: Model) {
            return value.getUnsavedRawData();
        }
    };
});
const getModelListMapper = onceCallback(<T extends RestResource>(modelName: string): jsonMapper<T[]> => {
    const model = getConstructor(modelName);
    return {
        fromJson: (rawValues: (Record<string, any> | number | string)[], owner) => {
            return rawValues.map(rawValue => {
                if (typeof rawValue === "number" || typeof rawValue === "string") {
                    let id = rawValue;
                    // @ts-ignore
                    return model.lazyGetById(id) as T;
                }
                // @ts-ignore
                let entity = model.lazyGetById(rawValue.id);
                entity.setSavedRawData(rawValue);
                return entity as T;
            });
        },
        toJson(value: T[], owner: Model) {
            return value.map(entity => entity.getUnsavedRawData());
        }
    };
});

abstract class RestResource extends Model {
    abstract id?: number;
    readonly #endpoint;
    #store;
    #isPersisted = false;
    #initializedWithData = false;
    #jsonMappers: Record<string, jsonMapper<any>> = {};
    readonly #fieldNames: string[];

    constructor() {
        super();
        const modelProps = getRestResourcePropertiesForClass(this.constructor as new () => RestResource);
        this.#endpoint = modelProps.endpoint;
        this.#store = modelProps.entityStore;
        const fieldProps = getFields(this);
        this.#fieldNames = Object.keys(fieldProps);
        Object.entries(fieldProps).forEach(([name, prop]) => {
            if (prop.jsonMapper) {
                this.#jsonMappers[name] = prop.jsonMapper;
            }
            const modelType = prop.modelType;
            if (modelType) {
                this.#jsonMappers[name] = prop.modelList ? getModelListMapper(modelType) : getModelMapper(modelType);
            }
        });
    }

    setRawProperty(fieldName: string, value: any) {
        this.setSavedProperty(fieldName, value);
    }

    setSavedRawData = (data: Record<string, any>): Required<this> => {
        const unsetFields = new Set([...this.#fieldNames]);
        this.#isPersisted = true;
        if (!this.id && data.id) {
            this.setSavedProperty("id", data.id);
            this.#store!.addEntity(this);
        }
        Object.entries(data).forEach(([name, value]) => {
            unsetFields.delete(name);
            let mapper = this.#jsonMappers[name]?.fromJson;
            if (mapper) {
                value = mapper(value, this);
            }
            this.setSavedProperty(name, value);
        });
        unsetFields.forEach(fieldName => {
            console.warn(`Field ${fieldName} was not set`);
        });

        this.#initializedWithData = true;
        // @ts-ignore
        return this;
    };

    isInitializedWithData() {
        return this.#initializedWithData;
    }

    getUnsavedRawData() {
        const raw: Record<string, any> = {};
        Object.entries(this.getUnsavedProperties()).forEach(([name, value]) => {
            let mapper = this.#jsonMappers[name]?.toJson;
            if (this.#jsonMappers[name]) {
                raw[name] = mapper(value, this);
            } else {
                if (value instanceof RestResource) {
                    value = value.getUnsavedRawData();
                }
                raw[name] = value;
            }
        });
        return raw;
    };

    save() {
        if (this.#isPersisted) {
            return this.#patch();
        } else {
            return this.#post();
        }
    };

    #patch() {
        if (!this.#endpoint) {
            throw new Error("No endpoint defined");
        }
        return RestResource.#getServer()
            .patch(this.#endpoint, this.id!.toString(), this.getUnsavedRawData())
            .then(this.setSavedRawData);
    };

    #post() {
        if (!this.#endpoint) {
            throw new Error("No endpoint defined");
        }
        return RestResource.#getServer()
            .post(this.#endpoint, this.getUnsavedRawData())
            // .then((d) => this.setSavedRawData(d));
            .then(this.setSavedRawData);
    };

    delete = () => {
        // return RestResource.#getServer()
        //     .delete((this.id!).toString(), RestResource.getEndpoint())
        //     .then(this.#setPersistedData);
    };

    static lazyGetById = function <T extends RestResource>(this: Pick<typeof RestResource, keyof typeof RestResource> & (new() => T), id: number): T {
        const props = getRestResourcePropertiesForClass(this);
        return Optional.of(props.entityStore!.getById(id)).orElseGet(() => {
            const lazyEntity = new this();
            lazyEntity.id = id;
            props.entityStore!.addEntity(lazyEntity);
            return lazyEntity;
        });
    };
    static getById = function <T extends RestResource>(this: Pick<typeof RestResource, keyof typeof RestResource> & (new() => T), id: number): Promise<T> {
        const entity = this.lazyGetById(id);
        if (entity.isInitializedWithData()) {
            return Promise.resolve(entity);
        }
        return entity.refreshFromServer();
    };

    @throttle()
    refreshFromServer() {
        if (!this.#endpoint) {
            throw new Error("No endpoint defined");
        }
        if (!this.id) {
            throw Error("Cannot refresh entity without ID");
        }
        return RestResource.#getServer().getById(this.#endpoint, this.id.toString()).then(this.setSavedRawData);
    };

    static #getServer = function <T extends typeof RestResource>(this: T) {
        if (!RestResource.#staticServer) {
            throw new Error("No REST server is defined for " + this.constructor.name);
        }
        return RestResource.#staticServer;
    };

    static #staticServer: RestServerInterface;
    static setServer = (server: RestServerInterface) => RestResource.#staticServer = server;
}

export default RestResource;
