import { ShapeFlags } from "../shared/ShapeFlags";
export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');
export function createVNode(type, props?, children?) {
    // 通过位运算符计算 node 的类型
    const vnode = {
        type, 
        props,
        children,
        el: undefined,
        shapeFlag: getShapeFlag(type),
        key: props && props.key,
        component: null
    };

    if (typeof children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }
    // 如果当前虚拟节点是个组件且 children 是 object 表示是个 slot 类型，需要标记为 slot
    if(vnode.shapeFlag & ShapeFlags.STATAFUL_COMPONENT && typeof vnode.children === 'object') vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN;

    return vnode;
}
export function createTextNode(text: string) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type: any) {
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATAFUL_COMPONENT;
}
