export const extend = Object.assign;

export const isObject = val => {
    return val !== null && typeof val === 'object';
}

export const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);