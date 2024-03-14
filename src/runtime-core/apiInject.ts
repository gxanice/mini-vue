import { getCurrentInstance } from "./component";

export function provide(key: any, value: any) {
  const currentInstance = getCurrentInstance();

  if (currentInstance) {
    let { provides } = currentInstance;
    const parentProvides = currentInstance.parent?.provides;
    // 只有在初始化的时候才改写原型链，而不是每次调用provide
    // 当前实例的provides属性指向父实例的provides属性，只有初始化之前才相等
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

export function inject(key: any, defaultValue: any) {
  const currentIntance = getCurrentInstance();

  if (currentIntance) {
    const parentProvides = currentIntance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') { 
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
