import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "../shared/ShapeFlags";
import { Fragment, Text } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity";
import { EMPTY_OBJ } from "../shared";

export function createRenderer(options: any) {
  // 结构出来用户传入的渲染函数
  const { createElement, patchProp, insert, remove, setElementText } = options;

  function render(vnode: any, container: any) {
    patch(null, vnode, container, null, null);
  }

  // n1: 旧的虚拟节点，n2: 新的虚拟节点
  function patch(
    n1: any,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 处理组件
    // 标识判断是什么类型的节点
    // Fragment 只渲染children

    const { type, shapeFlag } = n2;

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor);
        }
        break;
    }
  }

  function processFragment(
    n1,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    mountChildren(n2.children, container, parentComponent, anchor);
  }

  function processText(n1, n2: any, container: any) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processElement(
    n1,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  function patchElement(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor: any
  ) {
    // 获取新旧props
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    // 获取el
    const el = (n2.el = n1.el);
    // 更新children
    patchChildren(n1, n2, el, parentComponent, anchor);
    // 更新props
    patchProps(el, oldProps, newProps);
  }

  function patchChildren(
    n1: any,
    n2: any,
    container: any,
    parentComponent,
    anchor: any
  ) {
    const { children: c1, shapeFlag: prevShapeFlag } = n1;
    const { shapeFlag, children: c2 } = n2;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //   // 1.把老的children清空
      //   unmountChildren(n1);
      //   // 2.设置新的text
      //   setElementText(container, children);
      // } else {
      //   // 新旧节点都是text，不相同时直接改变
      //   if(c1 !== children) {
      //     setElementText(container, children);
      //   }
      // }
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(n1.children);
      }
      // 无论是新旧节点都是text还是text与数组对比，都是不相同时直接改变
      if (c1 !== c2) {
        setElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 原本是Text，新的是数组
        setElementText(container, "");
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // 原本是数组，新的也是数组,需要使用diff算法
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    // i: 表示当前遍历的索引位置，用于在循环中逐个比较新老节点数组中对应位置的节点。
    //e1: 表示老节点的结束索引
    //e2: 表示新节点的结束索引
    let l2 = c2.length;
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;

    function isSomeVnodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 对比左侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];

      if (isSomeVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }

      i++;
    }

    // 右侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];

      if (isSomeVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }

      e1--;
      e2--;
    }

    // 新的比老的多
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 老的比新的多
      while (i <= e1) {
        remove(c1[i].el);
        i++;
      }
    } else {
      // 乱序部分,对比中间
      // s1是对比左边相同的部分后第一个不同的地方
      let s1 = i;
      let s2 = i;

      // 记录patch的次数
      let patched = 0;
      // 记录需要patch的次数，超过证明剩下的节点可以直接删除
      let toBePatched = e2 - i + 1;
      // 创建映射表
      const keyToNewIndexMap = new Map();
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
      // 记录是否有节点移动
      let moved = false;
      let maxNewIndexSoFar = 0;

      // 使用新的虚拟节点树将不同的节点添加到映射表中
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];

        if (patched >= toBePatched) {
          remove(prevChild.el);
          continue;
        }

        let newIndex = 0;
        if (prevChild.key !== null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (let j = s2; j < e2; j++) {
            if (isSomeVnodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        if (newIndex === undefined) {
          remove(prevChild.el);
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }

          // 保证有新的节点
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      let j = increasingNewIndexSequence.length - 1;
      // 正序排列不好排顺序，所以倒序排列
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;

        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            insert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }

  function unmountChildren(children: any) {
    for (let i = 0; i < children.length; i++) {
      remove(children[i].el);
    }
  }

  function patchProps(el, oldProps, newProps) {
    if (newProps === oldProps) return;
    for (const key in newProps) {
      const prev = oldProps[key];
      const next = newProps[key];

      if (prev !== next) {
        patchProp(el, key, prev, next);
      }
    }

    if (oldProps !== EMPTY_OBJ) {
      for (const key in oldProps) {
        if (!(key in newProps)) {
          patchProp(el, key, oldProps[key], null);
        }
      }
    }
  }

  function processComponent(
    n1,
    n2: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    mountComponent(n2, container, parentComponent, anchor);
  }

  function mountElement(
    vnode: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 不管是dom还是canvas，都应该正确创建
    const el = (vnode.el = createElement(vnode.type));

    const { children, shapeFlag } = vnode;
    // 传来的可能是数组
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // text_children
      setElementText(el, children);
    } else if (ShapeFlags.ARRAY_CHILDREN) {
      // array_children
      mountChildren(children, el, parentComponent, anchor);
    }

    // props
    const { props } = vnode;
    for (let key in props) {
      const val = props[key];

      // 处理属性
      patchProp(el, key, null, val);
    }
    // 添加
    insert(el, container, anchor);
  }

  function mountChildren(
    children: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    children.forEach((child) => {
      patch(null, child, container, parentComponent, anchor);
    });
  }

  // 挂载节点
  function mountComponent(
    initialVnode: any,
    container: any,
    parentComponent: any,
    anchor: any
  ) {
    // 创建实例对象
    const instance = createComponentInstance(initialVnode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container, anchor);
  }

  function setupRenderEffect(
    instance: any,
    initialVnode: any,
    container: any,
    anchor: any
  ) {
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

        patch(null, subTree, container, instance, anchor);

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
        patch(prevsubTree, subTree, container, instance, anchor);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}

// 最长递增子序列
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
