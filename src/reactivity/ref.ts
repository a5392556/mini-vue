import { handleChange } from ".";
import { isObject } from "../shared";
import { isTracking, trackEffect, trigger, triggerEffect } from "./effect";
import { reactive } from "./reactive";
type RefType<T> = T extends infer O extends (number | string | boolean | symbol | undefined | null | bigint) ? O : T;

class Ref<T> {
    private _value: T;
    public dep: Set<any>;
    private _rawValue: T;
    public isRef: boolean;
    constructor(value: T) {
        this._rawValue = value;
        this.isRef = true;
        this._value = convert(value);
        this.dep = new Set();
    }

    get value() {
        trackRefValue(this);
        return this._value;    
    }

    set value(value) {
        if(!handleChange(this._rawValue, value)) return ;
        this._value = convert(value);
        triggerEffect(this.dep);
    }
}

export function ref<T>(value: T) {
    return new Ref<T>(value);
}

function trackRefValue(ref) {
    if(isTracking()) {
        trackEffect(ref.dep);
    }
}

function convert(value) {
    return isObject(value) ? reactive(value): value;
}

export function isRef(ref) {
    return !!ref.isRef;
}

export function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(object) {
    return new Proxy(object, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            return isRef(target[key]) && !isRef(value) ? (target[key].value = value): Reflect.set(target, key, value);
        }
    });
}
