import { NodeTypes } from "./ast";
import { TO_DISPLAY_STRING, helpNames } from "./runtimeHelper";

export function generate(ast: any) {
  const context = createCodeGenContext();
  const { push } = context;

  genFunctionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache", "$props", "$setup", "$data", "$options"];
  const signature = args.join(",");

  push(`function ${functionName}(${signature}){`);
  push("return ");

  genNode(ast.codegenNode, context);
  push("}");
  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast: any, context: any) {
  const { push } = context;
  const VueBinging = "Vue";
  const aliasHelps = (s) => `${helpNames[s]}:_${helpNames[s]}`;
  if (ast.helpers.length > 0) {
    push(`const {${ast.helpers.map(aliasHelps).join(", ")}} = ${VueBinging}`);
  }
  push("\n");
  push("return ");
}

function createCodeGenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
    helper(key: any) {
      return `_${helpNames[key]}`;
    },
  };

  return context;
}

function genNode(node: any, context: any) {
  switch (node.type) {
    case NodeTypes.TEXT:
      // text 类型
      genText(context, node);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(context, node);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(context, node);
      break;
    default:
      break;
  }
}
function genText(context: any, node: any) {
  const { push } = context;
  push(`'${node.content}'`);
}

function genInterpolation(context: any, node: any) {
  const { push,helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(")");
}

function genExpression(context: any, node: any) {
  const { push } = context;
  push(`${node.content}`);
}
