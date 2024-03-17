import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "../shared/ShapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";

export function createRender(options: any) {
  // 结构出来用户传入的渲染函数
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;

  function render(vnode: any, container: any) {
    patch(vnode, container, null);
  }

  function patch(vnode: any, container: any, parentComponent: any) {
    // 处理组件
    // 标识判断是什么类型的节点
    // Fragment 只渲染children

    const { type, shapeFlag } = vnode;

    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(vnode: any, container: any, parentComponent: any) {
    mountChildren(vnode, container, parentComponent);
  }

  function processText(vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(vnode: any, container: any, parentComponent: any) {
    mountElement(vnode, container, parentComponent);
  }

  function mountElement(vnode: any, container: any, parentComponent: any) {
    // 不管是dom还是canvas，都应该正确创建
    const el = (vnode.el = hostCreateElement(vnode.type));

    const { children, shapeFlag } = vnode;
    // 传来的可能是数组
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // text_children
      el.textContent = children;
    } else if (ShapeFlags.ARRAY_CHILDREN) {
      // array_children
      mountChildren(vnode, el, parentComponent);
    }

    // props
    const { props } = vnode;
    for (let key in props) {
      const val = props[key];

      // 处理属性
      hostPatchProp(el, key, val);

      // 添加
      hostInsert(el, container);
    }

    container.append(el);
  }

  function mountChildren(vnode: any, container: any, parentComponent: any) {
    vnode.children.forEach((child) => {
      patch(child, container, parentComponent);
    });
  }

  function processComponent(vnode: any, container: any, parentComponent: any) {
    mountComponent(vnode, container, parentComponent);
  }

  // 挂载节点
  function mountComponent(
    initialVnode: any,
    container: any,
    parentComponent: any
  ) {
    // 创建实例对象
    const instance = createComponentInstance(initialVnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
  }

  function setupRenderEffect(instance: any, initialVnode: any, container: any) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);

    // vnode -> patch
    // vnode -> element -> mountElement

    patch(subTree, container, instance);

    // element -> mount
    initialVnode.el = subTree.el;
  }

  return {
    createApp: createAppAPI(render),
  };
}
