import { track, trigger } from "./effect";
import { reactiveFlags, readonly } from './reactive';

const get = handlerGet();
const set = handlerSet();
const readonlyGet = handlerGet(true);

// 封装get方法
function handlerGet(isReadOnly = false) {
  return function get(target: any, key: any) {
      const res = Reflect.get(target, key);
      
      // 判断key值
      if (key == reactiveFlags.IS_REACTIVE) { 
          return !isReadOnly
      } else if (key == reactiveFlags.IS_READONLY) {
          return isReadOnly;
      }

    if (!isReadOnly) {
      // 依赖收集
      track(target, key);
    }
    return res;
  };
}

// 封装set方法
function handlerSet() {
  return function set(target: any, key: any, value: any) {
    const res = Reflect.set(target, key, value);
    // 触发依赖
    trigger(target, key);
    return res;
  };
}

export const handlerReactive = {
  get,
  set,
};

export const handlerReadonly = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn('set失败,因为target是readonly');
    return true;
  },
};
