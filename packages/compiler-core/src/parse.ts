import { NodeTypes } from "./ast";

export function baseParse(content: string) {
  const context = createParserContext(content);

  return createRoot(parseChildren(context));
}

function parseChildren(context: any) {
  const nodes: any = [];

  let node: any;
  if (context.source.startsWith("{{")) {
    node = parseInterpolation(context);
  }

  nodes.push(node);

  return nodes;
}

function parseInterpolation(context: any) {
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  const openDelimiterLength = openDelimiter.length;
  const closeDelimiterLength = closeDelimiter.length;

  const closeIndex = context.content.indexOf(
    closeDelimiter,
    openDelimiterLength
  );
  advanceBy(context, openDelimiterLength);

  const rawContentLength = closeIndex - openDelimiterLength;
  const content = context.source.slice(0, rawContentLength).trim();

  console.log(content);

  advanceBy(context, rawContentLength + closeDelimiterLength);
  console.log("context.source", context.source);

  return [
    {
      type: NodeTypes.INTERPOLATION,
      content: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: content,
      },
    },
  ];
}

function advanceBy(context: any, length: number) {
  context.source = context.content.slice(length);
}

function createRoot(children: any[]) {
  return {
    children,
  };
}

function createParserContext(content: string) {
  return {
    source: content,
  };
}
