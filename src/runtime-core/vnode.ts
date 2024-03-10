export function createVNode(type: any, props?: any, children?: any) {
    const vnode: any = {
        type,
        props,
        children
    }

    return vnode;
}