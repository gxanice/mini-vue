import { computed } from '../computed'
import { reactive } from '../reactive'
import {vi} from 'vitest'

describe("computed", () => {
    it("happy path", () => {
        // 缓存功能
        const user = reactive({ age: 1 })

        const age = computed(() => { 
            return user.age
        })

        expect(age.value).toBe(1)
    })

    it("should compute lazily", () => { 
        const value = reactive({ foo: 1 })
        const getter = vi.fn(() => {
          return value.foo;
        });

        const cValue = computed(getter)
        // 验证懒执行
        expect(getter).not.toHaveBeenCalled()
        expect(cValue.value).toBe(1)
        expect(getter).toHaveBeenCalled()

        // 验证是否调用一次
        cValue.value
        expect(getter).toHaveBeenCalledTimes(1)

        // 响应式改变，再执行一次 
        value.foo = 2
        expect(getter).toHaveBeenCalledTimes(1)

        expect(cValue.value).toBe(2)
        expect(getter).toHaveBeenCalledTimes(2)
    })
})