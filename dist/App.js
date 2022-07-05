import { h } from '../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';
window.self = null;
export const App = {
    render () {
        window.self = this;
        return h('div', {
            id: 'root',
            class: ['root'],
            onClick () {
                console.log('click')
            }
        },
            [
                h('div', {}, this.msg),
                h(Foo, {count: 1})
            ]
        );
    },
    setup () {
        return {
            msg: 'hi mini-vue'
        }
    }
}