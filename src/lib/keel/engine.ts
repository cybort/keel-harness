import type { Character, Choice } from "./types";
import { modelLabel } from "./catalog";

export type Asked = { question: string; options: Choice[] };

const CRASH: Asked = {
  question: "单个插件崩溃时，脊桥怎么处置？",
  options: [
    { id: "restart", label: "原地重启", detail: "只重启该进程。会话、其它插件、模型都保持。" },
    { id: "detach", label: "摘掉引用", detail: "会话继续，但失去这个工具。进程停在故障。" },
    { id: "reboot", label: "整桥重启", detail: "所有会话的工具调用中断。这是要避免的路径。" },
  ],
};

const PERMISSION: Asked = {
  question: "这个角色的工具权限怎么落？",
  options: [
    { id: "ask", label: "每步询问", detail: "每次调用都要你点头。选择本身写成指令。" },
    { id: "read", label: "只读放行", detail: "读放行，写和外部调用仍询问。" },
    { id: "allow", label: "全部放行", detail: "不再拦。交接时必须写明这是你的选择。" },
  ],
};

const EXPORT_SCOPE: Asked = {
  question: "交接时带上什么？",
  options: [
    { id: "decided", label: "只带已决", detail: "问题和全部可选项、选择。不含闲聊。" },
    { id: "brief", label: "已决加未决", detail: "再加约束和下一步。给人读的 handoff。" },
    { id: "full", label: "全量 checkpoint", detail: "事件、角色时间线、插件引用、未提交探针。" },
  ],
};

const NEXT_CUT: Asked = {
  question: "下一步切哪一刀？",
  options: [
    { id: "bridge", label: "只动脊桥", detail: "共享进程，不碰模型，不新建会话。" },
    { id: "shadow", label: "只跑探针", detail: "候选模型先答一轮。你写入之前不调用 setModel。" },
    { id: "freeze", label: "先导出再动", detail: "checkpoint 落地之后才改角色或模型。" },
  ],
};

export function forcedQuestion(character: Character): Asked {
  if (character.posture === "allow") return EXPORT_SCOPE;
  if (character.posture === "deny") return NEXT_CUT;
  return PERMISSION;
}

export function decisionFor(text: string, character: Character): Asked | null {
  if (/崩溃|故障|挂了|无响应/.test(text)) return CRASH;
  if (/权限|允许|批准|询问/.test(text)) return PERMISSION;
  if (/导出|交接|handoff|checkpoint/i.test(text)) return EXPORT_SCOPE;
  if (/选项|哪一|哪个|还是|选一|方案/.test(text)) return forcedQuestion(character);
  return null;
}

export function answerTurn(args: {
  character: Character;
  modelId: string;
  text: string;
  pluginNames: string[];
}): { assistant: string; tool: boolean; decision: Asked | null } {
  const label = modelLabel(args.modelId);
  const bridge = args.pluginNames.length
    ? `这一跳经脊桥共享进程：${args.pluginNames.join("、")}。不为这个会话另起一份。`
    : "此会话没有挂插件，脊桥不会为它起进程。";
  const clip = args.text.replace(/\s+/g, " ").trim().slice(0, 42);
  let assistant: string;
  if (args.character.posture === "deny") {
    assistant = `下一步只做一件事：把「${clip}」留在当前会话里处理。\n${bridge}\n模型仍是 ${label}。探针写入之前，不调用 setModel，也不重启运行时。`;
  } else if (args.character.posture === "allow") {
    assistant = `已记下指令：「${clip}」。\n已决和未决分开写。选过的问题会连同全部可选项成为用户指令，不进工具结果。\n${bridge}`;
  } else {
    assistant = `边界先于动作。「${clip}」先收成可选项，不直接改运行时。\n${bridge}\n当前模型 ${label}，角色 ${args.character.name}。热切换角色不会换模型。`;
  }
  return {
    assistant,
    tool: args.pluginNames.length > 0,
    decision: decisionFor(args.text, args.character),
  };
}

export function probeLine(modelId: string, subject: string): string {
  const s = subject.replace(/\s+/g, " ").trim().slice(0, 36) || "当前会话";
  switch (modelId) {
    case "copilot-fusion":
      return `Fusion 把「${s}」拆开：机械步骤交给轻模型，判断留在此会话。这是探针，setModel 还没调用。`;
    case "gpt-5.4":
      return `已决：历史和工具绑定保持。风险：现在走 /model 会把 CLI 挂死。下一步：你确认之后才把「${s}」交给本模型。`;
    case "claude-sonnet-4.6":
      return `先不改会话进程。探针复述「${s}」，并建议提交前看一眼还没选的选项。模型切换尚未写入。`;
    case "gpt-5-mini":
      return `「${s}」。探针短答。未切换，未重启。`;
    default:
      return `直接说：「${s}」继续由当前会话扛着。探针未写入，运行时不重启。`;
  }
}
