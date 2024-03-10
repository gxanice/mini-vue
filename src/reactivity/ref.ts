import { hasChange, isObject } from "../shared/index"
import { isTracking, trackEffect, triggerEffect } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value: any;
  private _rawValue: any;
  public _dep: any;
  // 标记是否为Ref对象
  public _v_isRef: boolean;
  constructor(value: any) {
    // 判断传来的数据
    this._rawValue = value;
    this._value = isObject(value) ? reactive(value) : value;
    this._dep = new Set();
    this._v_isRef = true;
  }
  get value() {
    // 收集依赖
    refTrackEffect(this._dep);
    return this._value;
  }
  set value(newValue) {
    if (hasChange(this._rawValue, newValue)) {
      this._rawValue = newValue;
      this._value = isObject(newValue) ? reactive(newValue) : newValue;
      // 触发依赖
      triggerEffect(this._dep);
    }
  }
}

export function refTrackEffect(dep: any) {
  // 判断是否为空
  if (isTracking()) {
    // 收集依赖
    trackEffect(dep);
  }
}

export function ref(val: any) {
  return new RefImpl(val);
}

export function isRef(val: any) {
  return !!val._v_isRef;
}

export function unRef(val: any) {
  // 判断是否为Ref对象,进行数值返回
  return isRef(val) ? val.value : val;
}

export function proxyRefs(objectWithRefs: any) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // 判断是否为Ref对象,根据结果返回ref值或者是直接返回值
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
