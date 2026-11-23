import { MODELS, modelLabel } from "./catalog";
import type { Character, Choice, ContextBlock, Plugin, Session, TranscriptEvent } from "./types";
import { zipStore, type ZipEntry } from "./zip";

export function decisionText(question: string, options: Choice[], selectedId: string): string {
  const chosen = options.find((option) => option.id === selectedId);
  return [
    `问题：${question}`,
    "可选项：",
    ...options.map((option) => `- ${option.label}：${option.detail}`),
    `选择：${chosen ? chosen.label : selectedId}`,
  ].join("\n");
}

export function contextBlocks(session: Session): ContextBlock[] {
  const blocks: ContextBlock[] = [];
  for (const event of session.events) {
    if (event.kind === "instruction") {
      blocks.push({
        eventId: event.id,
        role: "user",
        weight: "instruction",
        kind: "instruction",
        text: event.text,
      });
    } else if (event.kind === "decision" && event.selectedId) {
      blocks.push({
        eventId: event.id,
        role: "user",
        weight: "instruction",
        kind: "decision",
        text: decisionText(event.question, event.options, event.selectedId),
      });
    } else if (event.kind === "handoff") {
      blocks.push({
        eventId: event.id,
        role: "user",
        weight: "instruction",
        kind: "handoff",
        text: event.text,
      });
    } else if (event.kind === "assistant") {
      blocks.push({
        eventId: event.id,
        role: "assistant",
        weight: "instruction",
        kind: "assistant",
        text: event.text,
      });
    }
  }
  return blocks;
}

export function openDecisions(session: Session): TranscriptEvent[] {
  return session.events.filter((event) => event.kind === "decision" && !event.selectedId);
}

function characterOf(characters: Character[], id: string): Character | undefined {
  return characters.find((character) => character.id === id);
}

export function handoffMarkdown(args: {
  session: Session;
  characters: Character[];
  target?: Character;
}): string {
  const source = characterOf(args.characters, args.session.characterId);
  const target = args.target ?? source;
  const decided = args.session.events.filter(
    (event): event is Extract<TranscriptEvent, { kind: "decision" }> =>
      event.kind === "decision" && Boolean(event.selectedId),
  );
  const pending = args.session.events.filter(
    (event): event is Extract<TranscriptEvent, { kind: "decision" }> =>
      event.kind === "decision" && !event.selectedId,
  );
  const instructions = args.session.events.filter(
    (event): event is Extract<TranscriptEvent, { kind: "instruction" }> => event.kind === "instruction",
  );
  const lastAssistant = [...args.session.events]
    .reverse()
    .find((event) => event.kind === "assistant");
  const decidedBlock = decided.length
    ? decided
        .map((event) => decisionText(event.question, event.options, event.selectedId!))
        .join("\n\n")
    : "（无）";
  const pendingBlock = pending.length
    ? pending.map((event) => `- ${event.question}`).join("\n")
    : "（无）";
  const instructionBlock = instructions.length
    ? instructions.map((event) => `- ${event.text}`).join("\n")
    : "（无）";
  return [
    "# Handoff",
    "",
    `源会话：${args.session.title}（${args.session.id}）`,
    `源角色：${source?.name ?? args.session.characterId}`,
    `源模型：${modelLabel(args.session.modelId)}`,
    `目标角色：${target?.name ?? "未指定"}`,
    `目标模型：${modelLabel(target?.defaultModel ?? args.session.modelId)}`,
    "",
    "## 目标",
    instructions[0]?.text ?? args.session.title,
    "",
    "## 已决",
    "每条都包含问题、全部可选项和选择，与直接指令同级。",
    "",
    decidedBlock,
    "",
    "## 未决",
    pendingBlock,
    "",
    "## 直接指令",
    instructionBlock,
    "",
    "## 约束",
    "- 插件经脊桥共享，不按会话起进程。",
    "- 模型只在影子探针写入之后切换。未提交的探针不算数。",
    "- 角色热切换不新建会话。分叉才用这份 handoff 当第一条用户指令。",
    "",
    "## 下一步",
    lastAssistant && lastAssistant.kind === "assistant" ? lastAssistant.text : "（尚无模型回复）",
    "",
  ].join("\n");
}

