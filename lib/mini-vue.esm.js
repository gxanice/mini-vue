function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children
    };
    return vnode;
}

// 判断是否为对象
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el, // 获取组件的根DOM元素
};
const pubilcInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // 从setupState中获取值
        const { setupState } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

// 创建组件实例
function createComponentInstance(vnode) {
    // 根据虚拟节点（vnode）创建一个组件实例对象
    const component = {
        vnode, // 组件的虚拟节点
        type: vnode.type, // 组件的类型（可以是组件选项对象）
        setupState: {},
    };
    return component; // 返回创建的组件实例
}
// 设置组件实例，包括初始化props、slots等，以及调用setup函数
function setupComponent(instance) {
    // TODO
    // initProps()
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
        const setupResult = setup();
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
    // TODO 判断vnode是不是一个element
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const el = (vnode.el = document.createElement(vnode.type));
    const { children } = vnode;
    // 传来的可能是数组
    if (typeof children === "string") {
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        mountChildren(children, el);
    }
    // props
    const { props } = vnode;
    for (let key in props) {
        const val = props[key];
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

export { createApp, h };
