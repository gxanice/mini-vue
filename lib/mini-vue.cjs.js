'use strict';

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
// 判断是否为对象
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
// 判断对象是否有某个属性
const hasOwn = (target, key) => {
    return Object.prototype.hasOwnProperty.call(target, key);
};
// 将时间转化为大写的绑定事件形式
const toHandlerKey = (str) => {
    return str ? 'on' + capitalioze(str) : "";
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
// 全局的目标映射，用于存储每个对象及其属性的依赖关系
const targetMap = new Map();
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
        instance.setupState = setupResult;
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

function createRender(options) {
    // 结构出来用户传入的渲染函数
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
    function render(vnode, container) {
        patch(vnode, container, null);
    }
    function patch(vnode, container, parentComponent) {
        // 处理组件
        // 标识判断是什么类型的节点
        // Fragment 只渲染children
        const { type, shapeFlag } = vnode;
        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                processText(vnode, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(vnode, container, parentComponent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(vnode, container, parentComponent);
                }
                break;
        }
    }
    function processFragment(vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent);
    }
    function processText(vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processElement(vnode, container, parentComponent) {
        mountElement(vnode, container, parentComponent);
    }
    function mountElement(vnode, container, parentComponent) {
        // 不管是dom还是canvas，都应该正确创建
        const el = (vnode.el = hostCreateElement(vnode.type));
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
            hostPatchProp(el, key, val);
            // 添加
            hostInsert(el, container);
        }
        container.append(el);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((child) => {
            patch(child, container, parentComponent);
        });
    }
    function processComponent(vnode, container, parentComponent) {
        mountComponent(vnode, container, parentComponent);
    }
    // 挂载节点
    function mountComponent(initialVnode, container, parentComponent) {
        // 创建实例对象
        const instance = createComponentInstance(initialVnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container);
    }
    function setupRenderEffect(instance, initialVnode, container) {
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // vnode -> patch
        // vnode -> element -> mountElement
        patch(subTree, container, instance);
        // element -> mount
        initialVnode.el = subTree.el;
    }
    return {
        createApp: createAppAPI(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProps(el, key, val) {
    // 判断是否是事件
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    el.setAttribute(key, val);
}
function insert(el, parent) {
    parent.append(el);
}
const renderer = createRender({
    createElement,
    patchProps,
    insert,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRender = createRender;
exports.createTextNode = createTextNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.renderSlots = renderSlots;
