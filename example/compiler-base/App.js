import {ref} from "../../lib/mini-vue.esm.js"

// export default {
//   template: `<div>hi,{{msg}}</div>`,
//   setup() {
//     return {
//       msg: "vue3 - compiler",
//     };
//   },
// };

// 复杂一点
export default {
  template: `<div>hi,{{count}}</div>`,
  setup() {
    const count = (window.count = ref(1));
    return {
      count,
    };
  },
};
