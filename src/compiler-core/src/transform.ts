export function transform(root, options?: any) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root);
}

function traverseNode(node, context) {
    context.nodeTransform.forEach(fn => {
        fn(node);
    });

    const children = node.children;
    if (children) {
        traverseChildren(children, context);
    }
}

function createTransformContext(root, options) {
    return {
        root,
        nodeTransform: options?.nodeTransform || []
    };
}

function traverseChildren(children, context) {
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        traverseNode(child, context);
    }
}

function createRootCodegen(root: any) {
    root.codegenNode = root.children[0];
}
