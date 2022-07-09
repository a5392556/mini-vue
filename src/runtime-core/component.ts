import { shallowReadOnly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { publicInstanceProxyHanders } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
let currentInstance = null;
export function createComponentInstance(vnode: any, parentInstace) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        parent: parentInstace,
        provides: parentInstace ? parentInstace.provides : {},
        emit: () => {}
    };
    component.emit = emit.bind(null, component) as any;
    return component;
}

export function setupComponent(instance: any) {
    // TODO
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    instance.proxy = new Proxy({_: instance}, publicInstanceProxyHanders);
    setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
    const component = instance.type;
    const { setup } = component;
    
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadOnly(instance.props), {emit: instance.emit});
        setCurrentInstance(null);
        handelSetupResult(instance, setupResult);
    }
}
function handelSetupResult(instance: any, setupResult: any) {
    // function object
    // TODO function
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}

function finishComponentSetup(instance: any) {
    const component = instance.type;
    if (component.render) instance.render = component.render;
}

export function getCurrentInstance() {
    return currentInstance;
}

export function setCurrentInstance(instance) {
    currentInstance = instance;
}



