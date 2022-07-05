import { h } from '../lib/guide-mini-vue.esm.js';
window.self = null;
export const App = {
    render() {
        window.self = this;
        return h('div', {
            id: 'root',
            class: ['root'],
            onClick() {
                console.log('click')
            }
        }, 
        // [
        //     h('p', {
        //         id: 'p1',
        //         class: ['red']
        //     }, 'hi'),
        //     h('p', {
        //         id: 'p2',
        //         class: ['green']
        //     }, 'mini-vue')
        // ]
        this.msg
        );
    },
    setup() {
        return {
            msg: 'hi mini-vue'
        }
    }
}