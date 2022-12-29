import RestResource from "./RestResource.js";
import EntityStore, {StoreOptions} from "./EntityStore.js";
import AbstractEntityStore from "./AbstractEntityStore.js";
import Optional from "../Optional.js";

interface ModelPropertiesMap<T extends typeof RestResource> extends Map<T, RestResourceProperties<InstanceType<T>>> {
}

const models: ModelPropertiesMap<any> = new Map();
const modelsPerName: Record<string, typeof RestResource> = {};

const getRestResourcePropertiesForClass = <T extends typeof RestResource>
(resourceClass: (T) | (new () => InstanceType<T>)): RestResourceProperties<InstanceType<T>> => {
    const props = models.get(resourceClass);
    if (!props) {
        throw new Error("No resource properties found for class " + resourceClass);
    }
    return props;
};

let defaultCacheOptions: StoreOptions<any> = {};

const setDefaultCacheOptions = (options: StoreOptions<any>) => {
    defaultCacheOptions = options;
};

type RestResourceProperties<T extends RestResource> = {
    name: string
    endpoint?: string
    idField?: string
    storeOptions?: StoreOptions<T>
    entityStore?: AbstractEntityStore<T>
}

const createStore = (cacheOptions: StoreOptions<any> = defaultCacheOptions) => {
    return new EntityStore(cacheOptions);
};

function restResource(properties: RestResourceProperties<any>) {
    return function <T extends { new(...args: any[]): RestResource }>(wrapped: T) {
        models.set(wrapped, properties);
        if (!properties.entityStore) {
            properties.entityStore = createStore(properties.storeOptions);
        }
        // @ts-ignore
        modelsPerName[properties.name] = wrapped;
        return wrapped;
    };
}

const getConstructor = (name: string): typeof RestResource => {
    return Optional.of(modelsPerName[name]).orElseThrow(() => new Error(`No such model: ${name}`));
};

export {restResource as default, getRestResourcePropertiesForClass, setDefaultCacheOptions, getConstructor};
