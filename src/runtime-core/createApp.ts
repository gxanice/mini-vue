import { createVNode } from "./vnode";
import { render } from "./renderer";

export function createApp(rootComponent: any) {
  return {
    mount(rootContainer) {
      // 先转换虚拟节点
      // 后续操作根据虚拟节点来操作
      const vnode = createVNode(rootComponent);

      render(vnode, rootComponent);
    },
  };
}
