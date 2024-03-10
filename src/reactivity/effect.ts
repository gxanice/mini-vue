// 引入一个辅助函数`extend`，用于合并对象
import { extend } from "../shared/index";

let activeEffect; // 当前实例对象
let shouldTrack; // 是否应该追踪依赖

// 定义响应式效果的类
export class ReactiveEffect {
  private _fn: any; // 被封装的原始函数
  public scheduler: Function | undefined; // 可选的调度器函数，用于控制何时触发效果
  deps: any[] = []; // 此效果依赖的所有属性集合
  isActive = true; // 标记此效果是否活跃（即是否在监听变化）
  onStop?: () => void; // 当停止效果时调用的回调函数

  constructor(fn: any, scheduler?: Function) {
    this._fn = fn; // 初始化时，保存传入的函数
    this.scheduler = scheduler; // 保存可选的调度器
  }

  // 执行封装的函数，并设置当前激活的效果为此实例
  run() {
    if (!this.isActive) {
      return this._fn();
    }

    shouldTrack = true;
    activeEffect = this;

    return this._fn(); // 执行函数
  }

  // 停止此效果的响应式监听
  stop() {
    shouldTrack = false; // 关闭追踪
    if (this.isActive) {
      // 防止多次停止
      cleanupEffect(this); // 清除此效果的所有依赖
      if (this.onStop) {
        this.onStop(); // 如果有设置停止时的回调，则调用
      }
      this.isActive = false; // 标记为非活跃状态
    }
  }
}

// 清除一个效果的所有依赖
function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep: any) => dep.delete(effect)); // 从每个依赖的集合中移除此效果
  effect.deps.length = 0;
}

// 全局的目标映射，用于存储每个对象及其属性的依赖关系
const targetMap = new Map();

// 追踪依赖，即将当前效果添加到目标对象属性的依赖集合中
export function track(target, key) {
  if (!isTracking()) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  trackEffect(dep); // 将当前激活的效果添加到依赖集合
}

export function trackEffect(dep: any) {
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect); // 将当前激活的效果添加到依赖集合
    activeEffect.deps.push(dep); // 同时将此依赖集合添加到效果的依赖列表，用于后续清理
  }
}

// 判断是否正在追踪依赖
export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

// 触发更新，即当目标对象的属性值改变时，执行所有依赖于此属性的效果
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) return;
  let dep = depsMap.get(key);
  if (!dep) return;

  triggerEffect(dep); // 执行所有依赖此属性的效果
}

export function triggerEffect(dep: any) {
  dep.forEach((effect) => {
    // 遍历依赖此属性的所有效果
    if (effect.scheduler) {
      effect.scheduler(); // 如果效果有调度器，则调用调度器
    } else {
      effect.run(); // 否则，直接运行效果
    }
  });
}

// 创建一个响应式效果
export function effect(fn: any, option: any = {}) {
  const _effect = new ReactiveEffect(fn, option.scheduler);
  extend(_effect, option); // 使用extend函数合并选项到效果实例

  _effect.run(); // 首次执行封装的函数

  const runner: any = _effect.run.bind(_effect); // 创建一个运行器函数，用于手动重新执行效果
  runner.effect = _effect; // 将效果实例附加到运行器上，便于访问

  return runner; // 返回运行器
}

// 停止一个响应式效果
export function stop(runner: any) {
  runner.effect.stop(); // 调用效果的stop方法停止监听
}
