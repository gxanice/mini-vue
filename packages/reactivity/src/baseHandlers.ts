import { track, trigger } from "./effect";
import { reactiveFlags, reactive, readonly } from "./reactive";
import { extend, isObject } from "@mini-vue/shared";

const get = createGet();
const set = createSet();
const readonlyGet = createGet(true);
const readonlyShallowGet = createGet(true, true);

// 封装get方法
function createGet(isReadOnly: Boolean = false, isShallow: Boolean = false) {
  return function get(target: any, key: any) {
    const res = Reflect.get(target, key);

    // 判断key值
    if (key == reactiveFlags.IS_REACTIVE) {
      return !isReadOnly;
    } else if (key == reactiveFlags.IS_READONLY) {
      return isReadOnly;
    }

    // 如果是shallow
    if (isShallow) {
      return res;
    }

    // 查看res是不是object
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res);
    }

    if (!isReadOnly) {
      // 依赖收集
      track(target, key);
    }
    return res;
  };
}

// 封装set方法
function createSet() {
  return function set(target: any, key: any, value: any) {
    const res = Reflect.set(target, key, value);
    // 触发依赖
    trigger(target, key);
    return res;
  };
}

export const handlerReactive = extend({}, { get, set });

export const handlerReadonly = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn("set失败,因为target是readonly");
    return true;
  },
};

export const handlersReadonlyShallow = extend({}, handlerReadonly, {
  get: readonlyShallowGet,
});
