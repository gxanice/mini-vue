import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformElement } from "../src/transforms/transformElement";
import { transformExpression } from "../src/transforms/transformExpression";

describe("interpolation module", () => {
  it("string", () => {
    const ast = baseParse("hi");
    transform(ast);

    const { code } = generate(ast);
    // 快照测试
    expect(code).toMatchSnapshot();
  });

  it("interpolation", () => {
    const ast = baseParse("{{message}}");
    transform(ast, {
      nodeTransforms: [transformExpression],
    });

    const { code } = generate(ast);
    // 快照测试
    expect(code).toMatchSnapshot();
  });

  it("element", () => {
    const ast = baseParse("<div></div>");
    transform(ast, {
      nodeTransforms: [transformElement],
    });

    const { code } = generate(ast);
    // 快照测试
    expect(code).toMatchSnapshot();
  });
});