import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJobs } from "./scheduler";
import { Fragment, Text } from "./vnode";
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        setElementText: hostSetElementText,
        remove: hostRemove
    } = options;
    function render(vnode, container, parent) {
        // TODO vnode.type is element?
        patch(null, vnode, container, parent, null);
    }
    function patch(oldVNode, newVNode, container, parent, anchor) {
        // TODO 判断 newVNode 是不是一个 element
        // yes processElement
        // no processComponent
        // console.log(anchor);
        if (!newVNode) return;
        const {
            shapeFlag,
            type
        } = newVNode;
        switch (type) {
            case Fragment:
                processFragment(oldVNode, newVNode, container, parent, anchor);
                break;
            case Text:
                processText(oldVNode, newVNode, container, parent);
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, parent, anchor);
                } else if (shapeFlag & ShapeFlags.STATAFUL_COMPONENT) {
                    processComponent(oldVNode, newVNode, container, parent, anchor);
                }
                break;
        }

    }
    function processComponent(oldVNode, newVNode: any, container: any, parent, anchor) {
        oldVNode ? updateComponent(oldVNode, newVNode)
                : mountComponent(newVNode, container, parent, anchor);
    }
    function updateComponent(oldVNode, newVNode) {
        const instance = newVNode.component = oldVNode.component;
        if(shouldUpdateComponent(oldVNode, newVNode)) {
            instance.next = newVNode;
            instance.update();
        }else {

            newVNode.el = oldVNode.el;
            instance.vnode = newVNode;
        }
        
    }
    function processFragment(oldVNode, newVNode: any, container: any, parent, anchor) {
        mountChild(newVNode.children, container, parent, anchor);
    }
    function processElement(oldVNode, newVNode: any, container: any, parent, anchor) {
        // TODO oldVNode 存在则更新节点，否则就是初始化
        oldVNode ? patchElement(oldVNode, newVNode, container, parent, anchor) : mountElement(newVNode, container, parent, anchor);
    }
    function patchElement(oldVNode, newVNode: any, container: any, parent, anchor) {
        const prevProps = oldVNode.props;
        const newProps = newVNode.props;
        const el = newVNode.el = oldVNode.el;
        patchProps(el, prevProps, newProps);
        patchChild(oldVNode, newVNode, el, parent, anchor);
    }

    function patchProps(el, prevProps, newProps) {
        if (prevProps !== newProps) {
            for (const key in newProps) {
                if (prevProps[key] !== newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], newProps[key]);
                }
            }
            for (const key in prevProps) {
                if (!newProps[key]) {
                    hostPatchProp(el, key, prevProps[key], null);
                }
            }
        }

    }

    function isSameVNodeType(n1, n2) {
        return n1.type === n2.type && n1.key === n2.key;
    }

    function patchChild(oldVNode, newVNode, el, parent, anchor) {
        const c1 = oldVNode.children, c2 = newVNode.children;
        const newNodeFlag = newVNode.shapeFlag, oldNodeFlag = oldVNode.shapeFlag;
        // 新孩子节点是 text
        if (newNodeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (oldNodeFlag & ShapeFlags.ARRAY_CHILDREN) {
                unMoutedChild(c1);
            }
            c1 !== c2 && (hostSetElementText(el, c2));
        }
        else {
            // 新孩子节点是 array
            if (oldNodeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(el, '');
                mountChild(c2, el, parent, anchor);
            }
            // 都是 array 时进行 diff 算法对比
            else {
                patchKeyedChildren(c1, c2, el, parent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, el, parent, parentAnchor) {
        const l2 = c2.length;
        let e1 = c1.length - 1, e2 = l2 - 1, i = 0;
        // 对比左侧相同
        while (i <= e1 && i <= e2) {
            const n1 = c1[i], n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, el, parent, parentAnchor);
            } else break;
            i++;
        }
        // 对比右侧相同
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1], n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, el, parent, parentAnchor);
            } else break;
            e1--;
            e2--;
        }
        // 对比新的比老的多
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;

                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                // debugger
                while (i <= e2) {
                    patch(null, c2[i], el, parent, anchor);
                    i++;
                }
            }
        } else if (i > e2) {
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        } else {
            // 通过 key 或者节点属性对比中间乱序部分
            const s1 = i, s2 = i;
            const toBePatched = e2 - s2 + 1;
            let patchNum = 0;
            // 存放 key
            const keyToNewIndexMap = new Map();
            const indexToOldIndexMap = new Array(toBePatched).fill(0);
            // 存放新节点的 key
            for (let i = s2; i <= e2; i++) {
                keyToNewIndexMap.set(c2[i].key, i);
            }
            // 存放当前查找新的节点下标
            let newIndex: undefined | number = undefined;
            let move = false, maxIndexValue = 0;
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 如果新节点数量已经 patch，那么剩下的老节点删除即可
                if (patchNum >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                // 用 key 来更新，如果 key 不存在就遍历对比
                if (prevChild.key) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                } else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                // 没找到删除，找到就更新
                if (newIndex !== undefined) {
                    patch(prevChild, c2[newIndex], el, parent, null);
                    patchNum++;
                    indexToOldIndexMap[newIndex - s2] = i + 1;
                    // 如果该序列里不是全部都符合递增，做标记 move，后面需要执行计算最长递增子序列
                    newIndex >= maxIndexValue ? (maxIndexValue = newIndex) : (move = true);
                } else {
                    hostRemove(prevChild.el);
                }
            }
            const increasingNewIndexSequence = getSequence(indexToOldIndexMap);
            let j = increasingNewIndexSequence.length - 1;
            for(let i = toBePatched - 1; i >= 0; i--) {
                const newIndex = i + s2;
                const newChild = c2[newIndex];
                const anchorEl = newIndex + 1 < l2 ? c2[newIndex + 1].el : null;
                // 新增的节点
                if(indexToOldIndexMap[i] === 0) {
                    patch(null, newChild, el, parent, anchorEl);
                }else if(move) {
                    if(j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 不在递增子序列里的节点只能进行转移
                        hostInsert(newChild.el, el, anchorEl);
                    }else {
                        j--;
                    }
                }                
            }
        }

    }
    function unMoutedChild(children) {
        children.forEach(child => {
            hostRemove(child.el);
        });
    }
    function processText(oldVNode, newVNode: any, container: any, parent) {
        const { children } = newVNode;
        const textNode = newVNode.el = document.createTextNode(children);
        container.append(textNode);
    }
    function mountComponent(initalVNode: any, container: any, parent, anchor) {
        const instance = initalVNode.component = createComponentInstance(initalVNode, parent);
        setupComponent(instance);
        setupRenderEffect(instance, initalVNode, container, anchor);
    }
    function mountElement(initalVNode: any, container: any, parent, anchor) {
        const {
            type,
            children,
            props,
            shapeFlag
        } = initalVNode;
        const el = initalVNode.el = hostCreateElement(type);
        // const el = initalVNode.el = document.createElement(type);

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            el.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChild(initalVNode.children, el, parent, anchor);
        }

        // const isOn = name => /^on[A-Z]/.test(name);
        for (const key in props) {
            const val = props[key];
            // if (isOn(key)) {
            //     const event = key.slice(2).toLowerCase();
            //     el.addEventListener(event, props[key]);
            // } else {
            //     el.setAttribute(key, props[key]);
            // }
            hostPatchProp(el, key, null, val);
        }
        // container.append(el);
        hostInsert(el, container, anchor);
    }
    function mountChild(children: any, container: any, parent, anchor) {
        children.forEach(child => {
            patch(null, child, container, parent, anchor);
        });
    }
    function setupRenderEffect(instance: any, vnode: any, container: any, anchor) {
        // vnode -> patch
        // vnode -> element -> mountElement
        instance.update = effect(() => {
            if (!instance.render) return;
            const { proxy, isMounted } = instance;
            if (!isMounted) {
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                patch(null, subTree, container, instance, anchor);
                vnode.el = subTree.el;
                instance.isMounted = true;
            } else {
                // 更新组件
                const next = instance.next;
                if(next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const prevSubTree = instance.subTree;
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                patch(prevSubTree, subTree, container, instance, anchor);
                vnode.el = subTree.el;
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            }
        });
    }

    return {
        createApp: createAppAPI(render)
    }
}

function updateComponentPreRender(instance, nextVNdoe) {
    instance.props = nextVNdoe.props;
    instance.vnode = nextVNdoe;
    instance.next = null;
}
// 获取最长递增子序列
function getSequence(arr: number[]): number[] {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                } else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}


