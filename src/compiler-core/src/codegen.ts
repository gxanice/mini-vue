export function generate(ast: any) {
  const context = createCodeGenContext();
  const { push } = context;
  push("return ");

  const functionName = "render";
  const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"];
  const signature = args.join(",");

  push(`function ${functionName}(${signature}){`);
  push("return ");
  genNode(ast, context);

  push("}");
  return {
    code: context.code,
  };
}

function createCodeGenContext() {
  const context = {
    code: "",
    push(source) {
      this.code += source;
    },
  };

  return context;
}

function genNode(node: any, context: any) {
  const { push } = context;
  push(`'${node.content}'`);
}
