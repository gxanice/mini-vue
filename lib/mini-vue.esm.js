const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type), // 通过type类型来判断是什么类型的节点
        el: null,
    };
    //children
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 是组件并且children是对象
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const EMPTY_OBJ = {};
// 判断是否为对象
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
// 判断对象是否相等
const hasChange = (val, newVal) => {
    // Object.is() 方法判断两个值是否是相同的值
    // 如果两个值相等，则不需要改变，故取反
    return !Object.is(val, newVal);
};
// 判断对象是否有某个属性
const hasOwn = (target, key) => {
    return Object.prototype.hasOwnProperty.call(target, key);
};
// 将时间转化为大写的绑定事件形式
const toHandlerKey = (str) => {
    return str ? "on" + capitalioze(str) : "";
};
const capitalioze = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
// 将驼峰形式转化为绑定事件的形式
const camelize = (str) => {
    return str.replace(/-(\w)/, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el, // 获取组件的根DOM元素
    $slots: (i) => i.slots, // 获取组件的插槽
};
const pubilcInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // 从setupState中获取值
        const { setupState, props } = instance;
        // if (key in setupState) {
        //   return setupState[key];
        // }
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

// 引入一个辅助函数`extend`，用于合并对象
let activeEffect; // 当前实例对象
let shouldTrack; // 是否应该追踪依赖
// 定义响应式效果的类
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = []; // 此效果依赖的所有属性集合
        this.isActive = true; // 标记此效果是否活跃（即是否在监听变化）
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
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => dep.delete(effect)); // 从每个依赖的集合中移除此效果
    effect.deps.length = 0;
}
// 全局的目标映射，用于存储每个对象及其属性的依赖关系
const targetMap = new Map();
// 追踪依赖，即将当前效果添加到目标对象属性的依赖集合中
function track(target, key) {
    if (!isTracking())
        return;
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
function trackEffect(dep) {
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect); // 将当前激活的效果添加到依赖集合
        activeEffect.deps.push(dep); // 同时将此依赖集合添加到效果的依赖列表，用于后续清理
    }
}
// 判断是否正在追踪依赖
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
// 触发更新，即当目标对象的属性值改变时，执行所有依赖于此属性的效果
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    let dep = depsMap.get(key);
    if (!dep)
        return;
    triggerEffect(dep); // 执行所有依赖此属性的效果
}
function triggerEffect(dep) {
    dep.forEach((effect) => {
        // 遍历依赖此属性的所有效果
        if (effect.scheduler) {
            effect.scheduler(); // 如果效果有调度器，则调用调度器
        }
        else {
            effect.run(); // 否则，直接运行效果
        }
    });
}
// 创建一个响应式效果
function effect(fn, option = {}) {
    const _effect = new ReactiveEffect(fn, option.scheduler);
    extend(_effect, option); // 使用extend函数合并选项到效果实例
    _effect.run(); // 首次执行封装的函数
    const runner = _effect.run.bind(_effect); // 创建一个运行器函数，用于手动重新执行效果
    runner.effect = _effect; // 将效果实例附加到运行器上，便于访问
    return runner; // 返回运行器
}
// 停止一个响应式效果
function stop(runner) {
    runner.effect.stop(); // 调用效果的stop方法停止监听
}

const get = createGet();
const set = createSet();
const readonlyGet = createGet(true);
const readonlyShallowGet = createGet(true, true);
// 封装get方法
function createGet(isReadOnly = false, isShallow = false) {
    return function get(target, key) {
        const res = Reflect.get(target, key);
        // 判断key值
        if (key == "__v_isReactive" /* reactiveFlags.IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key == "__v_isReadonly" /* reactiveFlags.IS_READONLY */) {
            return isReadOnly;
        }
        // 如果是shallow
        if (isShallow) {
            return res;
        }
        // 查看res是不是object
        if (isObject(res)) {
            return isReadOnly ? readonly(res) : reactive(res);
        }
        if (!isReadOnly) {
            // 依赖收集
            track(target, key);
        }
        return res;
    };
}
// 封装set方法
function createSet() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 触发依赖
        trigger(target, key);
        return res;
    };
}
const handlerReactive = extend({}, { get, set });
const handlerReadonly = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn("set失败,因为target是readonly");
        return true;
    },
};
const handlersReadonlyShallow = extend({}, handlerReadonly, {
    get: readonlyShallowGet,
});

function reactive(raw) {
    return createReactiveObject(raw, handlerReactive);
}
function readonly(raw) {
    return createReactiveObject(raw, handlerReadonly);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, handlersReadonlyShallow);
}
function isReactive(value) {
    return !!(value && value["__v_isReactive" /* reactiveFlags.IS_REACTIVE */]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* reactiveFlags.IS_READONLY */]);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function createReactiveObject(traget, baseHandlers) {
    if (!isObject(traget)) {
        console.warn(`target ${traget} 必须是一个对象`);
        return traget;
    }
    return new Proxy(traget, baseHandlers);
}

