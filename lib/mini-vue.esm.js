const queue = [];
let isFlushPending = false;
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null, // 组件实例
        shapeFlag: getShapeFlag(type), // 通过type类型来判断是什么类型的节点
        key: (props && props.key) || null, // key
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
        if (typeof children === "object") {
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

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
// 判断是否为对象
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
// 判断是否是字符串
const isString = (val) => {
    return typeof val === "string";
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
    $props: (i) => i.props, // 获取组件的props
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
        next: null, // 下一个要更新的节点
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
    if (compiler && !component.render) {
        if (component.template) {
            component.render = compiler(component.template);
        }
    }
    instance.render = component.render;
}
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
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

function shouldUpdateComponent(prevVnode, nextVnode) {
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVnode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createRenderer(options) {
    // 结构出来用户传入的渲染函数
    const { createElement, patchProp, insert, remove, setElementText } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    // n1: 旧的虚拟节点，n2: 新的虚拟节点
    function patch(n1, n2, container, parentComponent, anchor) {
        // 处理组件
        // 标识判断是什么类型的节点
        // Fragment 只渲染children
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        // 获取新旧props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        // 获取el
        const el = (n2.el = n1.el);
        // 更新children
        patchChildren(n1, n2, el, parentComponent, anchor);
        // 更新props
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const { children: c1, shapeFlag: prevShapeFlag } = n1;
        const { shapeFlag, children: c2 } = n2;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            //   // 1.把老的children清空
            //   unmountChildren(n1);
            //   // 2.设置新的text
            //   setElementText(container, children);
            // } else {
            //   // 新旧节点都是text，不相同时直接改变
            //   if(c1 !== children) {
            //     setElementText(container, children);
            //   }
            // }
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(n1.children);
            }
            // 无论是新旧节点都是text还是text与数组对比，都是不相同时直接改变
            if (c1 !== c2) {
                setElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 原本是Text，新的是数组
                setElementText(container, "");
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 原本是数组，新的也是数组,需要使用diff算法
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        // i: 表示当前遍历的索引位置，用于在循环中逐个比较新老节点数组中对应位置的节点。
        //e1: 表示老节点的结束索引
        //e2: 表示新节点的结束索引
        let l2 = c2.length;
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        function isSomeVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 对比左侧
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 右侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVnodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 新的比老的多
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 老的比新的多
            while (i <= e1) {
                remove(c1[i].el);
                i++;
            }
        }
        else {
            // 乱序部分,对比中间
            // s1是对比左边相同的部分后第一个不同的地方
            let s1 = i;
            let s2 = i;
            // 记录patch的次数
            let patched = 0;
            // 记录需要patch的次数，超过证明剩下的节点可以直接删除
            let toBePatched = e2 - i + 1;
            // 创建映射表
            const keyToNewIndexMap = new Map();
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            // 记录是否有节点移动
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 使用新的虚拟节点树将不同的节点添加到映射表中
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    remove(prevChild.el);
                    continue;
                }
                let newIndex = 0;
                if (prevChild.key !== null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        if (isSomeVnodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    remove(prevChild.el);
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 保证有新的节点
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            let j = increasingNewIndexSequence.length - 1;
            // 正序排列不好排顺序，所以倒序排列
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        insert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            remove(children[i].el);
        }
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
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            n2.vnode = n2;
        }
    }
    // 挂载节点
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        // 创建实例对象
        const instance = (initialVnode.component = createComponentInstance(initialVnode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // 不管是dom还是canvas，都应该正确创建
        const el = (vnode.el = createElement(vnode.type));
        const { children, shapeFlag } = vnode;
        // 传来的可能是数组
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // text_children
            setElementText(el, children);
        }
        else {
            // array_children
            mountChildren(children, el, parentComponent, anchor);
        }
        // props
        const { props } = vnode;
        for (let key in props) {
            const val = props[key];
            // 处理属性
            patchProp(el, key, null, val);
        }
        // 添加
        insert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((child) => {
            patch(null, child, container, parentComponent, anchor);
        });
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        instance.update = effect(() => {
            // 判断是更新还是初始化
            if (!instance.isMounted) {
                const { proxy } = instance;
                // 存储上一次的虚拟节点树
                const subTree = (instance.subTree = instance.render.call(proxy, proxy));
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance, anchor);
                // element -> mount
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 需要更新前的vnode
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                // 获取上一次的虚拟节点树
                const prevsubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevsubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVnode) {
    // 更新实例对象上的props与虚拟节点
    instance.vnode = nextVnode;
    instance.next = null;
    instance.props = nextVnode.props;
}
// 最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
}
function remove(el) {
    const parent = el.parentNode;
    if (parent) {
        parent.removeChild(el);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ReactiveEffect: ReactiveEffect,
    computed: computed,
    createApp: createApp,
    createElementVnode: createVNode,
    createRenderer: createRenderer,
    createTextNode: createTextNode,
    effect: effect,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isRef: isRef,
    nextTick: nextTick,
    provide: provide,
    proxyRefs: proxyRefs,
    reactive: reactive,
    readonly: readonly,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    shallowReadonly: shallowReadonly,
    stop: stop,
    toDisplayString: toDisplayString,
    unRef: unRef
});

const TO_DISPLAY_STRING = Symbol("toDisplayString");
const CREATE_ELEMENT_VNODE = Symbol("createElementVnode");
const helpNames = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVnode",
};

function generate(ast) {
    const context = createCodeGenContext();
    const { push } = context;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"];
    const signature = args.join(",");
    push(`function ${functionName}(${signature}){`);
    push("return ");
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code,
    };
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinging = "Vue";
    const aliasHelps = (s) => `${helpNames[s]}:_${helpNames[s]}`;
    if (ast.helpers.length > 0) {
        push(`const {${ast.helpers.map(aliasHelps).join(", ")}} = ${VueBinging}`);
    }
    push("\n");
    push("return ");
}
function createCodeGenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helpNames[key]}`;
        },
    };
    return context;
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            // text 类型
            genText(context, node);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(context, node);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(context, node);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(context, node);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(context, node);
            break;
    }
}
function genCompoundExpression(context, node) {
    const { children } = node;
    const { push } = context;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(context, node) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    // 将未确认的值都改为null
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(",");
        }
    }
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genText(context, node) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(context, node) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genExpression(context, node) {
    const { push } = context;
    push(`${node.content}`);
}

// baseParse 函数是解析器的入口点，接收一个模板字符串 content 作为输入
function baseParse(content) {
    // 创建解析上下文
    const context = createParserContext(content);
    // 解析子节点，并创建一个根节点
    return createRoot(parseChildren(context, []));
}
// parseChildren 函数负责解析所有子节点
function parseChildren(context, ancestors) {
    // 初始化节点数组
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        let s = context.source;
        // 如果当前上下文的源码以 "{{" 开始，则解析为插值表达式
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        else {
            node = parseText(context);
        }
        // 将解析得到的节点添加到节点数组中
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    let s = context.source;
    // 遇到结束标签
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // source 有值
    return !s;
}
function parseText(context) {
    let endIndex = context.source.length;
    let endTokens = ["{{", "<"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    // 获取content
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content: content,
    };
}
function parseTextData(context, length) {
    let content = context.source.slice(0, length);
    advanceBy(context, length);
    return content;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* TagType.START */);
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    // 解析结束标签
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.END */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}}`);
    }
    // 解析tag
    return element;
}
function startsWithEndTagOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 删除处理完成的代码
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    if (type === 1 /* TagType.END */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
// parseInterpolation 函数用于解析插值表达式
function parseInterpolation(context) {
    // 定义插值的开闭标记
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    // 计算开闭标记的长度
    const openDelimiterLength = openDelimiter.length;
    const closeDelimiterLength = closeDelimiter.length;
    // 查找闭标记的索引
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiterLength);
    // 前进到插值内容的开始位置
    advanceBy(context, openDelimiterLength);
    // 计算插值内容的长度，并提取出来
    const rawContentLength = closeIndex - openDelimiterLength;
    const content = parseTextData(context, rawContentLength).trim();
    // 前进到插值表达式之后的位置
    advanceBy(context, closeDelimiterLength);
    // 返回一个表示插值表达式的节点对象
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content,
        },
    };
}
// advanceBy 函数用于前进指定长度的字符，更新解析上下文中的源码字符串
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
// createRoot 函数用于创建一个根节点，包含所有解析出的子节点
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
// createParserContext 函数用于创建解析上下文，初始化源码字符串
function createParserContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    // 创建上下文对象
    const context = createTransformContext(root, options);
    // 深度优先搜索dps
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}
function createTransformContext(root, options) {
    const context = {
        root: root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        },
    };
    return context;
}
function traverseNode(node, context) {
    // 执行插件
    const nodeTransforms = context.nodeTransforms;
    // 收集执行的插件,退出后反过来执行
    let exitFns = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        const onExit = transform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    // 判断是否是插值
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        traverseNode(children[i], context);
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag: tag,
        props: props,
        children: children,
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // 中间处理层
            // tag
            const vnodeTag = `"${node.tag}"`;
            // props
            let vnodeProps;
            // children
            const children = node.children;
            let vnodeChildren = children[0];
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        const rawContent = node.content.content;
        node.content.content = "_ctx." + rawContent;
    }
}

function isText(node) {
    return node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            // 创建容器
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child],
                                };
                            }
                            currentContainer.children.push(" + ");
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });
    return generate(ast);
}

function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { ReactiveEffect, computed, createApp, createVNode as createElementVnode, createRenderer, createTextNode, effect, getCurrentInstance, h, inject, isProxy, isReactive, isReadonly, isRef, nextTick, provide, proxyRefs, reactive, readonly, ref, registerRuntimeCompiler, renderSlots, shallowReadonly, stop, toDisplayString, unRef };
