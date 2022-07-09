import { createVNode, Fragment } from "../vnode";

export function renderSlots(slots, slotName, props) {
    const slot = slots[slotName];
    if (typeof slot === 'function') return createVNode(Fragment, {}, slot(props));
    else console.error(`slot name '${slotName}' is undefined`);
}