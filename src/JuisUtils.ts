const arrayWrap = <T>(values?: T | T[]): T[] => {
    if (!Array.isArray(values)) {
        if (values === undefined) {
            values = [];
        } else {
            values = [values];
        }
    }
    return values;
}
const camelCaseToDash = (text: string) => text.replace(/([A-Z])/g, $1 => "-" + $1.toLowerCase())

function sortByMappedValue<InputType, OutputType>(mapper: (inputType: InputType) => OutputType) {
    return (a: InputType, b: InputType) => {
        const mappedA = mapper(a);
        const mappedB = mapper(b);
        if (mappedA < mappedB) {
            return -1;
        }
        if (mappedA > mappedB) {
            return 1;
        }
        return 0;
    }
}

function removeByValue<T>(array: T[], item: T) {
    let index = array.indexOf(item);
    if (index !== -1) array.splice(index, 1);
    return array;
}

export {camelCaseToDash}
export {arrayWrap}
export {removeByValue};
export {sortByMappedValue};
