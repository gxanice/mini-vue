import { CREATE_ELEMENT_VNODE } from "./runtimeHelper";

export const enum NodeTypes {
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT,
  ROOT,
  COMPOUND_EXPRESSION,
}

export function createVNodeCall(context: any, tag: any, props: any, children: any) {
  context.helper(CREATE_ELEMENT_VNODE);
  
  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
    props: props,
    children: children,
  };
}
