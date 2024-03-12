import { createVNode } from "../vnode"

export function renderSlots(slots:any){
    return createVNode("div",{},slots)
}