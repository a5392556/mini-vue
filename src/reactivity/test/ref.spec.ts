import { effect } from "../effect";
import { isRef, proxyRefs, ref, unRef } from "../ref";

describe('ref', () => {
    it('ref', () => {
        const a = ref(1);
        expect(a.value).toBe(1);
    });

    it('should be ref', () => {
        const a = ref<number>(1);
        let dumy, calls = 0;
        effect(() => {
            calls++;
            dumy = a.value;
        });
        expect(calls).toBe(1);
        expect(dumy).toBe(1);
        a.value = 2;
        expect(calls).toBe(2);
        expect(dumy).toBe(2);
        expect(calls).toBe(2);
        expect(dumy).toBe(2);
    });

    it('should be ref obj', () => {
        const a = ref({foo: 1});
        let dumy;
        effect(() => {
            dumy = a.value.foo;
        });
        expect(dumy).toBe(1);
        a.value.foo = 2;
        expect(dumy).toBe(2);
    });

    it('is ref', () => {
        const a = ref(1);
        expect(isRef(a)).toBe(true);
        expect(unRef(a)).toBe(1);
    });

    it('proxy ref', () => {
        const user = {
            age: ref(10),
            name: 'sss'
        };
        expect(user.age.value).toBe(10);
        const proxyUser = proxyRefs(user);
        expect(proxyUser.name).toBe('sss');
        expect(proxyUser.age).toBe(10);

        proxyUser.age = 20;
        expect(proxyUser.age).toBe(20);
        expect(user.age.value).toBe(20);
    });
}); 