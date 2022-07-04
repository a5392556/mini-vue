import { publicInstanceProxyHanders } from "./componentPublicInstance";

export function createComponentInstance(vnode: any) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {}
    };
    return component;
}

export function setupComponent(instance: any) {
    // TODO
    // initProps();
    // initSlots();
    instance.proxy = new Proxy({_: instance}, publicInstanceProxyHanders);
    setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        const setupResult = setup();
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

