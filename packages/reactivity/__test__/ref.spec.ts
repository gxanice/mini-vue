import { effect } from "../src/effect";
import { ref, isRef, unRef, proxyRefs } from "../src/ref";
import { reactive } from "../src/reactive";

describe("ref", () => {
  it("happy path", () => {
    const a = ref(1);
    expect(a.value).toBe(1);
  });

  it("should be reactive", () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(dummy).toBe(1);
    expect(calls).toBe(1);
    a.value = 2;
    expect(dummy).toBe(2);
    expect(calls).toBe(2);
    //相同属性不能触发
    a.value = 2;
    expect(dummy).toBe(2);
    expect(calls).toBe(2);
  });

  it("should make nested properties reactive", () => {
    const a = ref({
      count: 1,
    });
    let dummy;
    effect(() => {
      dummy = a.value.count;
    });
    expect(dummy).toBe(1);
    a.value.count = 2;
    expect(dummy).toBe(2);
  });

  it("isRef", () => {
    const a = ref(1);
    const user = reactive({
      age: 1,
    });
    expect(isRef(a)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef({ value: 0 })).toBe(false);
    expect(isRef(user.age)).toBe(false);
  });

  it("unRef", () => {
    const a = ref(1);
    expect(unRef(a)).toBe(1);
    expect(unRef(1)).toBe(1);
  });

  it("proxyRefs", () => {
    const user = {
      age: ref(1),
      name: ref({
        first: "xiaoming",
        last: "wang",
      }),
    };

    const proxyUser = proxyRefs(user);
    expect(user.age.value).toBe(1);
    expect(proxyUser.age).toBe(1);
    expect(proxyUser.name.first).toBe("xiaoming");
    expect(proxyUser.name).toEqual({
      first: "xiaoming",
      last: "wang",
    });

    proxyUser.age = 10;
    expect(proxyUser.age).toBe(10);
    expect(user.age.value).toBe(10);

    proxyUser.age = ref(20);
    expect(proxyUser.age).toBe(20);
    expect(user.age.value).toBe(20);
  });
});
