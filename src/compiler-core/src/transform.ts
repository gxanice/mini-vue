import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING } from "./runtimeHelper";

export function transform(root: any, options: any = {}) {
  // 创建上下文对象
  const context = createTransformContext(root, options);
  // 深度优先搜索dps
  traverseNode(root, context);

  createRootCodegen(root);

  root.helpers = [...context.helpers.keys()];
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0];
}

function createTransformContext(root: any, options: any) {
  const context = {
    root: root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1);
    },
  };
  return context;
}

function traverseNode(node: any, context: any) {
  const nodeTransforms = context.nodeTransforms;
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node,context);
  }

  // 判断是否是插值
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

function traverseChildren(node: any, context: any) {
  const children = node.children;

  for (let i = 0; i < children.length; i++) {
    traverseNode(children[i], context);
  }
}
