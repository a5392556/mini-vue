import { extend } from "../shared";

let activeEffect: ReactiveEffect;
let shouldTrack: boolean;
const targetMap = new Map();
export class ReactiveEffect {
    protected _fn: any;
    public scheduler: Function | undefined;
    public deps: any[];
    public onStop: Function | undefined;
    protected active;
    constructor(fn, scheduler?: Function) {
        this._fn = fn;
        this.scheduler = scheduler;
        this.deps = [];
        this.onStop = undefined;
        this.active = true;
    }
    public run() {
        if(!this.active) return this._fn();
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn();
        shouldTrack = false;
        return res;
    }

    public stop() {
        if (this.active) {
            cleanupEffect(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}

function cleanupEffect(effect: ReactiveEffect) {
    effect.deps.forEach(dep => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}

export function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
// 收集依赖
export function track(target, key) {
    if(!isTracking()) return ;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}

export function trackEffect(dep) {
    if (dep.has(activeEffect)) return;
    dep.add(activeEffect);
    activeEffect?.deps.push(dep);
}
// 触发依赖
export function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap) return;
    let dep = depsMap.get(key);
    if (!dep) return;
    triggerEffect(dep);
}

export function triggerEffect(dep) {
    for (const effect of dep) {
        effect.scheduler ? effect.scheduler() : effect.run();
    }
}
export function effect(fn, options: any = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.run();
    extend(_effect, options);
    const runner: any = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

export function stop(runner) {
    runner.effect.stop();
}