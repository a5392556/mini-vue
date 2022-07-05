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

const publicPropertiesMap = {
    $el: i => i.vnode.el
};
const publicInstanceProxyHanders = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        if (key in setupState)
            return setupState[key];
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
        setupState: {}
    };
    return component;
}
function setupComponent(instance) {
    // TODO
    // initProps();
    // initSlots();
    instance.proxy = new Proxy({ _: instance }, publicInstanceProxyHanders);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        const setupResult = setup();
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
