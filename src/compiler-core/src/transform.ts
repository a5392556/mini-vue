import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelper";

export function transform(root, options?: any) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}

function traverseNode(node, context) {
    context.nodeTransform.forEach(fn => {
        fn(node);
    });

    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING);
            break;
        case NodeTypes.ROOT: 
        case NodeTypes.ELEMENT:
            traverseChildren(node, context);
            break;
        default:
            break;
    }
}

function createTransformContext(root, options) {
    
    const context = {
        root,
        nodeTransform: options?.nodeTransform || [],
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
    root.codegenNode = root.children[0];
}
