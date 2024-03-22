import { h, createTextNode } from "../../lib/mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  name: "App",
  render() {
    const app = h("div", {}, "App");
    // 具名插槽
    // const foo = h(
    //   Foo,
    //   {},
    //   {
    //     header: h("p", {}, "header"),
    //     footer: h("p", {}, "footer"),
    //   }
    // );
    // 作用域插槽
    const foo = h(
      Foo,
      {},
      {
        header: ({ age }) => [
          h("p", {}, "header" + age),
          createTextNode("你好呀"),
        ],
        footer: () => h("p", {}, "footer"),
      }
    );

    return h("div", {}, [app, foo]);
  },
  setup() {
    return {};
  },
};
