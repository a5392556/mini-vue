export * from './runtime-dom';
import { baseCompile } from './compiler-core/src';
import * as runtimeDom  from './runtime-dom';
import { registerRuntimeCompiler } from "./runtime-dom";
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