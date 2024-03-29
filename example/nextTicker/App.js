import { getCurrentInstance, h, nextTick, ref } from '../../lib/guide-mini-vue.esm.js';
// import Child from './Child.js';
export default {
    name: 'App',
    setup() {
        const count = ref(1);
        const instance = getCurrentInstance();
        function onClick() {
            for (let i = 0; i < 100; i++) {
                count.value = i;
            }
        }
        return {onClick, count};
    },
    render() {
        const button = h('button', {onClick: this.onClick}, 'update');
        const p = h('p', {}, 'count: ' + this.count);
        return h('div', {}, [
            button, p
        ]);
    }
}