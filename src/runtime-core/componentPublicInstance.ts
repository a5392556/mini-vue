import { hasOwn } from "../shared";

const publicPropertiesMap = {
    $el: i => i.vnode.el
};

export const publicInstanceProxyHanders = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if(hasOwn(setupState, key)) return setupState[key];
        if(hasOwn(props, key)) return props[key];
        if (key === '$el') {
            return instance.vnode.el;
        }
        const publicGetter = publicPropertiesMap[key];
        if(publicGetter) return publicGetter(instance);
    }
}