export function checkpointDocument(args: {
  session: Session;
  characters: Character[];
  plugins: Plugin[];
}) {
  const character = characterOf(args.characters, args.session.characterId) ?? null;
  const attached = args.plugins.filter((plugin) => args.session.pluginIds.includes(plugin.id));
  return {
    keel: 1,
    kind: "checkpoint",
    exportedAt: new Date().toISOString(),
    session: {
      id: args.session.id,
      title: args.session.title,
      parentId: args.session.parentId ?? null,
      model: { id: args.session.modelId, label: modelLabel(args.session.modelId) },
      character,
      plugins: attached.map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        transport: plugin.transport,
        command: plugin.command,
      })),
      timeline: args.session.timeline,
      events: args.session.events,
      shadow: args.session.shadow
        ? { ...args.session.shadow, committed: false }
        : null,
    },
    context: contextBlocks(args.session),
    openDecisions: openDecisions(args.session),
    note: "context 里 role=user 的 instruction、decision、handoff 同级。tool 与 system 不在 context 中。未提交探针不在 context 中。",
  };
}

export function bridgeMath(plugins: Plugin[], sessions: Session[]) {
  const live = plugins.filter((plugin) => plugin.status !== "stopped").length;
  const mounts = sessions.reduce((sum, session) => sum + session.pluginIds.length, 0);
  return {
    supervisor: 1,
    live,
    processes: 1 + live,
    mounts,
    avoided: Math.max(0, mounts - live),
  };
}

