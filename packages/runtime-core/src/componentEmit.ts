import { toHandlerKey, camelize } from "@mini-vue/shared";

export function emit(instance: any, event: any, ...args) {
    console.log("emit", event);
    
    // debugger;

  // 从props上获取事件名称
  const { props } = instance;

  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}
