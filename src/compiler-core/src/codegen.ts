export function generate(ast) {
    const context = createCodegenContext();
    const {push} = context;
    push("return ");
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(',');
    push(`function ${functionName}(${signature}) {`);
    push('return ');
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    }
}

function genNode(codegenNode:any, context) {
    const {push} = context;
    push(`'${codegenNode.content}'`);
}

function createCodegenContext() {
    const context = {
        code: '',
        push(source: string) {
            context.code += source;
        }
    };
    return context;
}