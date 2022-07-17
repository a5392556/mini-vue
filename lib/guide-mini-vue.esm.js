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
        key: props && props.key,
        component: null
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

function toDisplayString(value) {
    return String(value);
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
    $slots: i => i.slots,
    $props: i => i.props
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
        emit: () => { },
        update: null,
        next: null
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
    // 如果用户有自定义 render, 则不适用自身定义的, 例如 canvas
    if (compiler && !component.render) {
        component.render = compiler(component.template);
    }
    if (component.render)
        instance.render = component.render;
}
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(oldVNode, newVNode) {
    const { props: prevProps } = oldVNode;
    const { props: nextProps } = newVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key])
            return true;
    }
    return false;
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

const queue = [];
let isFlushPanding = false;
const FlushPromise = Promise.resolve();
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function nextTick(fn) {
    return fn ? FlushPromise.then(fn) : FlushPromise;
}
function queueFlush() {
    if (!isFlushPanding) {
        isFlushPanding = true;
        nextTick(flushJobs);
    }
}
function flushJobs() {
    isFlushPanding = false;
    let job;
    while (job = queue.shift()) {
        job && job();
    }
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
        // console.log(anchor);
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
        oldVNode ? updateComponent(oldVNode, newVNode)
            : mountComponent(newVNode, container, parent, anchor);
    }
    function updateComponent(oldVNode, newVNode) {
        const instance = newVNode.component = oldVNode.component;
        if (shouldUpdateComponent(oldVNode, newVNode)) {
            instance.next = newVNode;
            instance.update();
        }
        else {
            newVNode.el = oldVNode.el;
            instance.vnode = newVNode;
        }
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
        else {
            // 通过 key 或者节点属性对比中间乱序部分
            const s1 = i, s2 = i;
            const toBePatched = e2 - s2 + 1;
            let patchNum = 0;
            // 存放 key
            const keyToNewIndexMap = new Map();
            const indexToOldIndexMap = new Array(toBePatched).fill(0);
            // 存放新节点的 key
            for (let i = s2; i <= e2; i++) {
                keyToNewIndexMap.set(c2[i].key, i);
            }
            // 存放当前查找新的节点下标
            let newIndex = undefined;
            let move = false, maxIndexValue = 0;
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 如果新节点数量已经 patch，那么剩下的老节点删除即可
                if (patchNum >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                // 用 key 来更新，如果 key 不存在就遍历对比
                if (prevChild.key) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // 没找到删除，找到就更新
                if (newIndex !== undefined) {
                    patch(prevChild, c2[newIndex], el, parent, null);
                    patchNum++;
                    indexToOldIndexMap[newIndex - s2] = i + 1;
                    // 如果该序列里不是全部都符合递增，做标记 move，后面需要执行计算最长递增子序列
                    newIndex >= maxIndexValue ? (maxIndexValue = newIndex) : (move = true);
                }
                else {
                    hostRemove(prevChild.el);
                }
            }
            const increasingNewIndexSequence = getSequence(indexToOldIndexMap);
            let j = increasingNewIndexSequence.length - 1;
            for (let i = toBePatched - 1; i >= 0; i--) {
                const newIndex = i + s2;
                const newChild = c2[newIndex];
                const anchorEl = newIndex + 1 < l2 ? c2[newIndex + 1].el : null;
                // 新增的节点
                if (indexToOldIndexMap[i] === 0) {
                    patch(null, newChild, el, parent, anchorEl);
                }
                else if (move) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 不在递增子序列里的节点只能进行转移
                        hostInsert(newChild.el, el, anchorEl);
                    }
                    else {
                        j--;
                    }
                }
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
        const instance = initalVNode.component = createComponentInstance(initalVNode, parent);
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
        instance.update = effect(() => {
            if (!instance.render)
                return;
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                patch(null, subTree, container, instance, anchor);
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新组件
                const next = instance.next;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const prevSubTree = instance.subTree;
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                patch(prevSubTree, subTree, container, instance, anchor);
                vnode.el = subTree.el;
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
function updateComponentPreRender(instance, nextVNdoe) {
    instance.props = nextVNdoe.props;
    instance.vnode = nextVNdoe;
    instance.next = null;
}
// 获取最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    h: h,
    renderSlots: renderSlots,
    createTextNode: createTextNode,
    createElementVNode: createVNode,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    provide: provide,
    inject: inject,
    createRenderer: createRenderer,
    nextTick: nextTick,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs,
    handleChange: handleChange
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(',');
    push(`function ${functionName}(${signature}) {`);
    push('return ');
    // debugger
    // console.log(ast.codegenNode);
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    };
}
function genFunctionPreamble(ast, context) {
    const aliasHelpers = s => `${helperMapName[s]}: _${helperMapName[s]}`;
    const VueBinging = 'Vue';
    if (ast.helpers.length > 0)
        context.push(`const { ${ast.helpers.map(aliasHelpers).join(', ')} } = ${VueBinging}`);
    context.push('\n');
    context.push("return ");
}
function genNode(codegenNode, context) {
    if (!codegenNode)
        return;
    switch (codegenNode.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(context, codegenNode);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(context, codegenNode);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(context, codegenNode);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(context, codegenNode);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(context, codegenNode);
            break;
    }
}
function isString(node) {
    return typeof node === 'string';
}
function genCompoundExpression(context, node) {
    const { children } = node;
    const { push } = context;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(context, codegenNode) {
    const { push, helper } = context;
    const { tag, children, props } = codegenNode;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    // genNode(children, context);
    genNodeList(genNullable([tag, props, children]), context);
    push(')');
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1)
            push(', ');
    }
}
function genText(context, codegenNode) {
    const { push } = context;
    push(`'${codegenNode.content}'`);
}
function genInterpolation(context, codegenNode) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(codegenNode.content, context);
    push(')');
}
function genExpression(context, codegenNode) {
    const { push } = context;
    push(`${codegenNode.content}`);
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genNullable(args) {
    // throw new Error("Function not implemented.");
    return args.map(arg => arg || 'null');
}

function baseParse(content) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith('{{')) {
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            if (/([a-z]*)/i.test(s[1]))
                node = parseElement(context, ancestors);
        }
        if (!node)
            node = parseText(context);
        nodes.push(node);
    }
    return nodes;
}
function parseElement(context, ancestor) {
    const element = parseTag(context, 0 /* TagType.START */);
    ancestor.push(element);
    element.children = parseChildren(context, ancestor);
    ancestor.pop();
    if (startsWidthEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.END */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    return type === 0 /* TagType.START */
        ? {
            type: 2 /* NodeTypes.ELEMENT */,
            tag
        }
        : undefined;
}
function parseInterpolation(context) {
    const openDelimiter = '{{';
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content
        }
    };
}
function advanceBy(context, index) {
    context.source = context.source.slice(index);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
function createParserContext(content) {
    return {
        source: content
    };
}
function parseText(context) {
    let endIndex = context.source.length;
    let endToken = ['<', '{{'];
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (!s)
        return true;
    if (s.startsWith('</')) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWidthEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !s;
}
function startsWidthEndTagOpen(s, tag) {
    return s.startsWith('</') && s.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase();
}

function transform(root, options) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function traverseNode(node, context) {
    const type = node.type;
    // 遍历调用所有的 nodeTransforms
    // 把 node 给到 transform
    // 用户可以对 node 做处理
    const nodeTransforms = context.nodeTransforms;
    const exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit) {
            exitFns.push(onExit);
        }
    }
    switch (type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            // 插值的点，在于后续生成 render 代码的时候是获取变量的值
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    // i-- 这个很巧妙
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
        exitFns[i]();
    }
}
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: (options === null || options === void 0 ? void 0 : options.nodeTransforms) || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        traverseNode(child, context);
    }
}
function createRootCodegen(root) {
    const { children } = root;
    // 只支持有一个根节点
    // 并且还是一个 single text node
    const child = children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */ && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    }
    else {
        root.codegenNode = child;
    }
    // root.codegenNode = child;
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    const vnodeElement = {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children
    };
    return vnodeElement;
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // 中间处理层
            // tag
            const vnodeTag = `'${node.tag}'`;
            // props
            let vnodeProps;
            // chldren
            let vnodeChildren = node.children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer = undefined;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push('+', next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function('Vue', code)(runtimeDom);
    return render;
    // function renderFunction(Vue) {
    //     const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode } = Vue
    //     return function render(_ctx, _cache) { return _createElementVNode('div', null, 'hi,' + _toDisplayString(_ctx.msg)) }
    // }
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementVNode, createRenderer, createTextNode, getCurrentInstance, h, handleChange, inject, nextTick, provide, proxyRefs, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
