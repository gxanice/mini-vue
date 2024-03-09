export const extend = Object.assign;

// 判断是否为对象
export const isObject = (val: any) => {
    return val !== null && typeof val === 'object';
}

// 判断对象是否相等
export const hasChange = (val: any, newVal: any) => { 
    // Object.is() 方法判断两个值是否是相同的值
    // 如果两个值相等，则不需要改变，故取反
    return !Object.is(val, newVal)
}