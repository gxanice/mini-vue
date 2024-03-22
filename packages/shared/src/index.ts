export const extend = Object.assign;

export const EMPTY_OBJ = {};

// 判断是否为对象
export const isObject = (val: any) => {
  return val !== null && typeof val === "object";
};

// 判断对象是否相等
export const hasChange = (val: any, newVal: any) => {
  // Object.is() 方法判断两个值是否是相同的值
  // 如果两个值相等，则不需要改变，故取反
  return !Object.is(val, newVal);
};

// 判断对象是否有某个属性
export const hasOwn = (target: any, key: any) => {
  return Object.prototype.hasOwnProperty.call(target, key);
};

// 将时间转化为大写的绑定事件形式
export const toHandlerKey = (str: string) => {
  return str ? "on" + capitalioze(str) : "";
};

const capitalioze = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// 将驼峰形式转化为绑定事件的形式
export const camelize = (str: any) => {
  return str.replace(/-(\w)/, (_: string, c: string) => {
    return c ? c.toUpperCase() : "";
  });
};

export {ShapeFlags} from './ShapeFlags'