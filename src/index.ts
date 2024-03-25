export * from "./runtime-dom/index";
import { registerRuntimeCompiler } from "./runtime-dom";

import { baseCompile } from "./compiler-core/src";
import * as runtimeDom from "./runtime-dom";

function compileToFunction(template: string) {
  const { code } = baseCompile(template);

  const render = new Function("Vue", code)(runtimeDom);

  return render;
}


registerRuntimeCompiler(compileToFunction)
