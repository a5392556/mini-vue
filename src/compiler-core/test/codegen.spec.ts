import { generate } from "../src/codegen";
import { baseParse } from "../src/parse"
import { transform } from "../src/transform";
import { transformExpression } from "../src/transforms/transformExpression";

describe('code genertor', () => {
    it('string', () => {
        const ast = baseParse('hi');
        transform(ast);
        const {code} = generate(ast);
        expect(code).toMatchSnapshot();
    });
});

describe('code genertor', () => {
    it('interpolation', () => {
        const ast = baseParse('{{message}}');
        transform(ast, {
            nodeTransform: [transformExpression]
        });
        const {code} = generate(ast);
        expect(code).toMatchSnapshot();
    });
});