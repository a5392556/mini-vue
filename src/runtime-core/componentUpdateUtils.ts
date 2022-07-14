export function shouldUpdateComponent(oldVNode, newVNode) {
    const {props: prevProps} = oldVNode;
    const {props: nextProps} = newVNode;
    for(const key in nextProps) {
        if(nextProps[key] !== prevProps[key]) return true;
    }
    return false;
}