import { extend } from "../shared";

let activeEffect: ReactiveEffect;
const targetMap = new Map();
class ReactiveEffect {
    protected _fn: any;
    public scheduler: Function | undefined;
    public deps: any[] = [];
    constructor(fn, scheduler?: Function) {
        this._fn = fn;
        this.scheduler = scheduler;
    }
    public run() {
        activeEffect = this;
        return this._fn();
    }

    public stop() {
        cleanupEffect(this);
    }
}

function cleanupEffect(effect: ReactiveEffect) {
    effect.deps.forEach(dep => {
        dep.delete(effect);
    });
    // effect.deps.length = 0;
}
// 收集依赖
export function track(target, key) {
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
    if (dep.has(activeEffect)) return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
// 触发依赖
export function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if(!depsMap) return;
    let dep = depsMap.get(key);
    if(!dep) return;
    for (const effect of dep) {
        effect.scheduler ? effect.scheduler() : effect.run();
    }
}
export function effect(fn, options: any = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.run();
    const runner: any = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

export function stop(runner) {
    runner.effect.stop();
}