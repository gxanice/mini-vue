import { NodeTypes } from './ast';

const enum TagType {
  START,
  END
}

// baseParse 函数是解析器的入口点，接收一个模板字符串 content 作为输入
export function baseParse(content: string) {
  // 创建解析上下文
  const context = createParserContext(content);
  // 解析子节点，并创建一个根节点
  return createRoot(parseChildren(context));
}

// parseChildren 函数负责解析所有子节点
function parseChildren(context: any) {
  // 初始化节点数组
  const nodes: any = [];

  let node: any;
  let s = context.source
  // 如果当前上下文的源码以 "{{" 开始，则解析为插值表达式
  if (s.startsWith("{{")) {
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context);
    }
  }

  // 将解析得到的节点添加到节点数组中
  nodes.push(node);

  return nodes;
}

function parseElement(context: any) {
  const element = parseTag(context, TagType.START);
  parseTag(context, TagType.END);

  // 解析tag
  return element
}


function parseTag(context: any, type:any) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  const tag = match[1];
  // 删除处理完成的代码
  advanceBy(context, match[0].length);
  advanceBy(context, 1);

  if(type === TagType.END) return

  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
}

// parseInterpolation 函数用于解析插值表达式
function parseInterpolation(context: any) {
  // 定义插值的开闭标记
  const openDelimiter = "{{";
  const closeDelimiter = "}}";
  // 计算开闭标记的长度
  const openDelimiterLength = openDelimiter.length;
  const closeDelimiterLength = closeDelimiter.length;

  // 查找闭标记的索引
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiterLength
  );
  // 前进到插值内容的开始位置
  advanceBy(context, openDelimiterLength);

  // 计算插值内容的长度，并提取出来
  const rawContentLength = closeIndex - openDelimiterLength;
  const content = context.source.slice(0, rawContentLength).trim();

  // 前进到插值表达式之后的位置
  advanceBy(context, rawContentLength + closeDelimiterLength);

  // 返回一个表示插值表达式的节点对象
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

// advanceBy 函数用于前进指定长度的字符，更新解析上下文中的源码字符串
function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length);
}

// createRoot 函数用于创建一个根节点，包含所有解析出的子节点
function createRoot(children: any[]) {
  return {
    children,
  };
}

// createParserContext 函数用于创建解析上下文，初始化源码字符串
function createParserContext(content: string) {
  return {
    source: content,
  };
}

