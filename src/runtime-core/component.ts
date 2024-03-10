import { pubilcInstanceProxyHandlers } from "./ccomponentPublicInstance";
import { render } from "./renderer";

// 创建组件实例
export function createComponentInstance(vnode: any) {
  // 根据虚拟节点（vnode）创建一个组件实例对象
  const component = {
    vnode, // 组件的虚拟节点
    type: vnode.type, // 组件的类型（可以是组件选项对象）
    setupState: {},
  };

  return component; // 返回创建的组件实例
}

// 设置组件实例，包括初始化props、slots等，以及调用setup函数
export function setupComponent(instance: any) {
  // TODO
  // initProps()
  // initSlots()

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
    const setupResult = setup();

    // 处理setup函数的返回结果
    handleSetupResult(instance, setupResult);
  }
}

// 处理setup函数的返回结果
function handleSetupResult(instance: any, setupResult: any) {
  // 判断setup函数的返回结果类型
  if (typeof setupResult === "object") {
    // 如果返回的是一个对象，则将该对象作为组件的状态保存到实例中
    instance.setupState = setupResult;
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
