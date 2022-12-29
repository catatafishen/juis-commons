const modifyMethods: (keyof Array<any>)[] = ["pop", "push", "reverse", "shift", "unshift", "splice", "sort"];

type EntityArray = any[] & { replaceAll: (replacement: any[]) => any };

const makeDistinct = (array: any[]) =>
    array.filter((type, index, self) => self.findIndex(otherType => otherType === type) === index);

const createEntityArrayProxy = (changeCallback: (change: { previous: any[], current: any[] }) => any, array: any[] = []) => {
    const set = function (target: any[], property: string | symbol, newValue: any, receiver: any) {
        const previous = [...array];
        let result = Reflect.set(array, property, newValue, receiver);
        array = makeDistinct(array);
        if (array.indexOf(newValue) !== -1) {
            changeCallback({previous, current: proxy});
        }
        return result;
    };

    const get = function (target: any[], propertyKey: string | symbol, receiver: any) {
        // @ts-ignore
        if (modifyMethods.includes(propertyKey)) {
            return function (...args: any) {
                // @ts-ignore
                let modifyMethod = array[propertyKey];
                const previous = [...array];
                let result: any = modifyMethod.apply(array, args);
                array = makeDistinct(array);
                changeCallback({previous, current: proxy});
                return result;
            };
        }
        if (propertyKey === "replaceAll") {
            return (replacement: any[]) => {
                let previous = array;
                array = makeDistinct(replacement);
                changeCallback({previous, current: proxy});
                return proxy;
            };
        }
        // console.log(propertyKey);
        let value = Reflect.get(array, propertyKey, receiver);
        if (typeof value === "function") {
            return function (...args: any) {
                return value.call(array, ...args);
            };
        }
        return value;
    };
    const handler = {set, get};
    let proxy = new Proxy(array, handler);
    return proxy as EntityArray;
};
export {createEntityArrayProxy as default, EntityArray};
