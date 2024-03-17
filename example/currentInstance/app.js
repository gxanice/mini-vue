import { h, getCurrentInstance } from "../../lib/mini-vue.esm.js";
import { Foo } from "./foo.js";


export const App = {
  name: "APP",
  render() {
    return h("div", {}, [h("p", {}, "currentInstance Demo"), h(Foo)]);
  },
  setup() {
    const instance = getCurrentInstance();
    console.log("App", instance);
  },
};
