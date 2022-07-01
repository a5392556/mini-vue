import {isReadonly, shallowReadOnly } from "../reactive";

describe('reactive', () => {
    it('happy', () => {
        const original = {
            foo: 1, 
            car: {
                age: 2,
                name: 'audio'
            }
        };
        const observed = shallowReadOnly(original);
        expect(original).not.toBe(observed);
        expect(isReadonly(observed.car)).toBe(false);
    });
});