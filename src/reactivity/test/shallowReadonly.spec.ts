import { isReadonly, shallowReadonly } from "../reactive";

describe("shallowReadonly", () => {
  // 测试shallowReadonly(只能使内部的第一层变为响应式)
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReadonly(props)).toBe(true);
    expect(isReadonly(props.n)).toBe(false);
  });

  // set失败,因为target是readonly
  it("warn then call set", () => {
    console.warn = jest.fn();

    const user = shallowReadonly({
      age: 10,
    });

    user.age = 10;
    expect(console.warn).toBeCalled();
  });
});
