import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        setElementText: hostSetElementText,
        remove: hostRemove
    } = options;
    function render(vnode, container, parent) {
        // TODO vnode.type is element?
        patch(null, vnode, container, parent);
    }
    function patch(oldVNode, newVNode, container, parent) {
        // TODO 判断 newVNode 是不是一个 element
        // yes processElement
        // no processComponent
        if (!newVNode) return;
        const {
            shapeFlag,
            type
        } = newVNode;
        switch (type) {
            case Fragment:
                processFragment( oldVNode, newVNode, container, parent);
                break;
            case Text:
                processText(oldVNode, newVNode, container, parent);
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, parent);
                } else if (shapeFlag & ShapeFlags.STATAFUL_COMPONENT) {
                    processComponent(oldVNode, newVNode, container, parent);
                }
                break;
        }

    }
    function processComponent(oldVNode, newVNode: any, container: any, parent) {
        mountComponent(newVNode, container, parent);
    }
    function processFragment(oldVNode, newVNode: any, container: any, parent) {
        mountChild(newVNode.children, container, parent);
    }
    function processElement(oldVNode, newVNode: any, container: any, parent) {
        // TODO oldVNode 存在则更新节点，否则就是初始化
        oldVNode ? patchElement(oldVNode, newVNode, container, parent) : mountElement(newVNode, container, parent);
    }
    function patchElement(oldVNode, newVNode: any, container: any, parent) {
        const prevProps = oldVNode.props;
        const newProps = newVNode.props;
        const el = newVNode.el = oldVNode.el;
        patchProps(el, prevProps, newProps);
        patchChild(oldVNode, newVNode, el, parent);
    }

    function patchProps(el, prevProps, newProps) {   
        if(prevProps !== newProps) {
            for(const key in newProps) {
                if(prevProps[key] !== newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], newProps[key]);
                }
            }
            for(const key in prevProps) {
                if(!newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], null);
                }
            }
        }

    }

    function patchChild(oldVNode, newVNode, el, parent) {
        const c1 = oldVNode.children, c2 = newVNode.children;
        const newNodeFlag = newVNode.shapeFlag, oldNodeFlag = oldVNode.shapeFlag;
        if(newNodeFlag & ShapeFlags.TEXT_CHILDREN) {
            if(oldNodeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unMoutedChild(c1);
            }
            c1 !== c2 && (hostSetElementText(el, c2));
        }else {
            if(oldNodeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(el, '');
                mountChild(c2, el, parent);
            }
        }
    }
    function unMoutedChild(children) {
        children.forEach(child => {
            hostRemove(child.el);
        });
    }
    function processText(oldVNode, newVNode: any, container: any, parent) {
        const { children } = newVNode;
        const textNode = newVNode.el = document.createTextNode(children);
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
        const el = initalVNode.el = hostCreateElement(type);
        // const el = initalVNode.el = document.createElement(type);

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChild(initalVNode.children, el, parent);
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
            hostPatchProp(el, key, null, val);
        }
        // container.append(el);
        hostInsert(el, container);
    }
    function mountChild(children: any, container: any, parent) {
        children.forEach(child => {
            patch(null, child, container, parent);
        });
    }
    function setupRenderEffect(instance: any, vnode: any, container: any) {
        // vnode -> patch
        // vnode -> element -> mountElement
        effect(() => {
            if (!instance.render) return;
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(null, subTree, container, instance);
                vnode.el = subTree.el;
                instance.isMounted = true;
            }else {
                const prevSubTree = instance.subTree;
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(prevSubTree, subTree, container, instance);
                vnode.el = subTree.el;
            }
        });
    }

    return {
        createApp: createAppAPI(render)
    }
}









