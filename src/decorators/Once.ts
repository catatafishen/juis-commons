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

const onceCallback = <T>(fn: (arg: any) => T) => {
    let values: Map<any, T> = new Map();
    return function (arg: any) {
        if (!values.has(arg)) {
            values.set(arg, fn(arg));
        }
        return values.get(arg)!;
    };
};

export {once, onceCallback};
