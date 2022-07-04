import { createVNode } from "./createVNode";
import { render } from "./render";

export function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先将 component -> vnode
            // 所有的逻辑基于 vnode 处理
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    }
}

