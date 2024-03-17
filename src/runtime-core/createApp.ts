import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent: any) {
    return {
      mount(rootContainer) {
        // 先转换虚拟节点
        // 后续操作根据虚拟节点来操作
        const vnode = createVNode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  };
}
