import { createRenderer } from "../runtime-core/index";

function createElement(type: any) {
  return document.createElement(type);
}

function patchProp(el: any, key: any, prevVal: any, nextVal: any) {
  // 判断是否是事件
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    // 为空或者undefined时，移除属性
    if (nextVal === null || nextVal === undefined) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(child: any, parent: any, anchor: any) {
  parent.insertBefore(child, anchor || null);
}

function remove(el: any) {
  const parent = el.parentNode;
  if (parent) {
    parent.removeChild(el);
  }
}

function setElementText(el: any, text: any) {
  el.textContent = text;
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
});

export function createApp(...args: any[]) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
