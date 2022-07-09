const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
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
    // 如果当前虚拟节点是个组件且 children 是 object 表示是个 slot 类型，需要标记为 slot
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATAFUL_COMPONENT */ && typeof vnode.children === 'object')
        vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
    return vnode;
}
function createTextNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATAFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, slotName, props) {
    const slot = slots[slotName];
    if (typeof slot === 'function')
        return createVNode(Fragment, {}, slot(props));
    else
        console.error(`slot name '${slotName}' is undefined`);
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

function emit(instance, event, ...args) {
    const { props } = instance;
    const camelize = (str) => {
        return str.replace(/-(\w)/g, (_, c) => {
            return c ? c.toUpperCase() : '';
        });
    };
    const capitalize = (str) => {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    };
    const toHandlerKey = (str) => {
        return str ? 'on' + capitalize(str) : '';
    };
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: i => i.vnode.el,
    $slots: i => i.slots
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

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */)
        normalizeObjectSlots(children, instance.slots);
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const slot = children[key];
        slots[key] = props => normalizeSlotValue(slot(props));
    }
    slots = slots;
}
function normalizeSlotValue(slot) {
    return Array.isArray(slot) ? slot : [slot];
}

let currentInstance = null;
function createComponentInstance(vnode, parentInstace) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        parent: parentInstace,
        provides: parentInstace ? parentInstace.provides : {},
        emit: () => { }
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHanders);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadOnly(instance.props), { emit: instance.emit });
        setCurrentInstance(null);
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
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    // 存 key => value
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 用原型链解决 provides 的覆盖问题
        const parentProvides = currentInstance.parent.provides;
        let provides = currentInstance.provides;
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取 key => value
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        return key in parentProvides
            ? parentProvides[key]
            : typeof defaultValue === 'function'
                ? defaultValue()
                : defaultValue;
    }
    return undefined;
}

// import { render } from "./render";
function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先将 component -> vnode
                // 所有的逻辑基于 vnode 处理
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer, null);
            }
        };
    };
}

function createRenderer(options) {
    const { createElement, patchProp, insert } = options;
    function render(vnode, container, parent) {
        // TODO vnode.type is element?
        patch(vnode, container, parent);
    }
    function patch(vnode, container, parent) {
        // TODO 判断 vnode 是不是一个 element
        // yes processElement
        // no processComponent
        if (!vnode)
            return;
        const { shapeFlag, type } = vnode;
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parent);
                break;
            case Text:
                processText(vnode, container);
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(vnode, container, parent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATAFUL_COMPONENT */) {
                    processComponent(vnode, container, parent);
                }
                break;
        }
    }
    function processComponent(vnode, container, parent) {
        mountComponent(vnode, container, parent);
    }
    function processFragment(vnode, container, parent) {
        mountChild(vnode, container, parent);
    }
    function processElement(vnode, container, parent) {
        mountElement(vnode, container, parent);
    }
    function processText(vnode, container, parent) {
        const { children } = vnode;
        const textNode = vnode.el = document.createTextNode(children);
        container.append(textNode);
    }
    function mountComponent(initalVNode, container, parent) {
        const instance = createComponentInstance(initalVNode, parent);
        setupComponent(instance);
        setupRenderEffect(instance, initalVNode, container);
    }
    function mountElement(initalVNode, container, parent) {
        const { type, children, props, shapeFlag } = initalVNode;
        const el = initalVNode.el = createElement(type);
        // const el = initalVNode.el = document.createElement(type);
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
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
    function mountChild(vnode, container, parent) {
        vnode.children.forEach(child => {
            patch(child, container, parent);
        });
    }
    function setupRenderEffect(instance, vnode, container) {
        if (!instance.render)
            return;
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // vnode -> patch
        // vnode -> element -> mountElement
        patch(subTree, container, instance);
        vnode.el = subTree.el;
    }
    return {
        createApp: createAppAPI(render)
    };
}

const isOn = name => /^on[A-Z]/.test(name);
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, val) {
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, container) {
    container.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextNode, getCurrentInstance, h, inject, provide, renderSlots };
