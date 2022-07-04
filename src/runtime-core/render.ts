import { isObject } from "../shared";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
    // TODO vnode.type is element?
    patch(vnode, container);
}

function patch(vnode, container) {
    // TODO 判断 vnode 是不是一个 element
    // yes processElement
    // no processComponent
    const {
        type
    } = vnode;
    if (typeof type === 'string') {
        processElement(vnode, container);
    } else if (isObject(type)) {
        processComponent(vnode, container);
    }
}

function processComponent(vnode: any, container: any) {
    mountComponent(vnode, container);
}

function processElement(vnode: any, container: any) {
    mountElement(vnode, container);
}
function mountComponent(initalVNode: any, container: any) {
    const instance = createComponentInstance(initalVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initalVNode, container);
}
function mountElement(initalVNode: any, container: any) {
    const {
        type,
        children,
        props
    } = initalVNode;
    const el = initalVNode.el = document.createElement(type);
    if (typeof children === 'string') {
        el.textContent = children;
    } else if (Array.isArray(children)) {
        mountChild(initalVNode, el)
    }
    for (const key in props) {
        el.setAttribute(key, props[key]);
    }
    container.append(el);
}
function mountChild(vnode: any, container: any) {
    vnode.children.forEach(child => {
        patch(child, container);
    });
}
function setupRenderEffect(instance: any, vnode: any, container: any) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    vnode.el = subTree.el;
}




