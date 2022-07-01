import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

function createGetter(isReadonly: boolean = false, shallow = false) {
    return function (target, key) {
        const res = Reflect.get(target, key);
        // TODO 收集依赖
        if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly;
        else if (key === ReactiveFlags.IS_READONLY) return isReadonly;

        if (shallow) return res;

        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }

        !isReadonly && track(target, key);
        return res;
    }
}

function createSetter() {
    return function (target, key, value, receiver) {
        const res = Reflect.set(target, key, value, receiver);
        // TODO 触发依赖
        trigger(target, key);
        return res;
    }
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
export const mutableHandlers = {
    get,
    set
}

export const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value, receiver) {
        console.error(`${target[key]}} is readonly!`);
        return true;
    }
}

export const shallowReadOnlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

