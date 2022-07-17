import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelper";

export function transform(root, options?: any) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}

function traverseNode(node, context) {
    const type: NodeTypes = node.type;

    // 遍历调用所有的 nodeTransforms
    // 把 node 给到 transform
    // 用户可以对 node 做处理
    const nodeTransforms = context.nodeTransforms;
    const exitFns: any = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
      const transform = nodeTransforms[i];
  
      const onExit = transform(node, context);
      if (onExit) {
        exitFns.push(onExit);
      }
    }
  
    switch (type) {
      case NodeTypes.INTERPOLATION:
        // 插值的点，在于后续生成 render 代码的时候是获取变量的值
        context.helper(TO_DISPLAY_STRING);
        break;
  
      case NodeTypes.ROOT:
      case NodeTypes.ELEMENT:
  
        traverseChildren(node, context);
        break;
  
      default:
        break;
    }
  
  
  
    let i = exitFns.length;
    // i-- 这个很巧妙
    // 使用 while 是要比 for 快 (可以使用 https://jsbench.me/ 来测试一下)
    while (i--) {
      exitFns[i]();
    }
}

function createTransformContext(root, options) {

    const context = {
        root,
        nodeTransforms: options?.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}

function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        traverseNode(child, context);
    }
}

function createRootCodegen(root: any) {
    const { children } = root;

    // 只支持有一个根节点
    // 并且还是一个 single text node
    const child = children[0];

    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
        const codegenNode = child.codegenNode;
        root.codegenNode = codegenNode;
    } else {
        root.codegenNode = child;
    }

    // root.codegenNode = child;
    
}
