import { NodeTypes } from "./ast";

export function transform(root: any, options: any = {}) {
  // 创建上下文对象
  const context = createTransformContext(root, options);
  // 深度优先搜索dps
  traverseNode(root, context);

  createRootCodegen(root);
}

function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}


function createTransformContext(root: any, options: any) {
  const context = {
    root: root,
    nodeTransforms: options.nodeTransforms || [],
  };
  return context;
}

function traverseNode(node: any, context: any) {
  const nodeTransforms = context.nodeTransforms;
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i];
    transform(node);
  }
  traverseChildren(node, context);
}

function traverseChildren(node: any, context: any) {
  const children = node.children;

  if (children) {
    for (let i = 0; i < children.length; i++) {
      traverseNode(children[i], context);
    }
  }
}
