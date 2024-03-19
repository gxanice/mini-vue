import { createRenderer } from "../runtime-core/index";

function createElement(type: any) {
  return document.createElement(type);
}

function patchProps(el: any, key: any, val: any) {
  // 判断是否是事件
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  }
  el.setAttribute(key, val);
}

function insert(el: any, parent: any) {
  parent.append(el);
}

const renderer: any = createRenderer({
  createElement,
  patchProps,
  insert,
});

export function createApp(...args: any[]) {
  return renderer.createApp(...args);
}

export * from "../runtime-core";
