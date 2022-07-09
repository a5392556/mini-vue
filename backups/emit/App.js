import { h } from '../../lib/guide-mini-vue.esm.js';
import { Foo } from '../emit/Foo.js';
window.self = null;
export const App = {
    render () {
        return h('div', {}, [h('div', {}, 'App'), h(Foo, {
            onAdd(a, b) {
                console.log('onAdd', a, b);
            },
            onAddFoo() {
                console.log('onAddFoo');
            }
        })]);
    },
    setup () {
        return {}
    }
}