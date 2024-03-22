import { h, provide, inject } from "../../lib/mini-vue.esm.js";

export const App = {
  name: "APP",
  render() {
    return h("div", {}, [h("p", {}, "Provide"), h(ProvideTwo)]);
  },
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
};

const ProvideTwo = {
  name: "ProvideTwo",
  setup() {
    provide("foo", "fooVal2");
    const foo = inject("foo");

    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `ProvideTwo foo ${this.foo}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz","bazDefault");
    const baw = inject("baz", () => "bawDefault");

    return {
      foo,
      bar,
      baz,
      baw
    };
  },

  render() {
    return h("div", {}, `Consumer: - ${this.foo} - ${this.bar} - ${this.baz} - ${this.baw}`);
  },
};
