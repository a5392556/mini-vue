import { h, renderSlots } from '../lib/guide-mini-vue.esm.js';
export const Foo = {

    setup(props, { emit }) {
        return {};
    },
    render() {
        const foo = h('p', {}, 'foo');
        return h('div', {}, [renderSlots(this.$slots, 'header', {age: 18}), foo,renderSlots(this.$slots, 'footer') ]);
    },
}