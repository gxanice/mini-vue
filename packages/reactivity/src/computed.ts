import { ReactiveEffect } from "./effect";

class computedRefImpl {
  private _getter: any;
  private _dirty: Boolean = true;
  private _value: any;
  private _effect: any

  constructor(getter: any) {
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
      this._value = this._effect.run()
    }

    return this._value;
  }
}

export function computed(getter: any) {
  return new computedRefImpl(getter);
}
