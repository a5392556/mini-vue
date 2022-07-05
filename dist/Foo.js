import { h } from '../lib/guide-mini-vue.esm.js';
export const Foo = {
    render () {
        return h(
            'div', {},
            'hi' + this.count
        );
    },
    setup (props) {
        props.count++;
        console.log(props);
    }
}