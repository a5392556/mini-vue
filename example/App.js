export const App = {
    render() {
        return history('div', this.msg);
    },
    setup() {
        return {
            msg: 'hi mini-vue'
        }
    }
}