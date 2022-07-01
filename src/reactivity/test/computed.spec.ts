import { computed } from "../computed";
import { reactive } from "../reactive";

describe('computed', () => {
    it('happy path', () => {
        const user = reactive({
            age: 1
        });
        const getter = jest.fn(() => {
            return user.age;   
        });
        const age = computed(getter);
        expect(getter).not.toHaveBeenCalled();
        expect(age.value).toBe(1);
        expect(getter).toHaveBeenCalledTimes(1);
        let k = age.value;
        expect(getter).toHaveBeenCalledTimes(1);
        user.age++;
        expect(getter).toHaveBeenCalledTimes(1);
        k = age.value;
        expect(getter).toHaveBeenCalledTimes(2);
        expect(age.value).toBe(2);
    });

});