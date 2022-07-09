import { ShapeFlags } from "../shared/ShapeFlags";

export function initSlots(instance, children) {
    const {vnode} = instance;
    if(vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) normalizeObjectSlots(children, instance.slots);
}
function normalizeObjectSlots(children, slots) {
    for(const key in children) {
        const slot = children[key];
        slots[key] = props => normalizeSlotValue(slot(props));
    }
    slots = slots;
}
function normalizeSlotValue(slot) {
    return Array.isArray(slot) ? slot : [slot];
}