import { handlerReactive, handlerReadonly } from "./baseHandlers";

export const enum reactiveFlags{
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw: any) {
  return createReactiveObject(raw, handlerReactive);
}

export function readonly(raw: any) {
  return createReactiveObject(raw, handlerReadonly);
}

export function isReactive(value:any) {
  return !!(value && value[reactiveFlags.IS_REACTIVE]);
}

export function isReadonly(value:any) {
  return !!(value && value[reactiveFlags.IS_READONLY]);
}

function createReactiveObject(traget, baseHandlers) {
  return new Proxy(traget, baseHandlers);
}