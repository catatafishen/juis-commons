const promiseMap: WeakMap<any, Promise<any>> = new WeakMap();
/**
 * Annotate a method that returns a promise.
 * While the returned promise is unresolved subsequent calls to this method will immediately return the same promise instead of running the method.
 *
 */
export default function throttle() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;
        descriptor.value = function () {
            if (promiseMap.has(this)) {
                return promiseMap.get(this);
            }
            const promise = method.apply(this);
            promiseMap.set(this, promise);
            promise!.finally(() => promiseMap.delete(this));
            return promise;
        };
    };
}
