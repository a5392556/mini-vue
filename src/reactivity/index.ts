export function add(a: number, b: number) {
    return a + b;
}

export function handleChange(oldValue, newValue) {
    return !Object.is(oldValue, newValue);
}
