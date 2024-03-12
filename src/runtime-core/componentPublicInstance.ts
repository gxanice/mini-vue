import { hasOwn } from "../shared/index";

const publicPropertiesMap = {
  $el: (i) => i.vnode.el, // 获取组件的根DOM元素
  $slots: (i) => i.slots, // 获取组件的插槽
};

export const pubilcInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // 从setupState中获取值
    const { setupState, props } = instance;
    // if (key in setupState) {
    //   return setupState[key];
    // }

    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
