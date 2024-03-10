const publicPropertiesMap = {
  $el:(i) => i.vnode.el, // 获取组件的根DOM元素
}


export const pubilcInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // 从setupState中获取值
    const { setupState } = instance;
    if (key in setupState) {
      return setupState[key];
    }

    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
