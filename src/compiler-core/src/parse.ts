import { NodeTypes } from "./ast";

const enum TagType {
    START,
    END
}

export function baseParse(content: string) {
    const context = createParserContext(content);
    return createRoot(parseChildren(context, []));
}

function parseChildren(context, ancestors) {
    const nodes: any = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith('{{')) {
            node = parseInterpolation(context);
        } else if (s[0] === '<') {
            if (/([a-z]*)/i.test(s[1]))
                node = parseElement(context, ancestors);
        }
        if (!node) node = parseText(context);
        nodes.push(node);
    }
    return nodes;
}


function parseElement(context: any, ancestor): any {
    const element: any = parseTag(context, TagType.START);
    ancestor.push(element);
    element.children = parseChildren(context, ancestor);
    ancestor.pop();
    // console.log(element.tag);
    // console.log(context.source.slice(2, 2 + context.source.length));
    if (startsWidthEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.END);
    } else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}

function parseTag(context: any, type: TagType) {

    const match: any = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];

    advanceBy(context, match[0].length);
    advanceBy(context, 1);

    return type === TagType.START
        ? {
            type: NodeTypes.ELEMENT,
            tag
        }
        : undefined;
}

function parseInterpolation(context) {

    const openDelimiter = '{{';
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);

    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    const content = rawContent.trim();
    advanceBy(context, closeDelimiter.length);
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content
        }
    }
}

function advanceBy(context: any, index: number) {
    context.source = (context.source as string).slice(index);
}

function createRoot(children) {
    return {
        children
    };
}

function createParserContext(content: string) {
    return {
        source: content
    };
}


function parseText(context: any): any {
    let endIndex = context.source.length;
    let endToken = ['<', '{{'];
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }

    const content = parseTextData(context, endIndex);
    return {
        type: NodeTypes.TEXT,
        content
    };
}

function parseTextData(context, length: number) {
    const content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}

function isEnd(context: any, ancestors: any[]) {
    const s = context.source;
    if (!s) return true;

    if (s.startsWith('</')) {
        for (let i = ancestors.length -1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWidthEndTagOpen(s, tag)) {
                return true;
            }
        }
    }

    return !s;
}

function startsWidthEndTagOpen(s: string, tag: string) {
    return s.startsWith('</') && s.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase();
}