function emit(instance, event, ...args) {
    console.log("emit", event);
    // debugger;
    // 从props上获取事件名称
    const { props } = instance;
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

class RefImpl {
    constructor(value) {
        // 判断传来的数据
        this._rawValue = value;
        this._value = isObject(value) ? reactive(value) : value;
        this._dep = new Set();
        this._v_isRef = true;
    }
    get value() {
        // 收集依赖
        refTrackEffect(this._dep);
        return this._value;
    }
    set value(newValue) {
        if (hasChange(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = isObject(newValue) ? reactive(newValue) : newValue;
            // 触发依赖
            triggerEffect(this._dep);
        }
    }
}
function refTrackEffect(dep) {
    // 判断是否为空
    if (isTracking()) {
        // 收集依赖
        trackEffect(dep);
    }
}
function ref(val) {
    return new RefImpl(val);
}
function isRef(val) {
    return !!val._v_isRef;
}
function unRef(val) {
    // 判断是否为Ref对象,进行数值返回
    return isRef(val) ? val.value : val;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            // 判断是否为Ref对象,根据结果返回ref值或者是直接返回值
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

// 创建组件实例
function createComponentInstance(vnode, parent) {
    // 根据虚拟节点（vnode）创建一个组件实例对象
    const component = {
        vnode, // 组件的虚拟节点
        type: vnode.type, // 组件的类型（可以是组件选项对象）
        setupState: {},
        props: {}, // 组件的props
        slots: {}, // 组件的插槽
        provides: parent ? parent.provides : {}, // 组件提供的数据
        parent,
        isMounted: false, //判断是不是初始化
        subTree: {}, // 子树
        emit: () => { }, // 传递的函数
    };
    component.emit = emit.bind(null, component); // 将emit函数绑定到组件实例上
    return component; // 返回创建的组件实例
}
// 设置组件实例，包括初始化props、slots等，以及调用setup函数
function setupComponent(instance) {
    // 初始化props与slots
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    // 初始化有状态组件
    setupStatefulComponent(instance);
}
// 初始化有状态的组件
function setupStatefulComponent(instance) {
    const component = instance.type; // 获取组件选项对象
    const { setup } = component;
    // 上下文对象
    instance.proxy = new Proxy({
        _: instance,
    }, pubilcInstanceProxyHandlers);
    if (setup) {
        setCurrentInstance(instance); // 设置当前组件实例
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit, // 将emit函数传递给setup函数
        });
        setCurrentInstance(null); // 清空当前组件实例
        // 处理setup函数的返回结果
        handleSetupResult(instance, setupResult);
    }
}
// 处理setup函数的返回结果
function handleSetupResult(instance, setupResult) {
    // 判断setup函数的返回结果类型
    if (typeof setupResult === "object") {
        // 如果返回的是一个对象，则将该对象作为组件的状态保存到实例中
        instance.setupState = proxyRefs(setupResult);
    }
    // 完成组件的设置过程，包括确定组件的render函数
    finishComponentSetup(instance);
}
// 完成组件的设置过程
function finishComponentSetup(instance) {
    const component = instance.type; // 获取组件选项对象
    // 如果组件选项中提供了render函数，则将其赋值给实例的render属性
    // 这样，后续渲染过程中就可以调用这个render函数来生成虚拟DOM
    instance.render = component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 只有在初始化的时候才改写原型链，而不是每次调用provide
        // 当前实例的provides属性指向父实例的provides属性，只有初始化之前才相等
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentIntance = getCurrentInstance();
    if (currentIntance) {
        const parentProvides = currentIntance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先转换虚拟节点
                // 后续操作根据虚拟节点来操作
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

class computedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this._getter = getter;
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new computedRefImpl(getter);
}

function createRenderer(options) {
    // 结构出来用户传入的渲染函数
    const { createElement, patchProp, insert } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
    }
    // n1: 旧的虚拟节点，n2: 新的虚拟节点
    function patch(n1, n2, container, parentComponent) {
        // 处理组件
        // 标识判断是什么类型的节点
        // Fragment 只渲染children
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        }
        else {
            patchElement(n1, n2);
        }
    }
    function patchElement(n1, n2, container) {
        // 获取新旧props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 获取el
        const el = (n2.el = n1.el);
        patchProps(el, oldProps, newProps);
    }
    function patchProps(el, oldProps, newProps) {
        if (newProps === oldProps)
            return;
        for (const key in newProps) {
            const prev = oldProps[key];
            const next = newProps[key];
            if (prev !== next) {
                patchProp(el, key, prev, next);
            }
        }
        if (oldProps !== EMPTY_OBJ) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    patchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountElement(vnode, container, parentComponent) {
        // 不管是dom还是canvas，都应该正确创建
        const el = (vnode.el = createElement(vnode.type));
        const { children, shapeFlag } = vnode;
        // 传来的可能是数组
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // text_children
            el.textContent = children;
        }
        else {
            // array_children
            mountChildren(vnode, el, parentComponent);
        }
        // props
        const { props } = vnode;
        for (let key in props) {
            const val = props[key];
            // 处理属性
            patchProp(el, key, null, val);
            // 添加
            insert(el, container);
        }
        container.append(el);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((child) => {
            patch(null, child, container, parentComponent);
        });
    }
    // 挂载节点
    function mountComponent(initialVnode, container, parentComponent) {
        // 创建实例对象
        const instance = createComponentInstance(initialVnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container);
    }
    function setupRenderEffect(instance, initialVnode, container) {
        effect(() => {
            // 判断是更新还是初始化
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                // 存储上一次的虚拟节点树
                const subTree = (instance.subTree = instance.render.call(proxy));
                console.log(subTree);
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance);
                // element -> mount
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log("update");
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                // 获取上一次的虚拟节点树
                const prevsubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevsubTree, subTree, container, instance);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    // 判断是否是事件
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 为空或者undefined时，移除属性
        if (nextVal === null || nextVal === undefined) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { ReactiveEffect, computed, createApp, createRenderer, createTextNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, provide, proxyRefs, reactive, readonly, ref, renderSlots, shallowReadonly, stop, unRef };
