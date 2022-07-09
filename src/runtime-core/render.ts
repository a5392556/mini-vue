import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";
export function createRenderer(options) {
    const {
        createElement,
        patchProp,
        insert
    } = options;
    function render(vnode, container, parent) {
        // TODO vnode.type is element?
        patch(vnode, container, parent);
    }
    function patch(vnode, container, parent) {
        // TODO 判断 vnode 是不是一个 element
        // yes processElement
        // no processComponent
        if(!vnode) return ;
        const {
            shapeFlag,
            type
        } = vnode;
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parent);
                break;
            case Text:
                processText(vnode, container, parent);
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(vnode, container, parent);
                } else if (shapeFlag & ShapeFlags.STATAFUL_COMPONENT) {
                    processComponent(vnode, container, parent);
                }
                break;
        }
        
    }
    function processComponent(vnode: any, container: any, parent) {
        mountComponent(vnode, container, parent);
    }
    function processFragment(vnode: any, container: any, parent) {
        mountChild(vnode, container, parent);
    }
    function processElement(vnode: any, container: any, parent) {
        mountElement(vnode, container, parent);
    }
    function processText(vnode: any, container: any, parent) {
        const {children} = vnode;
        const textNode = vnode.el = document.createTextNode(children);
        container.append(textNode);
    }
    function mountComponent(initalVNode: any, container: any, parent) {
        const instance = createComponentInstance(initalVNode, parent);
        setupComponent(instance);
        setupRenderEffect(instance, initalVNode, container);
    }
    function mountElement(initalVNode: any, container: any, parent) {
        const {
            type,
            children,
            props,
            shapeFlag
        } = initalVNode;
        const el = initalVNode.el = createElement(type);
        // const el = initalVNode.el = document.createElement(type);
    
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChild(initalVNode, el, parent);
        }
        
        // const isOn = name => /^on[A-Z]/.test(name);
        for (const key in props) {
            const val = props[key];
            // if (isOn(key)) {
            //     const event = key.slice(2).toLowerCase();
            //     el.addEventListener(event, props[key]);
            // } else {
            //     el.setAttribute(key, props[key]);
            // }
            patchProp(el, key, val);
        }
        // container.append(el);
        insert(el, container);
    }
    function mountChild(vnode: any, container: any, parent) {
        vnode.children.forEach(child => {
            patch(child, container, parent);
        });
    }
    function setupRenderEffect(instance: any, vnode: any, container: any) {
        if(!instance.render) return ;
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // vnode -> patch
        // vnode -> element -> mountElement
        patch(subTree, container, instance);
        vnode.el = subTree.el;
    }

    return {
        createApp: createAppAPI(render)
    }
}









