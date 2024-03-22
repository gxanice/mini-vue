import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // 包含 src 下的 test 文件夹中的所有测试文件
    include: ["src/**/test/**/*.spec.{js,ts}"],
    // 排除 packages 目录
    exclude: ["packages/**/*", "node_modules"],
    globals: true,
  },
  resolve: {
    // 如果你有需要特定解析的配置，可以在这里添加
  },
});
