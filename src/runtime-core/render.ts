import { ShapeFlags } from "../shared/ShapeFlags";
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
        type,
        shapeFlag
    } = vnode;
    if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
    } else if (shapeFlag & ShapeFlags.STATAFUL_COMPONENT) {
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
        props,
        shapeFlag
    } = initalVNode;
    const el = initalVNode.el = document.createElement(type);
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChild(initalVNode, el);
    }
    const isOn = name => /^on[A-Z]/.test(name);
    for (const key in props) {
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, props[key]);
        } else {
            el.setAttribute(key, props[key]);

        }
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




