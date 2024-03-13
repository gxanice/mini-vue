import { ShapeFlags } from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export function createVNode(type: any, props?: any, children?: any) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type), // 通过type类型来判断是什么类型的节点
    el: null,
  };

  //children
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  // 是组件并且children是对象
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) { 
    if(typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode;
}


export function createTextNode(text: string) {
  return createVNode(Text, {}, text)
}

function getShapeFlag(type: any) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
