import { NodeTypes } from "./ast";
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelper";

export function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(',');
    push(`function ${functionName}(${signature}) {`);
    push('return ');
    // debugger
    // console.log(ast.codegenNode);
    genNode(ast.codegenNode, context);
    push('}');
    return {
        code: context.code
    }
}

function genFunctionPreamble(ast, context) {
    const aliasHelpers = s => `${helperMapName[s]}: _${helperMapName[s]}`;
    const VueBinging = 'Vue';
    if (ast.helpers.length > 0) context.push(`const { ${ast.helpers.map(aliasHelpers).join(', ')} } = ${VueBinging}`);
    context.push('\n');
    context.push("return ");
}

function genNode(codegenNode: any, context) {
    if (!codegenNode) return;

    switch (codegenNode.type) {
        case NodeTypes.TEXT:
            genText(context, codegenNode);
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(context, codegenNode);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(context, codegenNode);
            break;
        case NodeTypes.ELEMENT:
            genElement(context, codegenNode);
            break;
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(context, codegenNode);
            break;
        default:
            break;
    }
}

function isString(node) {
    return typeof node === 'string';
}

function genCompoundExpression(context: any, node: any) {
    const { children } = node;
    const { push } = context;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        } else {
            genNode(child, context);
        }
    }
}
function genElement(context, codegenNode) {
    const { push, helper } = context;
    const { tag, children, props } = codegenNode;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    // genNode(children, context);
    genNodeList(genNullable([tag, props, children]), context);
    push(')');
}

function genNodeList(nodes: any[], context) {
    const {push} = context;
    for(let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if(isString(node)) {
            push(node);
        }else {
            genNode(node, context);
        }
        if(i < nodes.length - 1) push(', ');
    }
}
function genText(context: any, codegenNode: any) {
    const { push } = context;
    push(`'${codegenNode.content}'`);

}
function genInterpolation(context: any, codegenNode: any) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(codegenNode.content, context);
    push(')');
}
function genExpression(context: any, codegenNode: any) {
    const { push } = context;
    push(`${codegenNode.content}`);
}
function createCodegenContext() {
    const context = {
        code: '',
        push(source: string) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`
        }
    };
    return context;
}






function genNullable(args: any[]) {
    // throw new Error("Function not implemented.");
    return args.map(arg => arg || 'null');
}

