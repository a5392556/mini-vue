import { mutableHandlers, readonlyHandlers, shallowReadOnlyHandlers } from "./baseHandlers";

export enum ReactiveFlags {
    IS_REACTIVE = '_v_is_reactive',
    IS_READONLY = '_v_is_readonly'
}

export function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}

export function shallowReadOnly(raw) {
    return createActiveObject(raw, shallowReadOnlyHandlers);
}

export function isReactive(raw) {
    return !!raw[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(raw) {
    return !!raw[ReactiveFlags.IS_READONLY];
}

export function isProxy(raw) {
    return isReactive(raw) || isReadonly(raw);
}

function createActiveObject(raw, baseHandlers) {
    return new Proxy(raw, baseHandlers);
}

