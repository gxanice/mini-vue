import {
  handlerReactive,
  handlerReadonly,
  handlersReadonlyShallow,
} from "./baseHandlers";

import { isObject } from "../shared/index";

export const enum reactiveFlags{
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = "__v_isShallow",
}

export function reactive(raw: any) {
  return createReactiveObject(raw, handlerReactive);
}

export function readonly(raw: any) {
  return createReactiveObject(raw, handlerReadonly);
}

export function shallowReadonly(raw: any) { 
  return createReactiveObject(raw, handlersReadonlyShallow);
}

export function isReactive(value:any) {
  return !!(value && value[reactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value:any) {
  return !!(value && value[reactiveFlags.IS_READONLY]);
}

export function isProxy(value:any) {
  return isReactive(value) || isReadonly(value);
}

function createReactiveObject(traget, baseHandlers) {
  if (!isObject(traget)) { 
    console.warn(`target ${traget} 必须是一个对象`);
    return traget;
  }
  return new Proxy(traget, baseHandlers);
}