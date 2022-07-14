import { h, ref } from '../../lib/guide-mini-vue.esm.js';
import Child from './Child.js';


export default {
    name: 'App',
    setup() {
        const msg = ref('123');
        window.msg = msg;
        const changeChildProps = () => {
            msg.value = '456';
        }
        return {msg, changeChildProps};
    },
    render() {
        return h('div', {}, [
            h('div', {}, 'hello'),
            h(
                'button',
                {
                    onClick: this.changeChildProps,
                },
                'change child props'
            ),
            h(Child, {
                msg: this.msg
            })
        ]);
    }
}