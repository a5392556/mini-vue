import { NodeTypes } from "./ast";
import { helperMapName, TO_DISPLAY_STRING } from "./runtimeHelper";

export function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
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

function genFunctionPreamble(ast, context) {
    const aliasHelpers = s => `${helperMapName[s]}: _${helperMapName[s]}`;
    const VueBinging = 'Vue';
    if (ast.helpers.length > 0) context.push(`const { ${ast.helpers.map(aliasHelpers).join(', ')} } = ${VueBinging}`);
    context.push('\n');
    context.push("return ");
}

function genNode(codegenNode: any, context) {
    if(!codegenNode) return ;
    switch (codegenNode.type) {
        case NodeTypes.TEXT:
            genText(context, codegenNode);
            break;
        case NodeTypes.INTERPOLATION: 
            genInterpolation(context, codegenNode);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(context, codegenNode);
        default:
            break;
    }
}

function genText(context: any, codegenNode: any) {
    const { push } = context;
    push(`'${codegenNode.content}'`);
}
function genInterpolation(context: any, codegenNode: any) {
    const { push, helper} = context;
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




