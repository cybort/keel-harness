import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-lhvsWimJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MODELS = [
	{
		id: "copilot-fusion",
		label: "Copilot Fusion",
		note: "按步路由"
	},
	{
		id: "gpt-5.4",
		label: "GPT-5.4",
		note: "结构化"
	},
	{
		id: "claude-sonnet-4.6",
		label: "Claude Sonnet 4.6",
		note: "先收边界"
	},
	{
		id: "grok-4",
		label: "Grok 4",
		note: "只推下一步"
	},
	{
		id: "gpt-5-mini",
		label: "GPT-5 mini",
		note: "短答"
	}
];
function modelLabel(id) {
	return MODELS.find((m) => m.id === id)?.label ?? id;
}
var POSTURE_LABEL = {
	ask: "询问",
	allow: "放行",
	deny: "拒绝"
};
var CRC = (() => {
	const table = /* @__PURE__ */ new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		table[n] = c >>> 0;
	}
	return table;
})();
function crc32(bytes) {
	let c = 4294967295;
	for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ c >>> 8;
	return (c ^ 4294967295) >>> 0;
}
function u16(n) {
	const b = /* @__PURE__ */ new Uint8Array(2);
	b[0] = n & 255;
	b[1] = n >>> 8 & 255;
	return b;
}
function u32(n) {
	const b = /* @__PURE__ */ new Uint8Array(4);
	b[0] = n & 255;
	b[1] = n >>> 8 & 255;
	b[2] = n >>> 16 & 255;
	b[3] = n >>> 24 & 255;
	return b;
}
function concat(parts) {
	const size = parts.reduce((sum, part) => sum + part.length, 0);
	const out = new Uint8Array(size);
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}
function zipStore(entries) {
	const encoder = new TextEncoder();
	const now = /* @__PURE__ */ new Date();
	const time = now.getHours() << 11 | now.getMinutes() << 5 | now.getSeconds() >> 1;
	const date = now.getFullYear() - 1980 << 9 | now.getMonth() + 1 << 5 | now.getDate();
	const locals = [];
	const centrals = [];
	let offset = 0;
	for (const entry of entries) {
		const name = encoder.encode(entry.name);
		const data = encoder.encode(entry.text);
		const crc = crc32(data);
		const local = concat([
			u32(67324752),
			u16(20),
			u16(2048),
			u16(0),
			u16(time),
			u16(date),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(name.length),
			u16(0),
			name,
			data
		]);
		locals.push(local);
		centrals.push(concat([
			u32(33639248),
			u16(20),
			u16(20),
			u16(2048),
			u16(0),
			u16(time),
			u16(date),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(name.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(0),
			u32(offset),
			name
		]));
		offset += local.length;
	}
	const central = concat(centrals);
	const end = concat([
		u32(101010256),
		u16(0),
		u16(0),
		u16(entries.length),
		u16(entries.length),
		u32(central.length),
		u32(offset),
		u16(0)
	]);
	const bytes = concat([
		...locals,
		central,
		end
	]);
	const copy = new Uint8Array(bytes);
	return new Blob([copy], { type: "application/zip" });
}
function saveFile(filename, blob) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function decisionText(question, options, selectedId) {
	const chosen = options.find((option) => option.id === selectedId);
	return [
		`问题：${question}`,
		"可选项：",
		...options.map((option) => `- ${option.label}：${option.detail}`),
		`选择：${chosen ? chosen.label : selectedId}`
	].join("\n");
}
function contextBlocks(session) {
	const blocks = [];
	for (const event of session.events) if (event.kind === "instruction") blocks.push({
		eventId: event.id,
		role: "user",
		weight: "instruction",
		kind: "instruction",
		text: event.text
	});
	else if (event.kind === "decision" && event.selectedId) blocks.push({
		eventId: event.id,
		role: "user",
		weight: "instruction",
		kind: "decision",
		text: decisionText(event.question, event.options, event.selectedId)
	});
	else if (event.kind === "handoff") blocks.push({
		eventId: event.id,
		role: "user",
		weight: "instruction",
		kind: "handoff",
		text: event.text
	});
	else if (event.kind === "assistant") blocks.push({
		eventId: event.id,
		role: "assistant",
		weight: "instruction",
		kind: "assistant",
		text: event.text
	});
	return blocks;
}
function openDecisions(session) {
	return session.events.filter((event) => event.kind === "decision" && !event.selectedId);
}
function characterOf(characters, id) {
	return characters.find((character) => character.id === id);
}
function handoffMarkdown(args) {
	const source = characterOf(args.characters, args.session.characterId);
	const target = args.target ?? source;
	const decided = args.session.events.filter((event) => event.kind === "decision" && Boolean(event.selectedId));
	const pending = args.session.events.filter((event) => event.kind === "decision" && !event.selectedId);
	const instructions = args.session.events.filter((event) => event.kind === "instruction");
	const lastAssistant = [...args.session.events].reverse().find((event) => event.kind === "assistant");
	const decidedBlock = decided.length ? decided.map((event) => decisionText(event.question, event.options, event.selectedId)).join("\n\n") : "（无）";
	const pendingBlock = pending.length ? pending.map((event) => `- ${event.question}`).join("\n") : "（无）";
	const instructionBlock = instructions.length ? instructions.map((event) => `- ${event.text}`).join("\n") : "（无）";
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
		""
	].join("\n");
}
function checkpointDocument(args) {
	const character = characterOf(args.characters, args.session.characterId) ?? null;
	const attached = args.plugins.filter((plugin) => args.session.pluginIds.includes(plugin.id));
	return {
		keel: 1,
		kind: "checkpoint",
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		session: {
			id: args.session.id,
			title: args.session.title,
			parentId: args.session.parentId ?? null,
			model: {
				id: args.session.modelId,
				label: modelLabel(args.session.modelId)
			},
			character,
			plugins: attached.map((plugin) => ({
				id: plugin.id,
				name: plugin.name,
				transport: plugin.transport,
				command: plugin.command
			})),
			timeline: args.session.timeline,
			events: args.session.events,
			shadow: args.session.shadow ? {
				...args.session.shadow,
				committed: false
			} : null
		},
		context: contextBlocks(args.session),
		openDecisions: openDecisions(args.session),
		note: "context 里 role=user 的 instruction、decision、handoff 同级。tool 与 system 不在 context 中。未提交探针不在 context 中。"
	};
}
function bridgeMath(plugins, sessions) {
	const live = plugins.filter((plugin) => plugin.status !== "stopped").length;
	const mounts = sessions.reduce((sum, session) => sum + session.pluginIds.length, 0);
	return {
		supervisor: 1,
		live,
		processes: 1 + live,
		mounts,
		avoided: Math.max(0, mounts - live)
	};
}
var DECISION_SCHEMA = {
	$id: "https://keel.local/schemas/decision.schema.json",
	keel: 1,
	title: "Decision",
	description: "选项卡的问题、全部可选项和选择。选定后与直接用户指令同级。",
	type: "object",
	required: [
		"kind",
		"role",
		"weight",
		"question",
		"options",
		"selectedId",
		"text"
	],
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
				required: [
					"id",
					"label",
					"detail"
				],
				properties: {
					id: { type: "string" },
					label: { type: "string" },
					detail: { type: "string" }
				}
			}
		},
		selectedId: { type: "string" },
		text: {
			type: "string",
			description: "送进模型的正文，含问题、全部可选项和选择。通道与打字指令相同。"
		}
	}
};
var CHARACTER_SCHEMA = {
	$id: "https://keel.local/schemas/character.schema.json",
	keel: 1,
	title: "Character",
	description: "Harness overlay。热切换不重建 session。分叉才新建 session。",
	type: "object",
	required: [
		"keel",
		"kind",
		"id",
		"name",
		"identity",
		"tone",
		"posture",
		"defaultModel"
	],
	properties: {
		keel: { const: 1 },
		kind: { const: "character" },
		id: { type: "string" },
		name: { type: "string" },
		epithet: { type: "string" },
		identity: { type: "string" },
		tone: { type: "string" },
		posture: { enum: [
			"ask",
			"allow",
			"deny"
		] },
		defaultModel: { type: "string" }
	}
};
var CHECKPOINT_SCHEMA = {
	$id: "https://keel.local/schemas/checkpoint.schema.json",
	keel: 1,
	title: "Checkpoint",
	description: "可恢复的会话快照。SDK 协议不提供导出，由 harness 持有。",
	type: "object",
	required: [
		"keel",
		"kind",
		"session",
		"context"
	],
	properties: {
		keel: { const: 1 },
		kind: { const: "checkpoint" },
		session: { type: "object" },
		context: { type: "array" },
		openDecisions: { type: "array" }
	}
};
var HANDOFF_SCHEMA = {
	$id: "https://keel.local/schemas/handoff.schema.json",
	keel: 1,
	title: "Handoff",
	description: "压缩简报。分叉角色时作为新会话的第一条 user 指令。",
	type: "object",
	required: [
		"keel",
		"kind",
		"role",
		"weight",
		"markdown"
	],
	properties: {
		keel: { const: 1 },
		kind: { const: "handoff" },
		role: { const: "user" },
		weight: { const: "instruction" },
		sourceSessionId: { type: "string" },
		markdown: { type: "string" }
	}
};
var BRIDGE_PROTOCOL = {
	keel: 1,
	kind: "bridge.protocol",
	supervisor: "single-process",
	rule: "进程数 = 1 个监督进程 + 运行中的插件数。会话只持有 pluginId。",
	messages: [
		{
			type: "bridge.attach",
			effect: "引用 +1。仅当该插件没有进程时才懒启动。"
		},
		{
			type: "bridge.detach",
			effect: "引用 -1。进程留下，直到 reap。"
		},
		{
			type: "bridge.call",
			effect: "打到共享进程。不为这个会话另起子进程。"
		},
		{
			type: "bridge.fault",
			effect: "只重启故障插件。会话、其它插件、模型保持。"
		},
		{
			type: "bridge.reap",
			effect: "停掉引用为 0 的进程。"
		}
	]
};
var SCHEMAS = [
	{
		id: "bridge",
		title: "bridge.protocol",
		body: BRIDGE_PROTOCOL
	},
	{
		id: "decision",
		title: "decision.schema",
		body: DECISION_SCHEMA
	},
	{
		id: "checkpoint",
		title: "checkpoint.schema",
		body: CHECKPOINT_SCHEMA
	},
	{
		id: "handoff",
		title: "handoff.schema",
		body: HANDOFF_SCHEMA
	},
	{
		id: "character",
		title: "character.schema",
		body: CHARACTER_SCHEMA
	}
];
var README = `# KEEL 协议包

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
var SEAM = `# @microsoft/copilot-sdk 接缝

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
function protocolEntries(args) {
	const checkpoint = checkpointDocument(args);
	const handoff = handoffMarkdown({
		session: args.session,
		characters: args.characters
	});
	const entries = [
		{
			name: "README.md",
			text: README
		},
		{
			name: "seam/copilot-sdk.md",
			text: SEAM
		},
		{
			name: "schemas/bridge.protocol.json",
			text: JSON.stringify(BRIDGE_PROTOCOL, null, 2)
		},
		{
			name: "schemas/decision.schema.json",
			text: JSON.stringify(DECISION_SCHEMA, null, 2)
		},
		{
			name: "schemas/checkpoint.schema.json",
			text: JSON.stringify(CHECKPOINT_SCHEMA, null, 2)
		},
		{
			name: "schemas/handoff.schema.json",
			text: JSON.stringify(HANDOFF_SCHEMA, null, 2)
		},
		{
			name: "schemas/character.schema.json",
			text: JSON.stringify(CHARACTER_SCHEMA, null, 2)
		},
		{
			name: "examples/checkpoint.json",
			text: JSON.stringify(checkpoint, null, 2)
		},
		{
			name: "examples/handoff.md",
			text: handoff
		},
		{
			name: "examples/context.json",
			text: JSON.stringify(checkpoint.context, null, 2)
		}
	];
	for (const character of args.characters) entries.push({
		name: `characters/${character.id}.json`,
		text: JSON.stringify({
			keel: 1,
			kind: "character",
			...character
		}, null, 2)
	});
	return entries;
}
function protocolPack(args) {
	return zipStore(protocolEntries(args));
}
var CRASH = {
	question: "单个插件崩溃时，脊桥怎么处置？",
	options: [
		{
			id: "restart",
			label: "原地重启",
			detail: "只重启该进程。会话、其它插件、模型都保持。"
		},
		{
			id: "detach",
			label: "摘掉引用",
			detail: "会话继续，但失去这个工具。进程停在故障。"
		},
		{
			id: "reboot",
			label: "整桥重启",
			detail: "所有会话的工具调用中断。这是要避免的路径。"
		}
	]
};
var PERMISSION = {
	question: "这个角色的工具权限怎么落？",
	options: [
		{
			id: "ask",
			label: "每步询问",
			detail: "每次调用都要你点头。选择本身写成指令。"
		},
		{
			id: "read",
			label: "只读放行",
			detail: "读放行，写和外部调用仍询问。"
		},
		{
			id: "allow",
			label: "全部放行",
			detail: "不再拦。交接时必须写明这是你的选择。"
		}
	]
};
var EXPORT_SCOPE = {
	question: "交接时带上什么？",
	options: [
		{
			id: "decided",
			label: "只带已决",
			detail: "问题和全部可选项、选择。不含闲聊。"
		},
		{
			id: "brief",
			label: "已决加未决",
			detail: "再加约束和下一步。给人读的 handoff。"
		},
		{
			id: "full",
			label: "全量 checkpoint",
			detail: "事件、角色时间线、插件引用、未提交探针。"
		}
	]
};
var NEXT_CUT = {
	question: "下一步切哪一刀？",
	options: [
		{
			id: "bridge",
			label: "只动脊桥",
			detail: "共享进程，不碰模型，不新建会话。"
		},
		{
			id: "shadow",
			label: "只跑探针",
			detail: "候选模型先答一轮。你写入之前不调用 setModel。"
		},
		{
			id: "freeze",
			label: "先导出再动",
			detail: "checkpoint 落地之后才改角色或模型。"
		}
	]
};
function forcedQuestion(character) {
	if (character.posture === "allow") return EXPORT_SCOPE;
	if (character.posture === "deny") return NEXT_CUT;
	return PERMISSION;
}
function decisionFor(text, character) {
	if (/崩溃|故障|挂了|无响应/.test(text)) return CRASH;
	if (/权限|允许|批准|询问/.test(text)) return PERMISSION;
	if (/导出|交接|handoff|checkpoint/i.test(text)) return EXPORT_SCOPE;
	if (/选项|哪一|哪个|还是|选一|方案/.test(text)) return forcedQuestion(character);
	return null;
}
function answerTurn(args) {
	const label = modelLabel(args.modelId);
	const bridge = args.pluginNames.length ? `这一跳经脊桥共享进程：${args.pluginNames.join("、")}。不为这个会话另起一份。` : "此会话没有挂插件，脊桥不会为它起进程。";
	const clip = args.text.replace(/\s+/g, " ").trim().slice(0, 42);
	let assistant;
	if (args.character.posture === "deny") assistant = `下一步只做一件事：把「${clip}」留在当前会话里处理。\n${bridge}\n模型仍是 ${label}。探针写入之前，不调用 setModel，也不重启运行时。`;
	else if (args.character.posture === "allow") assistant = `已记下指令：「${clip}」。\n已决和未决分开写。选过的问题会连同全部可选项成为用户指令，不进工具结果。\n${bridge}`;
	else assistant = `边界先于动作。「${clip}」先收成可选项，不直接改运行时。\n${bridge}\n当前模型 ${label}，角色 ${args.character.name}。热切换角色不会换模型。`;
	return {
		assistant,
		tool: args.pluginNames.length > 0,
		decision: decisionFor(args.text, args.character)
	};
}
function probeLine(modelId, subject) {
	const s = subject.replace(/\s+/g, " ").trim().slice(0, 36) || "当前会话";
	switch (modelId) {
		case "copilot-fusion": return `Fusion 把「${s}」拆开：机械步骤交给轻模型，判断留在此会话。这是探针，setModel 还没调用。`;
		case "gpt-5.4": return `已决：历史和工具绑定保持。风险：现在走 /model 会把 CLI 挂死。下一步：你确认之后才把「${s}」交给本模型。`;
		case "claude-sonnet-4.6": return `先不改会话进程。探针复述「${s}」，并建议提交前看一眼还没选的选项。模型切换尚未写入。`;
		case "gpt-5-mini": return `「${s}」。探针短答。未切换，未重启。`;
		default: return `直接说：「${s}」继续由当前会话扛着。探针未写入，运行时不重启。`;
	}
}
function uid(prefix) {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
function stamp(ts) {
	const d = new Date(ts);
	const p = (n) => String(n).padStart(2, "0");
	return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
var BASE = Date.UTC(2026, 10, 22, 18, 40, 0);
var minute = (n) => BASE + n * 6e4;
var SEED_CHARACTERS = [
	{
		id: "surveyor",
		name: "测线",
		epithet: "Surveyor",
		identity: "把含糊收成可选项。不在边界清楚之前改运行时。",
		tone: "短句。先问再动。",
		posture: "ask",
		defaultModel: "claude-sonnet-4.6"
	},
	{
		id: "archivist",
		name: "档史",
		epithet: "Archivist",
		identity: "把已决、未决和约束写成可以交接的记录。",
		tone: "分段。已决和未决不混写。",
		posture: "allow",
		defaultModel: "gpt-5.4"
	},
	{
		id: "edge",
		name: "锋面",
		epithet: "Edge",
		identity: "只推下一步。拒绝顺手重构和顺手换模型。",
		tone: "命令式。一次一件事。",
		posture: "deny",
		defaultModel: "grok-4"
	}
];
var SEED_PLUGINS = [
	{
		id: "github",
		name: "github-mcp",
		transport: "stdio",
		command: "github-mcp-server",
		status: "ready",
		crashCount: 0,
		lastUsed: minute(12)
	},
	{
		id: "context7",
		name: "context7",
		transport: "stdio",
		command: "npx -y @upstash/context7-mcp",
		status: "ready",
		crashCount: 0,
		lastUsed: minute(8)
	},
	{
		id: "notion",
		name: "notion",
		transport: "http",
		command: "https://mcp.notion.com/mcp",
		status: "ready",
		crashCount: 0,
		lastUsed: minute(4)
	},
	{
		id: "keel",
		name: "keel-tools",
		transport: "stdio",
		command: "keel-bridge tools",
		status: "ready",
		crashCount: 0,
		lastUsed: minute(14)
	},
	{
		id: "memory",
		name: "copilot-memory",
		transport: "stdio",
		command: "copilot-memory",
		status: "stopped",
		crashCount: 1,
		lastUsed: minute(1)
	}
];
function eventInstruction(id, at, text) {
	return {
		id,
		at,
		kind: "instruction",
		role: "user",
		text
	};
}
function seedSessions() {
	return [
		{
			id: "s-bridge",
			title: "聚合 MCP，不再按会话起进程",
			characterId: "surveyor",
			modelId: "claude-sonnet-4.6",
			pluginIds: [
				"github",
				"context7",
				"keel"
			],
			createdAt: minute(0),
			shadow: null,
			timeline: [{
				at: minute(0),
				characterId: "surveyor",
				kind: "bind"
			}],
			events: [
				eventInstruction("e-b1", minute(1), "五个会话都要 github、context7 和文件系统。现在是会话数乘插件数，CLI 一起动就卡。"),
				{
					id: "e-b2",
					at: minute(2),
					kind: "tool",
					role: "tool",
					pluginId: "keel",
					toolName: "bridge.call",
					text: "bridge.call keel-tools · 共享进程 · 引用不随会话相乘"
				},
				{
					id: "e-b3",
					at: minute(3),
					kind: "assistant",
					role: "assistant",
					characterId: "surveyor",
					modelId: "claude-sonnet-4.6",
					text: "脊桥只留一份进程。会话拿引用，不拿子进程。github-mcp 的引用计数等于挂上它的会话数。"
				},
				{
					id: "e-b4",
					at: minute(4),
					kind: "decision",
					role: "user",
					question: "单个插件崩溃时，脊桥怎么处置？",
					selectedId: null,
					options: [
						{
							id: "restart",
							label: "原地重启",
							detail: "只重启该进程。会话、其它插件、模型都保持。"
						},
						{
							id: "detach",
							label: "摘掉引用",
							detail: "会话继续，但失去这个工具。进程停在故障。"
						},
						{
							id: "reboot",
							label: "整桥重启",
							detail: "所有会话的工具调用中断。这是要避免的路径。"
						}
					]
				}
			]
		},
		{
			id: "s-model",
			title: "换模型，但别把 CLI 挂死",
			characterId: "edge",
			modelId: "grok-4",
			pluginIds: ["github", "keel"],
			createdAt: minute(5),
			timeline: [{
				at: minute(5),
				characterId: "edge",
				kind: "bind"
			}],
			events: [eventInstruction("e-m1", minute(6), "/model 一切，Copilot CLI 就不再回。我要在这个会话里换成 GPT-5.4，历史还在。"), {
				id: "e-m2",
				at: minute(7),
				kind: "assistant",
				role: "assistant",
				characterId: "edge",
				modelId: "grok-4",
				text: "不要走 /model。影子探针先跑一轮。你点写入之前，setModel 不会被调用，进程也不换。"
			}],
			shadow: {
				id: "shadow-seed",
				fromModel: "grok-4",
				toModel: "gpt-5.4",
				status: "ready",
				startedAt: minute(8),
				currentText: probeLine("grok-4", "换成 GPT-5.4，历史还在"),
				probeText: probeLine("gpt-5.4", "换成 GPT-5.4，历史还在")
			}
		},
		{
			id: "s-hand",
			title: "决策要能原样交接",
			characterId: "archivist",
			modelId: "gpt-5.4",
			pluginIds: ["notion", "keel"],
			createdAt: minute(9),
			shadow: null,
			timeline: [{
				at: minute(9),
				characterId: "archivist",
				kind: "bind"
			}],
			events: [
				eventInstruction("e-h1", minute(10), "把权限的选择写进 handoff，别只留在工具结果里。"),
				{
					id: "e-h2",
					at: minute(11),
					kind: "decision",
					role: "user",
					question: "这个角色的工具权限怎么落？",
					selectedId: "ask",
					options: [
						{
							id: "ask",
							label: "每步询问",
							detail: "每次调用都要你点头。选择本身写成指令。"
						},
						{
							id: "read",
							label: "只读放行",
							detail: "读放行，写和外部调用仍询问。"
						},
						{
							id: "allow",
							label: "全部放行",
							detail: "不再拦。交接时必须写明这是你的选择。"
						}
					]
				},
				{
					id: "e-h3",
					at: minute(12),
					kind: "assistant",
					role: "assistant",
					characterId: "archivist",
					modelId: "gpt-5.4",
					text: "已作为用户级指令写入。导出 handoff 时，问题和全部可选项会跟选择一起走，不是一句「用户选了询问」。"
				}
			]
		}
	];
}
function seedData() {
	return {
		sessions: seedSessions(),
		characters: SEED_CHARACTERS,
		plugins: SEED_PLUGINS,
		activeId: "s-bridge"
	};
}
function sys(text) {
	return {
		id: uid("e"),
		at: Date.now(),
		kind: "system",
		role: "system",
		text
	};
}
function patchSession(sessions, id, fn) {
	return sessions.map((session) => session.id === id ? fn(session) : session);
}
function activeSession(state) {
	return state.sessions.find((session) => session.id === state.activeId) ?? state.sessions[0];
}
var useKeel = create()(persist((set, get) => ({
	...seedData(),
	pane: "record",
	side: "session",
	draft: "",
	notice: null,
	setPane: (pane) => set({ pane }),
	setSide: (side) => set({
		side,
		pane: side === "session" ? get().pane : "bridge"
	}),
	setDraft: (draft) => set({ draft }),
	dismiss: () => set({ notice: null }),
	selectSession: (id) => set({
		activeId: id,
		pane: "record",
		side: "session"
	}),
	createSession: (title, characterId) => {
		const state = get();
		const character = state.characters.find((item) => item.id === characterId);
		if (!character) return;
		const now = Date.now();
		const session = {
			id: uid("s"),
			title: title.trim() || "未命名会话",
			characterId: character.id,
			modelId: character.defaultModel,
			pluginIds: ["github", "keel"].filter((id) => state.plugins.some((plugin) => plugin.id === id)),
			events: [],
			shadow: null,
			timeline: [{
				at: now,
				characterId: character.id,
				kind: "bind"
			}],
			createdAt: now
		};
		set({
			sessions: [...state.sessions, session],
			plugins: state.plugins.map((plugin) => session.pluginIds.includes(plugin.id) && plugin.status === "stopped" ? {
				...plugin,
				status: "ready",
				lastUsed: now
			} : plugin),
			activeId: session.id,
			pane: "record",
			side: "session",
			notice: `会话已建。角色 ${character.name}，模型 ${character.defaultModel}。插件只增加引用。`
		});
	},
	send: () => {
		const state = get();
		const text = state.draft.trim();
		const session = activeSession(state);
		if (!text || !session) return;
		const character = state.characters.find((item) => item.id === session.characterId);
		if (!character) return;
		const attached = state.plugins.filter((plugin) => session.pluginIds.includes(plugin.id) && plugin.status !== "stopped");
		const turn = answerTurn({
			character,
			modelId: session.modelId,
			text,
			pluginNames: attached.map((plugin) => plugin.name)
		});
		const now = Date.now();
		const events = [...session.events];
		events.push({
			id: uid("e"),
			at: now,
			kind: "instruction",
			role: "user",
			text
		});
		let plugins = state.plugins;
		if (turn.tool && attached[0]) {
			const plugin = attached[0];
			events.push({
				id: uid("e"),
				at: now + 1,
				kind: "tool",
				role: "tool",
				pluginId: plugin.id,
				toolName: "bridge.call",
				text: `bridge.call ${plugin.name} · 共享进程 · 引用 ${state.sessions.filter((item) => item.pluginIds.includes(plugin.id)).length}`
			});
			plugins = plugins.map((item) => item.id === plugin.id ? {
				...item,
				lastUsed: now
			} : item);
		}
		events.push({
			id: uid("e"),
			at: now + 2,
			kind: "assistant",
			role: "assistant",
			characterId: character.id,
			modelId: session.modelId,
			text: turn.assistant
		});
		if (turn.decision) events.push({
			id: uid("e"),
			at: now + 3,
			kind: "decision",
			role: "user",
			question: turn.decision.question,
			options: turn.decision.options,
			selectedId: null
		});
		set({
			draft: "",
			plugins,
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				events
			}))
		});
	},
	ask: () => {
		const state = get();
		const session = activeSession(state);
		if (!session) return;
		const character = state.characters.find((item) => item.id === session.characterId);
		if (!character) return;
		const asked = forcedQuestion(character);
		const events = [...session.events, {
			id: uid("e"),
			at: Date.now(),
			kind: "decision",
			role: "user",
			question: asked.question,
			options: asked.options,
			selectedId: null
		}];
		set({ sessions: patchSession(state.sessions, session.id, (current) => ({
			...current,
			events
		})) });
	},
	choose: (eventId, optionId) => {
		const state = get();
		const session = activeSession(state);
		if (!session) return;
		set({
			notice: "这条选择已写成指令，和打字进来的话同级。",
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				events: current.events.map((event) => event.kind === "decision" && event.id === eventId ? {
					...event,
					selectedId: optionId
				} : event)
			}))
		});
	},
	beginShadow: (modelId) => {
		const state = get();
		const session = activeSession(state);
		if (!session || session.shadow || modelId === session.modelId) return;
		const last = [...session.events].reverse().find((event) => event.kind === "instruction" || event.kind === "handoff" || event.kind === "decision" && event.selectedId);
		const subject = last?.kind === "instruction" || last?.kind === "handoff" ? last.text : last?.kind === "decision" ? last.question : session.title;
		const id = uid("shadow");
		const shadow = {
			id,
			fromModel: session.modelId,
			toModel: modelId,
			status: "running",
			currentText: "",
			probeText: "",
			startedAt: Date.now()
		};
		set({
			notice: "探针在跑。setModel 还没调用。",
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				shadow
			}))
		});
		window.setTimeout(() => {
			const latest = get();
			const current = latest.sessions.find((item) => item.id === session.id);
			if (!current?.shadow || current.shadow.id !== id || current.shadow.status !== "running") return;
			set({
				notice: "探针好了。写入之前，会话模型不变。",
				sessions: patchSession(latest.sessions, session.id, (item) => ({
					...item,
					shadow: item.shadow ? {
						...item.shadow,
						status: "ready",
						currentText: probeLine(item.modelId, subject),
						probeText: probeLine(modelId, subject)
					} : null
				}))
			});
		}, 520);
	},
	silenceShadow: () => {
		const state = get();
		const session = activeSession(state);
		if (!session?.shadow) return;
		set({
			notice: "探针无响应。模型保持原值，不必重启 CLI。",
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				shadow: current.shadow ? {
					...current.shadow,
					status: "silent"
				} : null
			}))
		});
	},
	commitShadow: () => {
		const state = get();
		const session = activeSession(state);
		if (!session?.shadow || session.shadow.status !== "ready") return;
		const shadow = session.shadow;
		const character = state.characters.find((item) => item.id === session.characterId);
		const events = [
			...session.events,
			sys(`模型由 ${shadow.fromModel} 写入为 ${shadow.toModel}。进程未换。`),
			{
				id: uid("e"),
				at: Date.now() + 1,
				kind: "assistant",
				role: "assistant",
				characterId: character?.id ?? session.characterId,
				modelId: shadow.toModel,
				text: shadow.probeText
			}
		];
		set({
			notice: "已写入。这一步才相当于 setModel。",
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				modelId: shadow.toModel,
				shadow: null,
				events
			}))
		});
	},
	discardShadow: () => {
		const state = get();
		const session = activeSession(state);
		if (!session?.shadow) return;
		const from = session.shadow.fromModel;
		set({
			notice: "探针已丢弃。会话模型未改。",
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				shadow: null,
				events: [...current.events, sys(`放弃影子切换，模型仍是 ${from}。`)]
			}))
		});
	},
	swapCharacter: (characterId) => {
		const state = get();
		const session = activeSession(state);
		const next = state.characters.find((item) => item.id === characterId);
		const prev = state.characters.find((item) => item.id === session?.characterId);
		if (!session || !next || next.id === session.characterId) return;
		const at = Date.now();
		set({
			notice: `角色换成 ${next.name}。会话还是这一条，模型未改。`,
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				characterId: next.id,
				timeline: [...current.timeline, {
					at,
					characterId: next.id,
					kind: "swap"
				}],
				events: [...current.events, sys(`角色由 ${prev?.name ?? "未知"} 换成 ${next.name}。会话未重建，模型仍是 ${current.modelId}。`)]
			}))
		});
	},
	forkCharacter: (characterId) => {
		const state = get();
		const session = activeSession(state);
		const target = state.characters.find((item) => item.id === characterId);
		const source = state.characters.find((item) => item.id === session?.characterId);
		if (!session || !target || target.id === session.characterId) return;
		const now = Date.now();
		const text = handoffMarkdown({
			session,
			characters: state.characters,
			target
		});
		const child = {
			id: uid("s"),
			title: `${session.title} · ${target.name}`,
			characterId: target.id,
			modelId: target.defaultModel,
			pluginIds: [...session.pluginIds],
			events: [{
				id: uid("e"),
				at: now,
				kind: "handoff",
				role: "user",
				text,
				sourceSessionId: session.id
			}],
			shadow: null,
			timeline: [{
				at: now,
				characterId: target.id,
				kind: "fork"
			}],
			createdAt: now,
			parentId: session.id
		};
		set({
			notice: `已分叉。新会话第一条指令就是 handoff，模型用 ${target.defaultModel}。`,
			activeId: child.id,
			pane: "record",
			side: "session",
			sessions: [...patchSession(state.sessions, session.id, (current) => ({
				...current,
				events: [...current.events, sys(`已分叉给 ${target.name}。本会话保持 ${source?.name ?? "原角色"}。`)]
			})), child]
		});
	},
	togglePlugin: (pluginId) => {
		const state = get();
		const session = activeSession(state);
		const plugin = state.plugins.find((item) => item.id === pluginId);
		if (!session || !plugin) return;
		const has = session.pluginIds.includes(pluginId);
		const now = Date.now();
		const pluginIds = has ? session.pluginIds.filter((id) => id !== pluginId) : [...session.pluginIds, pluginId];
		set({
			plugins: state.plugins.map((item) => {
				if (item.id !== pluginId) return item;
				if (!has && item.status === "stopped") return {
					...item,
					status: "ready",
					lastUsed: now
				};
				return {
					...item,
					lastUsed: now
				};
			}),
			notice: has ? `摘下 ${plugin.name}。进程还在，直到回收。` : `挂上 ${plugin.name}。已有进程只加引用，不新起一份。`,
			sessions: patchSession(state.sessions, session.id, (current) => ({
				...current,
				pluginIds,
				events: [...current.events, sys(has ? `摘下 ${plugin.name}。引用减少，进程仍由脊桥持有。` : `挂上 ${plugin.name}。走共享进程。`)]
			}))
		});
	},
	faultPlugin: (pluginId) => {
		const state = get();
		const plugin = state.plugins.find((item) => item.id === pluginId);
		if (!plugin || plugin.status === "stopped") return;
		const sessions = state.sessions.map((session) => session.pluginIds.includes(pluginId) ? {
			...session,
			events: [...session.events, sys(`${plugin.name} 故障。脊桥只重启这一进程，会话和其它插件保持。`)]
		} : session);
		set({
			notice: `${plugin.name} 故障，只重启它。`,
			sessions,
			plugins: state.plugins.map((item) => item.id === pluginId ? {
				...item,
				status: "faulted",
				crashCount: item.crashCount + 1
			} : item)
		});
		window.setTimeout(() => {
			const latest = get();
			const current = latest.plugins.find((item) => item.id === pluginId);
			if (!current || current.status !== "faulted") return;
			set({
				plugins: latest.plugins.map((item) => item.id === pluginId ? {
					...item,
					status: "ready",
					lastUsed: Date.now()
				} : item),
				notice: `${plugin.name} 已在原位恢复。`
			});
		}, 700);
	},
	reapIdle: () => {
		const state = get();
		const used = new Set(state.sessions.flatMap((session) => session.pluginIds));
		let reaped = 0;
		set({
			plugins: state.plugins.map((plugin) => {
				if (!used.has(plugin.id) && plugin.status !== "stopped") {
					reaped += 1;
					return {
						...plugin,
						status: "stopped"
					};
				}
				return plugin;
			}),
			notice: reaped ? `回收了 ${reaped} 个零引用插件。` : "没有零引用的插件。"
		});
	},
	saveCharacter: (character) => {
		set({
			characters: get().characters.map((item) => item.id === character.id ? character : item),
			notice: `已更新角色 ${character.name}。`
		});
	},
	createCharacter: (input) => {
		const name = input.name.trim();
		const identity = input.identity.trim();
		if (!name || !identity) return;
		const character = {
			id: uid("c"),
			name,
			epithet: input.epithet.trim() || "Custom",
			identity,
			tone: input.tone.trim() || "按身份说话。",
			posture: input.posture,
			defaultModel: input.defaultModel
		};
		set({
			characters: [...get().characters, character],
			notice: `角色 ${name} 已加入。新建会话时可以指定。`
		});
	},
	deleteCharacter: (id) => {
		const state = get();
		if (state.sessions.some((session) => session.characterId === id)) {
			set({ notice: "还有会话在用这个角色，不能删。" });
			return;
		}
		set({
			characters: state.characters.filter((character) => character.id !== id),
			notice: "角色已删除。"
		});
	},
	reset: () => {
		set({
			...seedData(),
			pane: "record",
			side: "session",
			draft: "",
			notice: "已回到示例。"
		});
	}
}), {
	name: "keel-harness-v1",
	skipHydration: true,
	partialize: (state) => ({
		sessions: state.sessions,
		characters: state.characters,
		plugins: state.plugins,
		activeId: state.activeId,
		pane: state.pane,
		side: state.side,
		draft: state.draft
	}),
	merge: (persisted, current) => ({
		...current,
		...persisted,
		notice: null
	}),
	onRehydrateStorage: () => (state) => {
		if (!state) return;
		state.sessions = state.sessions.map((session) => session.shadow?.status === "running" ? {
			...session,
			shadow: {
				...session.shadow,
				status: "silent"
			}
		} : session);
	}
}));
function cn$2(...parts) {
	return parts.filter(Boolean).join(" ");
}
function RecordPane({ visible }) {
	const sessions = useKeel((state) => state.sessions);
	const characters = useKeel((state) => state.characters);
	const activeId = useKeel((state) => state.activeId);
	const draft = useKeel((state) => state.draft);
	const setDraft = useKeel((state) => state.setDraft);
	const send = useKeel((state) => state.send);
	const ask = useKeel((state) => state.ask);
	const choose = useKeel((state) => state.choose);
	const commitShadow = useKeel((state) => state.commitShadow);
	const discardShadow = useKeel((state) => state.discardShadow);
	const silenceShadow = useKeel((state) => state.silenceShadow);
	const session = sessions.find((item) => item.id === activeId) ?? sessions[0];
	const [view, setView] = (0, import_react.useState)("log");
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const node = scroller.current;
		if (!node || view !== "log") return;
		node.scrollTop = node.scrollHeight;
	}, [
		session?.id,
		session?.events.length,
		view
	]);
	if (!session) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "flex flex-1 items-center justify-center p-6 text-muted",
		children: "还没有会话。"
	});
	const character = characters.find((item) => item.id === session.characterId);
	const blocks = contextBlocks(session);
	const decisions = blocks.filter((block) => block.kind === "decision").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn$2("min-h-0 min-w-0 flex-1 flex-col lg:flex", visible ? "flex" : "hidden"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "truncate text-base text-fg",
						children: session.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-xs text-muted",
						children: [
							character?.name ?? "无角色",
							" · ",
							modelLabel(session.modelId),
							" · 本地运行时"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 border border-line",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setView("log"),
						className: cn$2("min-h-11 px-3 text-sm", view === "log" ? "bg-raised text-fg" : "text-muted"),
						children: "记录"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setView("context"),
						className: cn$2("min-h-11 px-3 text-sm", view === "context" ? "bg-raised text-fg" : "text-muted"),
						children: "上下文"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: scroller,
				className: "min-h-0 flex-1 overflow-y-auto px-4 py-4",
				children: view === "log" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-3",
					children: session.events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "还没有指令。直接写，或让角色发问。选项和打字是同一级。"
					}) : session.events.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventCard, {
						event,
						characters,
						onChoose: choose
					}, event.id))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"模型看到 ",
							blocks.length,
							" 条。其中决策 ",
							decisions,
							" 条，role 与直接指令相同。工具、系统事件、未选问题和未提交探针不在这里。"
						]
					}), blocks.map((block) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "border border-line bg-surface p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xs text-brass",
							children: [
								block.role === "user" ? "指令" : "模型",
								block.kind === "decision" ? " · 选项" : "",
								block.kind === "handoff" ? " · 交接" : ""
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-2 font-sans text-sm whitespace-pre-wrap text-fg",
							children: block.text
						})]
					}, block.eventId))]
				})
			}),
			session.shadow ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShadowCard, {
				session,
				onCommit: commitShadow,
				onDiscard: discardShadow,
				onSilent: silenceShadow
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex shrink-0 items-end gap-2 border-t border-line p-3",
				onSubmit: (event) => {
					event.preventDefault();
					send();
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "sr-only",
						htmlFor: "keel-draft",
						children: "直接指令"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "keel-draft",
						value: draft,
						rows: 2,
						placeholder: "直接指令。和选项决定是同一级。",
						onChange: (event) => setDraft(event.target.value),
						onKeyDown: (event) => {
							if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
								event.preventDefault();
								send();
							}
						},
						className: "min-h-11 flex-1 resize-none border border-line bg-bg px-3 py-2 text-sm text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: ask,
						className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
						children: "发问"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: !draft.trim(),
						className: "min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink disabled:opacity-40",
						children: "发送"
					})
				]
			})
		]
	});
}
function EventCard({ event, characters, onChoose }) {
	if (event.kind === "system") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "font-mono text-xs text-muted",
		children: event.text
	});
	if (event.kind === "tool") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "border border-line bg-surface px-3 py-2 font-mono text-xs text-muted",
		children: ["脊桥 · ", event.text]
	});
	if (event.kind === "decision") {
		const chosen = event.options.find((option) => option.id === event.selectedId);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: cn$2("border bg-surface p-3", event.selectedId ? "border-brass" : "border-ember"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: event.selectedId ? "text-brass" : "text-ember",
						children: event.selectedId ? "指令" : "待选"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [" · ", stamp(event.at)] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-2 text-sm text-fg",
					children: event.question
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					role: "tablist",
					"aria-label": event.question,
					className: "mt-3 grid grid-cols-3 border border-line",
					children: event.options.map((option) => {
						const selected = option.id === event.selectedId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": selected,
							onClick: () => onChoose(event.id, option.id),
							className: cn$2("min-h-11 px-2 text-sm", selected ? "bg-brass text-brass-ink" : "text-fg"),
							children: option.label
						}, option.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-col gap-2",
					children: event.options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: cn$2("text-sm", option.id === event.selectedId ? "text-fg" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: option.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [" · ", option.detail] })]
					}, option.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted",
					children: chosen ? `选择「${chosen.label}」。问题、全部可选项和选择已是一条指令。再点会改写它，不另起一条。` : "点一个选项。问题、全部可选项和选择会写成一条指令。"
				})
			]
		});
	}
	if (event.kind === "assistant") {
		const name = characters.find((item) => item.id === event.characterId)?.name ?? "角色";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "border border-line bg-surface p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-mono text-xs text-muted",
				children: [
					"模型 · ",
					name,
					" · ",
					modelLabel(event.modelId),
					" · ",
					stamp(event.at)
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm whitespace-pre-wrap text-fg",
				children: event.text
			})]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "border border-line bg-bg p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "font-mono text-xs text-brass",
			children: [
				"指令",
				event.kind === "handoff" ? " · 交接" : "",
				" · ",
				stamp(event.at)
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm whitespace-pre-wrap text-fg",
			children: event.text
		})]
	});
}
function ShadowCard({ session, onCommit, onDiscard, onSilent }) {
	const shadow = session.shadow;
	if (!shadow) return null;
	const status = shadow.status === "running" ? "探针在跑" : shadow.status === "silent" ? "无响应" : "待你写入";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "shrink-0 border-t border-ember bg-ember-ink px-4 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-mono text-xs text-ember",
					children: "影子探针 · 未写入"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-muted",
					children: status
				})]
			}),
			shadow.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-fg",
				children: [
					"会话模型仍是 ",
					modelLabel(shadow.fromModel),
					"。setModel 还没调用。"
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-muted",
					children: ["当前 · ", modelLabel(shadow.fromModel)]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-fg",
					children: shadow.currentText || "没有对照正文。"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-brass",
					children: ["候选 · ", modelLabel(shadow.toModel)]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-fg",
					children: shadow.status === "silent" ? "无响应，没有正文。CLI 不需要重启。" : shadow.probeText
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [
					shadow.status === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onCommit,
						className: "min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink",
						children: "写入会话"
					}) : null,
					shadow.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onSilent,
						className: "min-h-11 border border-ember px-3 text-sm text-ember",
						children: "记为无响应"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onDiscard,
						className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
						children: "放弃探针"
					})
				]
			})
		]
	});
}
function cn$1(...parts) {
	return parts.filter(Boolean).join(" ");
}
var field = "min-h-11 w-full border border-line bg-bg px-3 text-sm text-fg";
function DeskSide() {
	const side = useKeel((state) => state.side);
	const setSide = useKeel((state) => state.setSide);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-0 flex-1 flex-col",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid shrink-0 grid-cols-3 border-b border-line",
			children: [
				["session", "本会话"],
				["bridge", "脊桥"],
				["protocol", "协议"]
			].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setSide(id),
				className: cn$1("min-h-11 text-sm", side === id ? "text-brass" : "text-muted"),
				children: label
			}, id))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-0 flex-1 overflow-y-auto p-3",
			children: [
				side === "session" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionPanel, {}) : null,
				side === "bridge" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BridgePanel, {}) : null,
				side === "protocol" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProtocolPanel, {}) : null
			]
		})]
	});
}
function SessionPanel() {
	const sessions = useKeel((state) => state.sessions);
	const characters = useKeel((state) => state.characters);
	const plugins = useKeel((state) => state.plugins);
	const activeId = useKeel((state) => state.activeId);
	const swapCharacter = useKeel((state) => state.swapCharacter);
	const forkCharacter = useKeel((state) => state.forkCharacter);
	const beginShadow = useKeel((state) => state.beginShadow);
	const togglePlugin = useKeel((state) => state.togglePlugin);
	const session = sessions.find((item) => item.id === activeId) ?? sessions[0];
	const [characterId, setCharacterId] = (0, import_react.useState)(session?.characterId ?? "");
	const [modelId, setModelId] = (0, import_react.useState)(MODELS[0]?.id ?? "");
	(0, import_react.useEffect)(() => {
		if (session) setCharacterId(session.characterId);
	}, [session?.id, session?.characterId]);
	if (!session) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "没有会话。"
	});
	const sameCharacter = characterId === session.characterId;
	const refs = (id) => sessions.filter((item) => item.pluginIds.includes(id)).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "CHARACTER"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: characterId,
						onChange: (event) => setCharacterId(event.target.value),
						className: field,
						children: characters.map((character) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: character.id,
							children: [
								character.name,
								" · ",
								character.epithet
							]
						}, character.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: sameCharacter,
							onClick: () => swapCharacter(characterId),
							className: "min-h-11 border border-line bg-raised px-2 text-sm text-fg disabled:opacity-40",
							children: "热切换"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: sameCharacter,
							onClick: () => forkCharacter(characterId),
							className: "min-h-11 bg-brass px-2 text-sm font-medium text-brass-ink disabled:opacity-40",
							children: "分叉"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "热切换留在这条会话，不改模型。分叉才新建，handoff 是第一条指令。"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "flex flex-col gap-1",
						children: session.timeline.map((mark, index) => {
							const name = characters.find((item) => item.id === mark.characterId)?.name ?? mark.characterId;
							const verb = mark.kind === "bind" ? "绑定" : mark.kind === "swap" ? "换成" : "分叉为";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "font-mono text-xs text-muted",
								children: [
									stamp(mark.at),
									" ",
									verb,
									" ",
									name
								]
							}, `${mark.at}-${index}`);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "MODEL"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted",
						children: [
							"当前 ",
							modelLabel(session.modelId),
							"。写入探针之前不调用 setModel。"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: modelId,
						onChange: (event) => setModelId(event.target.value),
						className: field,
						children: MODELS.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: model.id,
							children: [
								model.label,
								" · ",
								model.note
							]
						}, model.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: Boolean(session.shadow) || modelId === session.modelId,
						onClick: () => beginShadow(modelId),
						className: "min-h-11 border border-ember px-3 text-sm text-ember disabled:opacity-40",
						children: session.shadow ? "已有未提交的探针" : "跑影子探针"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-muted",
					children: "PLUGINS"
				}), plugins.map((plugin) => {
					const on = session.pluginIds.includes(plugin.id);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"aria-pressed": on,
						onClick: () => togglePlugin(plugin.id),
						className: cn$1("flex min-h-11 items-center justify-between gap-2 border px-3 text-left text-sm", on ? "border-brass text-fg" : "border-line text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: plugin.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-mono text-xs",
							children: [
								on ? "已挂" : "未挂",
								" · 引用 ",
								refs(plugin.id)
							]
						})]
					}, plugin.id);
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid grid-cols-1 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						const doc = checkpointDocument({
							session,
							characters,
							plugins
						});
						saveFile(`keel-checkpoint-${session.id}.json`, new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
					},
					className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
					children: "导出 checkpoint"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						const markdown = handoffMarkdown({
							session,
							characters
						});
						saveFile(`keel-handoff-${session.id}.md`, new Blob([markdown], { type: "text/markdown" }));
					},
					className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
					children: "导出 handoff"
				})]
			})
		]
	});
}
function BridgePanel() {
	const plugins = useKeel((state) => state.plugins);
	const sessions = useKeel((state) => state.sessions);
	const faultPlugin = useKeel((state) => state.faultPlugin);
	const reapIdle = useKeel((state) => state.reapIdle);
	const math = bridgeMath(plugins, sessions);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-brass",
				children: "keel-bridge"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-fg",
				children: [
					"1 个监督进程 + ",
					math.live,
					" 个插件进程 = ",
					math.processes,
					"。若按会话各起一份，是 ",
					math.mounts,
					" ",
					"个子进程。"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2 border-l border-line pl-3",
				children: plugins.map((plugin) => {
					const refs = sessions.filter((session) => session.pluginIds.includes(plugin.id));
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "border border-line bg-bg p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-fg",
										children: plugin.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "font-mono text-xs text-muted",
										children: [
											plugin.transport,
											" · ",
											plugin.status === "ready" ? "运行" : plugin.status === "faulted" ? "故障" : "停止",
											" · 引用 ",
											refs.length,
											" · 崩溃 ",
											plugin.crashCount
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn$1("mt-1 size-2 shrink-0", plugin.status === "ready" && "bg-brass", plugin.status === "faulted" && "bg-ember", plugin.status === "stopped" && "bg-line") })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 font-mono text-xs break-all text-muted",
								children: plugin.command
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted",
								children: refs.length ? refs.map((session) => session.title).join("、") : "没有会话引用"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: plugin.status === "stopped",
								onClick: () => faultPlugin(plugin.id),
								className: "mt-2 min-h-11 border border-ember px-3 text-sm text-ember disabled:opacity-40",
								children: "注入故障"
							})
						]
					}, plugin.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: reapIdle,
				className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
				children: "回收空闲"
			})
		]
	});
}
function ProtocolPanel() {
	const [schemaId, setSchemaId] = (0, import_react.useState)(SCHEMAS[0]?.id ?? "bridge");
	const schema = SCHEMAS.find((item) => item.id === schemaId) ?? SCHEMAS[0];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2 text-sm text-fg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "INVARIANTS"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "进程数不随会话相乘。插件按引用计数，故障只重启那一个。" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "选项在选定之后才进入上下文，和直接指令同级。未提交的探针不算。" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "角色是 overlay。热切换留在原会话。分叉才交接。" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs text-muted",
						children: "SCHEMA"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: SCHEMAS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSchemaId(item.id),
							className: cn$1("min-h-11 border px-3 text-sm", item.id === schemaId ? "border-brass text-brass" : "border-line text-muted"),
							children: item.title
						}, item.id))
					}),
					schema ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "max-h-64 overflow-auto border border-line bg-bg p-3 font-mono text-xs whitespace-pre text-muted",
						children: JSON.stringify(schema.body, null, 2)
					}) : null
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CharacterBook, {})
		]
	});
}
function CharacterBook() {
	const characters = useKeel((state) => state.characters);
	const sessions = useKeel((state) => state.sessions);
	const saveCharacter = useKeel((state) => state.saveCharacter);
	const createCharacter = useKeel((state) => state.createCharacter);
	const deleteCharacter = useKeel((state) => state.deleteCharacter);
	const [editId, setEditId] = (0, import_react.useState)(characters[0]?.id ?? null);
	const editing = characters.find((character) => character.id === editId) ?? null;
	const [draft, setDraft] = (0, import_react.useState)(editing);
	const [fresh, setFresh] = (0, import_react.useState)({
		name: "",
		epithet: "",
		identity: "",
		tone: "",
		posture: "ask",
		defaultModel: MODELS[0]?.id ?? "grok-4"
	});
	const [error, setError] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setDraft(editing);
	}, [editing]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs text-muted",
				children: "CHARACTERS"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: characters.map((character) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setEditId(character.id),
					className: cn$1("min-h-11 border px-3 text-sm", character.id === editId ? "border-brass text-fg" : "border-line text-muted"),
					children: character.name
				}, character.id))
			}),
			draft ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft.name,
						onChange: (event) => setDraft({
							...draft,
							name: event.target.value
						}),
						"aria-label": "角色名",
						className: field
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft.epithet,
						onChange: (event) => setDraft({
							...draft,
							epithet: event.target.value
						}),
						"aria-label": "短称",
						className: field
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: draft.identity,
						onChange: (event) => setDraft({
							...draft,
							identity: event.target.value
						}),
						"aria-label": "身份",
						rows: 3,
						className: "w-full border border-line bg-bg px-3 py-2 text-sm text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: draft.tone,
						onChange: (event) => setDraft({
							...draft,
							tone: event.target.value
						}),
						"aria-label": "语气",
						className: field
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: draft.posture,
						"aria-label": "工具姿态",
						onChange: (event) => setDraft({
							...draft,
							posture: event.target.value
						}),
						className: field,
						children: Object.entries(POSTURE_LABEL).map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: id,
							children: ["工具 ", label]
						}, id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: draft.defaultModel,
						"aria-label": "默认模型",
						onChange: (event) => setDraft({
							...draft,
							defaultModel: event.target.value
						}),
						className: field,
						children: MODELS.map((model) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: model.id,
							children: ["默认 ", model.label]
						}, model.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => saveCharacter(draft),
							className: "min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink",
							children: "保存角色"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => deleteCharacter(draft.id),
							disabled: sessions.some((session) => session.characterId === draft.id),
							className: "min-h-11 border border-line px-3 text-sm text-muted disabled:opacity-40",
							children: "删除"
						})]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-2 border-t border-line pt-3",
				onSubmit: (event) => {
					event.preventDefault();
					if (!fresh.name.trim() || !fresh.identity.trim()) {
						setError("需要名称和身份。");
						return;
					}
					createCharacter(fresh);
					setFresh({
						...fresh,
						name: "",
						epithet: "",
						identity: "",
						tone: ""
					});
					setError("");
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "新角色"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: fresh.name,
						onChange: (event) => setFresh({
							...fresh,
							name: event.target.value
						}),
						placeholder: "名称",
						"aria-label": "新角色名称",
						className: field
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: fresh.epithet,
						onChange: (event) => setFresh({
							...fresh,
							epithet: event.target.value
						}),
						placeholder: "短称",
						"aria-label": "新角色短称",
						className: field
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: fresh.identity,
						onChange: (event) => setFresh({
							...fresh,
							identity: event.target.value
						}),
						placeholder: "身份",
						"aria-label": "新角色身份",
						rows: 2,
						className: "w-full border border-line bg-bg px-3 py-2 text-sm text-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "min-h-11 border border-brass px-3 text-sm text-brass",
						children: "添加角色"
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-ember",
						children: error
					}) : null
				]
			})
		]
	});
}
function cn(...parts) {
	return parts.filter(Boolean).join(" ");
}
function Mark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 24 24",
		className: "size-5 text-brass",
		"aria-hidden": "true",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M12 3v18M5 16l7 5 7-5",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6"
		})
	});
}
function KeelConsole() {
	const pane = useKeel((state) => state.pane);
	const setPane = useKeel((state) => state.setPane);
	const setSide = useKeel((state) => state.setSide);
	const sessions = useKeel((state) => state.sessions);
	const plugins = useKeel((state) => state.plugins);
	const characters = useKeel((state) => state.characters);
	const activeId = useKeel((state) => state.activeId);
	const notice = useKeel((state) => state.notice);
	const dismiss = useKeel((state) => state.dismiss);
	const reset = useKeel((state) => state.reset);
	const [arm, setArm] = (0, import_react.useState)(false);
	const math = bridgeMath(plugins, sessions);
	const session = sessions.find((item) => item.id === activeId) ?? sessions[0];
	function downloadPack() {
		if (!session) return;
		saveFile("keel-protocol.zip", protocolPack({
			session,
			characters,
			plugins
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh flex-col overflow-hidden bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex shrink-0 items-center gap-3 border-b border-line px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-9 shrink-0 items-center justify-center border border-brass",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-mono text-sm tracking-widest text-fg",
							children: "KEEL"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate font-mono text-xs text-muted tabular-nums",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-brass",
								children: [math.processes, " 进程"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								" ",
								"· 挂载 ",
								math.mounts,
								" · 省下 ",
								math.avoided
							] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex shrink-0 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: downloadPack,
							className: "min-h-11 border border-brass bg-brass px-3 text-sm font-medium text-brass-ink",
							children: "协议包"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								if (!arm) {
									setArm(true);
									return;
								}
								reset();
								setArm(false);
							},
							className: "min-h-11 border border-line bg-raised px-3 text-sm text-fg",
							children: arm ? "确认重置" : "重置"
						})]
					})
				]
			}),
			notice ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: dismiss,
				className: "shrink-0 border-b border-line px-4 py-2 text-left text-sm text-brass",
				children: [notice, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-2 text-muted",
					children: "点此收起"
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SessionRail, { visible: pane === "sessions" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecordPane, { visible: pane === "record" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: cn("min-h-0 w-full min-w-0 flex-col border-line bg-surface lg:flex lg:w-80 lg:shrink-0 lg:border-l", pane === "bridge" ? "flex" : "hidden"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeskSide, {})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "grid shrink-0 grid-cols-3 border-t border-line bg-surface lg:hidden",
				children: [
					["sessions", "会话"],
					["record", "记录"],
					["bridge", "脊桥"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (id === "bridge") setSide("bridge");
						else setPane(id);
					},
					className: cn("min-h-14 font-mono text-xs", pane === id ? "text-brass" : "text-muted"),
					children: label
				}, id))
			})
		]
	});
}
function SessionRail({ visible }) {
	const sessions = useKeel((state) => state.sessions);
	const characters = useKeel((state) => state.characters);
	const activeId = useKeel((state) => state.activeId);
	const selectSession = useKeel((state) => state.selectSession);
	const createSession = useKeel((state) => state.createSession);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [title, setTitle] = (0, import_react.useState)("");
	const [characterId, setCharacterId] = (0, import_react.useState)(characters[0]?.id ?? "");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("min-h-0 w-full min-w-0 flex-col border-line bg-surface lg:flex lg:w-64 lg:shrink-0 lg:border-r", visible ? "flex" : "hidden"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2 border-b border-line px-3 py-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-muted",
					children: "SESSION"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setOpen((value) => !value),
					className: "min-h-11 px-2 text-sm text-brass",
					children: open ? "取消" : "新会话"
				})]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3 border-b border-line p-3",
				onSubmit: (event) => {
					event.preventDefault();
					createSession(title, characterId);
					setTitle("");
					setOpen(false);
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1 text-sm text-muted",
						children: ["标题", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: title,
							onChange: (event) => setTitle(event.target.value),
							placeholder: "未命名也可以",
							className: "min-h-11 border border-line bg-bg px-3 text-fg"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1 text-sm text-muted",
						children: ["角色", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: characterId,
							onChange: (event) => setCharacterId(event.target.value),
							className: "min-h-11 border border-line bg-bg px-3 text-fg",
							children: characters.map((character) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: character.id,
								children: [
									character.name,
									" · ",
									character.epithet
								]
							}, character.id))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink",
						children: "创建"
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 overflow-y-auto",
				children: sessions.map((session) => {
					const character = characters.find((item) => item.id === session.characterId);
					const pending = session.events.some((event) => event.kind === "decision" && !event.selectedId);
					const active = session.id === activeId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => selectSession(session.id),
						className: cn("relative flex w-full flex-col gap-1 border-b border-line px-3 py-3 text-left", active && "bg-raised"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute inset-y-0 left-0 w-0.5", active ? "bg-brass" : "bg-transparent") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-fg",
								children: session.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-xs text-muted",
								children: [
									character?.name ?? "无角色",
									pending ? " · 待选" : "",
									session.shadow ? " · 探针" : ""
								]
							})
						]
					}, session.id);
				})
			})
		]
	});
}
function Home() {
	(0, import_react.useEffect)(() => {
		useKeel.persist.rehydrate();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeelConsole, {});
}
//#endregion
export { Home as component };
