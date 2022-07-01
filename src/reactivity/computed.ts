import { ReactiveEffect } from "./effect";

export function computed(getter) {
    return new ComputedRefImpl(getter);
}

class ComputedRefImpl {
    protected _value;
    protected _effect;
    public dirty: boolean;
    constructor(getter) {
        this._value = undefined;
        this.dirty = true;
        this._effect = new ReactiveEffect(getter, () => {
            this.dirty = true;
        });
    }
    get value () {
        if(this.dirty) {
            this._value = this._effect.run();
            this.dirty = false;
        }
        return this._value;
    }
}