const DECISION_SCHEMA = {
  $id: "https://keel.local/schemas/decision.schema.json",
  keel: 1,
  title: "Decision",
  description: "选项卡的问题、全部可选项和选择。选定后与直接用户指令同级。",
  type: "object",
  required: ["kind", "role", "weight", "question", "options", "selectedId", "text"],
  properties: {
    kind: { const: "decision" },
    role: { const: "user" },
    weight: { const: "instruction" },
    question: { type: "string" },
    options: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: ["id", "label", "detail"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    selectedId: { type: "string" },
    text: {
      type: "string",
      description: "送进模型的正文，含问题、全部可选项和选择。通道与打字指令相同。",
    },
  },
};

const CHARACTER_SCHEMA = {
  $id: "https://keel.local/schemas/character.schema.json",
  keel: 1,
  title: "Character",
  description: "Harness overlay。热切换不重建 session。分叉才新建 session。",
  type: "object",
  required: ["keel", "kind", "id", "name", "identity", "tone", "posture", "defaultModel"],
  properties: {
    keel: { const: 1 },
    kind: { const: "character" },
    id: { type: "string" },
    name: { type: "string" },
    epithet: { type: "string" },
    identity: { type: "string" },
    tone: { type: "string" },
    posture: { enum: ["ask", "allow", "deny"] },
    defaultModel: { type: "string" },
  },
};

const CHECKPOINT_SCHEMA = {
  $id: "https://keel.local/schemas/checkpoint.schema.json",
  keel: 1,
  title: "Checkpoint",
  description: "可恢复的会话快照。SDK 协议不提供导出，由 harness 持有。",
  type: "object",
  required: ["keel", "kind", "session", "context"],
  properties: {
    keel: { const: 1 },
    kind: { const: "checkpoint" },
    session: { type: "object" },
    context: { type: "array" },
    openDecisions: { type: "array" },
  },
};

const HANDOFF_SCHEMA = {
  $id: "https://keel.local/schemas/handoff.schema.json",
  keel: 1,
  title: "Handoff",
  description: "压缩简报。分叉角色时作为新会话的第一条 user 指令。",
  type: "object",
  required: ["keel", "kind", "role", "weight", "markdown"],
  properties: {
    keel: { const: 1 },
    kind: { const: "handoff" },
    role: { const: "user" },
    weight: { const: "instruction" },
    sourceSessionId: { type: "string" },
    markdown: { type: "string" },
  },
};

const BRIDGE_PROTOCOL = {
  keel: 1,
  kind: "bridge.protocol",
  supervisor: "single-process",
  rule: "进程数 = 1 个监督进程 + 运行中的插件数。会话只持有 pluginId。",
  messages: [
    {
      type: "bridge.attach",
      effect: "引用 +1。仅当该插件没有进程时才懒启动。",
    },
    {
      type: "bridge.detach",
      effect: "引用 -1。进程留下，直到 reap。",
    },
    {
      type: "bridge.call",
      effect: "打到共享进程。不为这个会话另起子进程。",
    },
    {
      type: "bridge.fault",
      effect: "只重启故障插件。会话、其它插件、模型保持。",
    },
    {
      type: "bridge.reap",
      effect: "停掉引用为 0 的进程。",
    },
  ],
};

export const SCHEMAS: { id: string; title: string; body: unknown }[] = [
  { id: "bridge", title: "bridge.protocol", body: BRIDGE_PROTOCOL },
  { id: "decision", title: "decision.schema", body: DECISION_SCHEMA },
  { id: "checkpoint", title: "checkpoint.schema", body: CHECKPOINT_SCHEMA },
  { id: "handoff", title: "handoff.schema", body: HANDOFF_SCHEMA },
  { id: "character", title: "character.schema", body: CHARACTER_SCHEMA },
];

const README = `# KEEL 协议包

KEEL 放在 Copilot SDK 2.0 前面。SDK 已经能在一个 runtime 里开很多 session，也能 session.setModel()。它还没做这四件事：

1. 跨 session 共享 MCP / 插件进程。ACP 的 session/new 仍会各自带上 mcpServers。
2. 影子切换。setModel 立刻生效；CLI 的 /model 在 BYOK 和无响应时会把会话挂死。
3. 选项卡。问题、全部可选项和选择要变成 user turn，而不是工具边角或权限回执。
4. 导出。SDK 协议没有 checkpoint / handoff，CLI 的 /share 不在协议里。

## 不变量

- 进程数 = 1 个脊桥监督进程 + 正在运行的插件数。不是会话数 × 插件数。
- 插件按引用计数。懒启动。引用归零后可回收。故障只重启那一个进程。
- 决策在被选择之前不进上下文。选择之后 role=user，weight=instruction。
- 工具结果和系统事件是边路，不能代替指令。
- 未提交的影子探针不进上下文，也不调用 setModel。探针无响应就放弃，不重启 CLI。
- 角色热切换只换 overlay，不改模型，不新建会话。分叉才新建会话，handoff 是第一条用户指令，模型用新角色的默认模型。

## 接缝

见 seam/copilot-sdk.md。预览里的回复来自本地运行时，用来把上述语义跑通，不登录 GitHub，也不冒充 Copilot 推理。
`;

const SEAM = `# @microsoft/copilot-sdk 接缝

| KEEL | SDK 2.0 |
| --- | --- |
| bridge.attach | 不要把 mcpServers 放进每个 session/new。监督进程持有子进程，session 只保留 pluginId。 |
| 影子探针 | 探针期间不调用 session.setModel，也不调用 rpc.model.switchTo。 |
| 写入探针 | 这时才 setModel。历史、工具、角色保持。 |
| 探针无响应 | 丢弃探针。模型保持原值。不重启 CLI，不新建进程。 |
| 决策 | 用 decision.text，走 onUserPromptSubmitted，和打字指令同一通道。 |
| 角色热切换 | 替换 custom harness 的 identity、tone、tool posture。不 disconnect()。不因此 setModel。 |
| 角色分叉 | createSession。第一条 user message 是 handoff。defaultModel 来自目标角色。 |
| checkpoint | harness 自己写盘。不要等 SDK 的 export。 |

模型目录只是 setModel 会收到的 id：${MODELS.map((model) => model.id).join("、")}。
`;

export function protocolEntries(args: {
  session: Session;
  characters: Character[];
  plugins: Plugin[];
}): ZipEntry[] {
  const checkpoint = checkpointDocument(args);
  const handoff = handoffMarkdown({ session: args.session, characters: args.characters });
  const entries: ZipEntry[] = [
    { name: "README.md", text: README },
    { name: "seam/copilot-sdk.md", text: SEAM },
    { name: "schemas/bridge.protocol.json", text: JSON.stringify(BRIDGE_PROTOCOL, null, 2) },
    { name: "schemas/decision.schema.json", text: JSON.stringify(DECISION_SCHEMA, null, 2) },
    { name: "schemas/checkpoint.schema.json", text: JSON.stringify(CHECKPOINT_SCHEMA, null, 2) },
    { name: "schemas/handoff.schema.json", text: JSON.stringify(HANDOFF_SCHEMA, null, 2) },
    { name: "schemas/character.schema.json", text: JSON.stringify(CHARACTER_SCHEMA, null, 2) },
    { name: "examples/checkpoint.json", text: JSON.stringify(checkpoint, null, 2) },
    { name: "examples/handoff.md", text: handoff },
    { name: "examples/context.json", text: JSON.stringify(checkpoint.context, null, 2) },
  ];
  for (const character of args.characters) {
    entries.push({
      name: `characters/${character.id}.json`,
      text: JSON.stringify({ keel: 1, kind: "character", ...character }, null, 2),
    });
  }
  return entries;
}

export function protocolPack(args: {
  session: Session;
  characters: Character[];
  plugins: Plugin[];
}): Blob {
  return zipStore(protocolEntries(args));
}
