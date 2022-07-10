import { createRenderer } from '../runtime-core';
const isOn = name => /^on[A-Z]/.test(name);
function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key,oldVal ,newVal) {
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, newVal);
    } else {
        if(!newVal) el.removeAttribute(key);
        else el.setAttribute(key, newVal);
    }
}
function insert(el, container) {
    container.append(el);
}

function setElementText(el, text) {
    el.textContent = text;
}

function remove(el) {
    const parent = el.parentNode;
    parent && parent.removeChild(el);
}

const renderer: any = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});

export function createApp(...args) {
    return renderer.createApp(...args);
}

export * from '../runtime-core';