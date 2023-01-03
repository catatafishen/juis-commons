const once = <T>(
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
) => {
    const method = descriptor.value;
    let isFirstTime = true;
    let value: T;

    descriptor.value = function (...args: any[]) {
        if (!isFirstTime) {
            return value;
        }
        value = method(...args);
        isFirstTime = false;
        return value;
    };
};

const onceCallback = <T, R>(fn: (arg: T) => R) => {
    let values: Map<any, R> = new Map();
    return function (arg: T) {
        if (!values.has(arg)) {
            values.set(arg, fn(arg));
        }
        return values.get(arg)!;
    };
};

export {once, onceCallback};
