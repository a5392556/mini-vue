import { h, createTextNode, getCurrentInstance } from '../lib/guide-mini-vue.esm.js';
import { Foo } from './Foo.js';
export const App = {
    render() {
        const app = h('div', {}, 'App');
        const foo = h(Foo, {}, {
            header: ({ age }) => [
                h('p', {}, 'header' + age),
                createTextNode('textnode')
            ],
            footer: () => h('p', {}, 'footer')
        });
        return h('div', {}, [app, foo]);
    },
    setup() {
        console.log(getCurrentInstance());
        return {
            
        }
    }
}