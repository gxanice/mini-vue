import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./foo.js";

export const App = {
  name: "APP",
  render() {
    // return h(
    //   "div",
    //   {
    //     id: "root",
    //     class: ["red", "hard"],
    //     // onClick() {
    //     //   console.log("click");
    //     // },
    //     // onMousedown() {
    //     //   console.log("mousedown");
    //     // },
    //   },
    //   [h("div", {}, "hi," + this.msg), h(Foo, { count: 1 })]
    // );

    return h("div", {}, [
      h("div", {}, "App"),
      h(Foo, {
        onAdd(a,b) {
          console.log("onAdd",a,b);
        },
        onAddFoo(a,b){
          console.log("ADDFOO",a,b)
        }
      }),
    ]);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
