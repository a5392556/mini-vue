const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    // 通过位运算符计算 node 的类型
    const vnode = {
        type,
        props,
        children,
        el: undefined,
        shapeFlag: getShapeFlag(type),
        key: props && props.key
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

let activeEffect;
let shouldTrack;
const targetMap = new Map();
class ReactiveEffect {
    constructor(fn, scheduler) {
        this._fn = fn;
        this.scheduler = scheduler;
        this.deps = [];
        this.onStop = undefined;
        this.active = true;
    }
    run() {
        if (!this.active)
            return this._fn();
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn();
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach(dep => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
// 收集依赖
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffect(dep);
}
function trackEffect(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect === null || activeEffect === void 0 ? void 0 : activeEffect.deps.push(dep);
}
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
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    _effect.run();
    extend(_effect, options);
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
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
        !isReadonly && track(target, key);
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

class Ref {
    constructor(value) {
        this._rawValue = value;
        this.isRef = true;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(value) {
        if (!handleChange(this._rawValue, value))
            return;
        this._value = convert(value);
        triggerEffect(this.dep);
    }
}
function ref(value) {
    return new Ref(value);
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffect(ref.dep);
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function isRef(ref) {
    return !!ref.isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(object) {
    return new Proxy(object, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            return isRef(target[key]) && !isRef(value) ? (target[key].value = value) : Reflect.set(target, key, value);
        }
    });
}

// export function add(a: number, b: number) {
//     return a + b;
// }
function handleChange(oldValue, newValue) {
    return !Object.is(oldValue, newValue);
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
        isMounted: false,
        subTree: {},
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
        instance.setupState = proxyRefs(setupResult);
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
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, setElementText: hostSetElementText, remove: hostRemove } = options;
    function render(vnode, container, parent) {
        // TODO vnode.type is element?
        patch(null, vnode, container, parent, null);
    }
    function patch(oldVNode, newVNode, container, parent, anchor) {
        // TODO 判断 newVNode 是不是一个 element
        // yes processElement
        // no processComponent
        console.log(anchor);
        if (!newVNode)
            return;
        const { shapeFlag, type } = newVNode;
        switch (type) {
            case Fragment:
                processFragment(oldVNode, newVNode, container, parent, anchor);
                break;
            case Text:
                processText(oldVNode, newVNode, container);
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(oldVNode, newVNode, container, parent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATAFUL_COMPONENT */) {
                    processComponent(oldVNode, newVNode, container, parent, anchor);
                }
                break;
        }
    }
    function processComponent(oldVNode, newVNode, container, parent, anchor) {
        mountComponent(newVNode, container, parent, anchor);
    }
    function processFragment(oldVNode, newVNode, container, parent, anchor) {
        mountChild(newVNode.children, container, parent, anchor);
    }
    function processElement(oldVNode, newVNode, container, parent, anchor) {
        // TODO oldVNode 存在则更新节点，否则就是初始化
        oldVNode ? patchElement(oldVNode, newVNode, container, parent, anchor) : mountElement(newVNode, container, parent, anchor);
    }
    function patchElement(oldVNode, newVNode, container, parent, anchor) {
        const prevProps = oldVNode.props;
        const newProps = newVNode.props;
        const el = newVNode.el = oldVNode.el;
        patchProps(el, prevProps, newProps);
        patchChild(oldVNode, newVNode, el, parent, anchor);
    }
    function patchProps(el, prevProps, newProps) {
        if (prevProps !== newProps) {
            for (const key in newProps) {
                if (prevProps[key] !== newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], newProps[key]);
                }
            }
            for (const key in prevProps) {
                if (!newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], null);
                }
            }
        }
    }
    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }
    function patchChild(oldVNode, newVNode, el, parent, anchor) {
        const c1 = oldVNode.children, c2 = newVNode.children;
        const newNodeFlag = newVNode.shapeFlag, oldNodeFlag = oldVNode.shapeFlag;
        // 新孩子节点是 text
        if (newNodeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (oldNodeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unMoutedChild(c1);
            }
            c1 !== c2 && (hostSetElementText(el, c2));
        }
        else {
            // 新孩子节点是 array
            if (oldNodeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                hostSetElementText(el, '');
                mountChild(c2, el, parent, anchor);
            }
            // 都是 array 时进行 diff 算法对比
            else {
                patchKeyedChildren(c1, c2, el, parent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, el, parent, parentAnchor) {
        const l2 = c2.length;
        let e1 = c1.length - 1, e2 = l2 - 1, i = 0;
        // 对比左侧相同
        while (i <= e1 && i <= e2) {
            const n1 = c1[i], n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, el, parent, parentAnchor);
            }
            else
                break;
            i++;
        }
        // 对比右侧相同
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1], n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, el, parent, parentAnchor);
            }
            else
                break;
            e1--;
            e2--;
        }
        // 对比新的比老的多
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                // debugger
                while (i <= e2) {
                    patch(null, c2[i], el, parent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
    }
    function unMoutedChild(children) {
        children.forEach(child => {
            hostRemove(child.el);
        });
    }
    function processText(oldVNode, newVNode, container, parent) {
        const { children } = newVNode;
        const textNode = newVNode.el = document.createTextNode(children);
        container.append(textNode);
    }
    function mountComponent(initalVNode, container, parent, anchor) {
        const instance = createComponentInstance(initalVNode, parent);
        setupComponent(instance);
        setupRenderEffect(instance, initalVNode, container, anchor);
    }
    function mountElement(initalVNode, container, parent, anchor) {
        const { type, children, props, shapeFlag } = initalVNode;
        const el = initalVNode.el = hostCreateElement(type);
        // const el = initalVNode.el = document.createElement(type);
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChild(initalVNode.children, el, parent, anchor);
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
        hostInsert(el, container, anchor);
    }
    function mountChild(children, container, parent, anchor) {
        children.forEach(child => {
            patch(null, child, container, parent, anchor);
        });
    }
    function setupRenderEffect(instance, vnode, container, anchor) {
        // vnode -> patch
        // vnode -> element -> mountElement
        effect(() => {
            if (!instance.render)
                return;
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(null, subTree, container, instance, anchor);
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                const prevSubTree = instance.subTree;
                const subTree = instance.subTree = instance.render.call(proxy);
                patch(prevSubTree, subTree, container, instance, anchor);
                vnode.el = subTree.el;
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}

const isOn = name => /^on[A-Z]/.test(name);
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, oldVal, newVal) {
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, newVal);
    }
    else {
        if (!newVal)
            el.removeAttribute(key);
        else
            el.setAttribute(key, newVal);
    }
}
function insert(child, parent, anchor) {
    // console.log(anchor)
    parent.insertBefore(child, anchor);
}
function setElementText(el, text) {
    el.textContent = text;
}
function remove(el) {
    const parent = el.parentNode;
    parent && parent.removeChild(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextNode, getCurrentInstance, h, handleChange, inject, provide, proxyRefs, ref, renderSlots };
