import { createRender } from "../../lib/mini-vue.esm.js";
import { App } from "./App.js";
console.log(PIXI);

// 创建PIXI应用实例
const game = new PIXI.Application();
await game.init({ width: 600, height: 600 });

// 将PIXI应用的视图（canvas元素）添加到文档中
document.body.append(game.canvas);

// 自定义渲染器配置
const renderer = createRender({
  createElement(type) {
    if (type === "rect") {
      const rect = new PIXI.Graphics();
      rect.beginFill(0xff3300);
      rect.drawRect(0, 0, 100, 100);
      rect.endFill();
      return rect;
    }
  },
  patchProp(el, key, val) {
    el[key] = val;
  },
  insert(el, parent) {
    parent.addChild(el);
  },
});

// 创建并挂载mini-vue应用
renderer.createApp(App).mount(game.stage);
