const arrayWrap = (values) => {
    if (!Array.isArray(values)) {
        if (values === undefined) {
            values = [];
        } else {
            values = [values];
        }
    }
    return values;
}
const camelCaseToDash = text => text.replace(/([A-Z])/g, $1 => "-" + $1.toLowerCase())

function sortByMappedValue(mapper) {
    return (a, b) => {
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

function removeByValue(array, item) {
    let index = array.indexOf(item);
    if (index !== -1) array.splice(index, 1);
    return array;
}

export {camelCaseToDash}
export {arrayWrap}
export {removeByValue};
export {sortByMappedValue};
