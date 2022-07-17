import { ref } from "../../lib/guide-mini-vue.esm";
export const App = {
    name: 'App',
    template: `<div>hi,{{message}}</div>`,
    setup() {
        const count = ref(1);
        window.count = count;
        return {
            message: 'mini-vue'
        }
    }
};