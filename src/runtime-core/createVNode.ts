import { ShapeFlags } from "../shared/ShapeFlags";

export function createVNode(type, props?, children?) {
    // 通过位运算符计算 node 的类型
    const vnode = {
        type, 
        props,
        children,
        el: undefined,
        shapeFlag: getShapeFlag(type)
    };

    if (typeof children === 'string') {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }

    return vnode;
}

function getShapeFlag(type: any) {
    return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATAFUL_COMPONENT;
}
