import { pubilcInstanceProxyHandlers } from "./componentPublicInstance";
import { initProps } from "./componentProps";
import { initSlots } from "./componentSlots";
import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { proxyRefs } from "../reactivity/ref";

// 创建组件实例
export function createComponentInstance(vnode: any, parent: any) {
  // 根据虚拟节点（vnode）创建一个组件实例对象
  const component = {
    vnode, // 组件的虚拟节点
    type: vnode.type, // 组件的类型（可以是组件选项对象）
    setupState: {},
    props: {}, // 组件的props
    slots: {}, // 组件的插槽
    provides: parent ? parent.provides : {}, // 组件提供的数据
    parent,
    isMounted: false, //判断是不是初始化
    subTree: {}, // 子树
    emit: () => {}, // 传递的函数
  };

  component.emit = emit.bind(null, component) as any; // 将emit函数绑定到组件实例上
  return component; // 返回创建的组件实例
}

// 设置组件实例，包括初始化props、slots等，以及调用setup函数
export function setupComponent(instance: any) {
  // 初始化props与slots
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);

  // 初始化有状态组件
  setupStatefulComponent(instance);
}

// 初始化有状态的组件
function setupStatefulComponent(instance: any) {
  const component = instance.type; // 获取组件选项对象

  const { setup } = component;

  // 上下文对象
  instance.proxy = new Proxy(
    {
      _: instance,
    },
    pubilcInstanceProxyHandlers
  );

  if (setup) {
    setCurrentInstance(instance); // 设置当前组件实例
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit, // 将emit函数传递给setup函数
    });

    setCurrentInstance(null); // 清空当前组件实例

    // 处理setup函数的返回结果
    handleSetupResult(instance, setupResult);
  }
}

// 处理setup函数的返回结果
function handleSetupResult(instance: any, setupResult: any) {
  // 判断setup函数的返回结果类型
  if (typeof setupResult === "object") {
    // 如果返回的是一个对象，则将该对象作为组件的状态保存到实例中
    instance.setupState = proxyRefs(setupResult);
  }

  // 完成组件的设置过程，包括确定组件的render函数
  finishComponentSetup(instance);
}

// 完成组件的设置过程
function finishComponentSetup(instance: any) {
  const component = instance.type; // 获取组件选项对象

  // 如果组件选项中提供了render函数，则将其赋值给实例的render属性
  // 这样，后续渲染过程中就可以调用这个render函数来生成虚拟DOM
  instance.render = component.render;
}

let currentInstance: any = null;
export function getCurrentInstance() {
  return currentInstance;
}

export function setCurrentInstance(instance: any) {
  currentInstance = instance;
}
