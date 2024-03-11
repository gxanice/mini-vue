'use strict';

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
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

const extend = Object.assign;
// 判断是否为对象
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
// 判断对象是否有某个属性
const hasOwn = (target, key) => {
    return Object.prototype.hasOwnProperty.call(target, key);
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el, // 获取组件的根DOM元素
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

// 创建组件实例
function createComponentInstance(vnode) {
    // 根据虚拟节点（vnode）创建一个组件实例对象
    const component = {
        vnode, // 组件的虚拟节点
        type: vnode.type, // 组件的类型（可以是组件选项对象）
        setupState: {},
        props: {}, // 组件的props
    };
    return component; // 返回创建的组件实例
}
// 设置组件实例，包括初始化props、slots等，以及调用setup函数
function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    // initSlots()
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
        const setupResult = setup(shallowReadonly(instance.props));
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

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    // 处理组件
    // 标识判断是什么类型的节点
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    const { children, shapeFlag } = vnode;
    // 传来的可能是数组
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        // text_children
        el.textContent = children;
    }
    else {
        // array_children
        mountChildren(children, el);
    }
    // props
    const { props } = vnode;
    for (let key in props) {
        const val = props[key];
        // 判断是否是事件
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.forEach((child) => {
        patch(child, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
// 挂载节点
function mountComponent(initialVnode, container) {
    // 创建实例对象
    const instance = createComponentInstance(initialVnode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
}
function setupRenderEffect(instance, initialVnode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    // element -> mount
    initialVnode.el = subTree.el;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先转换虚拟节点
            // 后续操作根据虚拟节点来操作
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;
