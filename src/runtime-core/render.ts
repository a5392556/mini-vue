import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
    // TODO vnode.type is element?
    patch(vnode, container);
}

function patch(vnode, container) {
    // TODO 判断 vnode 是不是一个 element
    // yes processElement
    // no processComponent
    processComponent(vnode, container);
}

function processComponent(vnode: any, container: any) {
    mountComponent(vnode, container);
}
function mountComponent(vnode: any, container: any) {
    const instance = createComponentInstance(vnode);
    setupComponent(instance);

    setupRenderEffect(instance, container);
}

function setupRenderEffect(instance: any, container: any) {
    const subTree = instance.render();
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
}




