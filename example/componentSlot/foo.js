import { h, renderSlots } from "../../lib/mini-vue.esm.js";

export const Foo = {
  setup(props) {
    return {};
  },

  render() {
    const foo = h("p", {}, "foo");
    console.log(this.$slots);
    // 使用插槽实现添加子节点
    // 获取到要渲染的元素，获取到要渲染的位置
    return h("div", {}, [foo, renderSlots(this.$slots)]);
  },
};
