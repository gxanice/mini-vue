import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "../shared/ShapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity";

export function createRenderer(options: any) {
  // 结构出来用户传入的渲染函数
  const { createElement, patchProps, insert } = options;

  function render(vnode: any, container: any) {
    patch(null,vnode, container, null);
  }

  // n1: 旧的虚拟节点，n2: 新的虚拟节点
  function patch(n1: any, n2: any, container: any, parentComponent: any) {
    // 处理组件
    // 标识判断是什么类型的节点
    // Fragment 只渲染children

    const { type, shapeFlag } = n2;

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(n1, n2: any, container: any, parentComponent: any) {
    mountChildren(n2, container, parentComponent);
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(n1, n2: any, container: any, parentComponent: any) {
    if (!n1) {
       mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
   
  }

  function patchElement(n1, n2: any, container: any) { 
    
  }

  function processComponent(n1, n2: any, container: any, parentComponent: any) {
    mountComponent(n2, container, parentComponent);
  }

  function mountElement(vnode: any, container: any, parentComponent: any) {
    // 不管是dom还是canvas，都应该正确创建
    const el = (vnode.el = createElement(vnode.type));

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
      patchProps(el, key, val);

      // 添加
      insert(el, container);
    }

    container.append(el);
  }

  function mountChildren(vnode: any, container: any, parentComponent: any) {
    vnode.children.forEach((child) => {
      patch(null,child, container, parentComponent);
    });
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
    effect(() => {
      // 判断是更新还是初始化
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        // 存储上一次的虚拟节点树
        const subTree = (instance.subTree = instance.render.call(proxy));

        console.log(subTree);

        // vnode -> patch
        // vnode -> element -> mountElement

        patch(null,subTree, container, instance);

        // element -> mount
        initialVnode.el = subTree.el;

        instance.isMounted = true;
      } else {
        console.log("update");
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // 获取上一次的虚拟节点树
        const prevsubTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevsubTree,subTree, container, instance);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
