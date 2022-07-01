import { isProxy, isReactive, isReadonly, reactive, readonly } from "../reactive";

describe('reactive', () => {
    it('happy', () => {
        const original = {
            foo: 1, 
            car: {
                age: 2,
                name: 'audio'
            }
        };
        const observed = reactive(original);
        expect(original).not.toBe(observed);
        expect(observed.foo).toBe(1);
        expect(isReactive(observed.car)).toBe(true);
        expect(isReactive(observed)).toBe(true);
        expect(isReactive(original)).toBe(false);
        expect(isProxy(observed)).toBe(true);
    });
});

describe('readonly', () => {
    it('not set', () => {
        const original = { foo: 1 };
        const wrapped = readonly(original);
        expect(wrapped).not.toBe(original);
        expect(wrapped.foo).toBe(1);
        expect(isReadonly(wrapped)).toBe(true);
        expect(isProxy(wrapped)).toBe(true);

    });
    it('console error', () => {
        console.error = jest.fn();
        const original = { foo: 1 };
        const wrapped = readonly(original);
        wrapped.foo = 2;
        expect(console.error).toBeCalled();
    })
})