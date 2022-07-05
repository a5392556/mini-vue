function createVNode(type, props, children) {
    // 通过位运算符计算 node 的类型
    const vnode = {
        type,
        props,
        children,
        el: undefined,
        shapeFlag: getShapeFlag(type)
    };
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATAFUL_COMPONENT */;
}

const extend = Object.assign;
const isObject = val => {
    return val !== null && typeof val === 'object';
};
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

const targetMap = new Map();
// 触发依赖
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    let dep = depsMap.get(key);
    if (!dep)
        return;
    triggerEffect(dep);
}
function triggerEffect(dep) {
    for (const effect of dep) {
        effect.scheduler ? effect.scheduler() : effect.run();
    }
}

function createGetter(isReadonly = false, shallow = false) {
    return function (target, key) {
        const res = Reflect.get(target, key);
        // TODO 收集依赖
        if (key === ReactiveFlags.IS_REACTIVE)
            return !isReadonly;
        else if (key === ReactiveFlags.IS_READONLY)
            return isReadonly;
        if (shallow)
            return res;
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function (target, key, value, receiver) {
        const res = Reflect.set(target, key, value, receiver);
        // TODO 触发依赖
        trigger(target, key);
        return res;
    };
}
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value, receiver) {
        console.error(`${target[key]} is readonly!`);
        return true;
    }
};
const shallowReadOnlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["IS_REACTIVE"] = "_v_is_reactive";
    ReactiveFlags["IS_READONLY"] = "_v_is_readonly";
})(ReactiveFlags || (ReactiveFlags = {}));
function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadOnly(raw) {
    return createActiveObject(raw, shallowReadOnlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`${raw} is not object!`);
        return raw;
    }
    return new Proxy(raw, baseHandlers);
}

const publicPropertiesMap = {
    $el: i => i.vnode.el
};
const publicInstanceProxyHanders = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key))
            return setupState[key];
        if (hasOwn(props, key))
            return props[key];
        if (key === '$el') {
            return instance.vnode.el;
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter)
            return publicGetter(instance);
    }
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {}
    };
    return component;
}
function setupComponent(instance) {
    // TODO
    initProps(instance);
    // initSlots();
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHanders);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        const setupResult = setup(shallowReadOnly(instance.props));
        handelSetupResult(instance, setupResult);
    }
}
function handelSetupResult(instance, setupResult) {
    // function object
    // TODO function
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    if (component.render)
        instance.render = component.render;
}
function initProps(instance) {
    instance.props = instance.vnode.props || {};
}

function render(vnode, container) {
    // TODO vnode.type is element?
    patch(vnode, container);
}
function patch(vnode, container) {
    // TODO 判断 vnode 是不是一个 element
    // yes processElement
    // no processComponent
    const { type, shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* ShapeFlags.STATAFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountComponent(initalVNode, container) {
    const instance = createComponentInstance(initalVNode);
    setupComponent(instance);
    setupRenderEffect(instance, initalVNode, container);
}
function mountElement(initalVNode, container) {
    const { type, children, props, shapeFlag } = initalVNode;
    const el = initalVNode.el = document.createElement(type);
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChild(initalVNode, el);
    }
    const isOn = name => /^on[A-Z]/.test(name);
    for (const key in props) {
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, props[key]);
        }
        else {
            el.setAttribute(key, props[key]);
        }
    }
    container.append(el);
}
function mountChild(vnode, container) {
    vnode.children.forEach(child => {
        patch(child, container);
    });
}
function setupRenderEffect(instance, vnode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    vnode.el = subTree.el;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先将 component -> vnode
            // 所有的逻辑基于 vnode 处理
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
