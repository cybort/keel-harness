import { create } from "zustand";
import { persist } from "zustand/middleware";
import { answerTurn, forcedQuestion, probeLine } from "./engine";
import { handoffMarkdown } from "./protocol";
import type {
  Character,
  MobilePane,
  Plugin,
  Posture,
  Session,
  SideTab,
  TranscriptEvent,
} from "./types";
import { uid } from "./types";

const BASE = Date.UTC(2026, 10, 22, 18, 40, 0);
const minute = (n: number) => BASE + n * 60_000;

const SEED_CHARACTERS: Character[] = [
  {
    id: "surveyor",
    name: "测线",
    epithet: "Surveyor",
    identity: "把含糊收成可选项。不在边界清楚之前改运行时。",
    tone: "短句。先问再动。",
    posture: "ask",
    defaultModel: "claude-sonnet-4.6",
  },
  {
    id: "archivist",
    name: "档史",
    epithet: "Archivist",
    identity: "把已决、未决和约束写成可以交接的记录。",
    tone: "分段。已决和未决不混写。",
    posture: "allow",
    defaultModel: "gpt-5.4",
  },
  {
    id: "edge",
    name: "锋面",
    epithet: "Edge",
    identity: "只推下一步。拒绝顺手重构和顺手换模型。",
    tone: "命令式。一次一件事。",
    posture: "deny",
    defaultModel: "grok-4",
  },
];

const SEED_PLUGINS: Plugin[] = [
  {
    id: "github",
    name: "github-mcp",
    transport: "stdio",
    command: "github-mcp-server",
    status: "ready",
    crashCount: 0,
    lastUsed: minute(12),
  },
  {
    id: "context7",
    name: "context7",
    transport: "stdio",
    command: "npx -y @upstash/context7-mcp",
    status: "ready",
    crashCount: 0,
    lastUsed: minute(8),
  },
  {
    id: "notion",
    name: "notion",
    transport: "http",
    command: "https://mcp.notion.com/mcp",
    status: "ready",
    crashCount: 0,
    lastUsed: minute(4),
  },
  {
    id: "keel",
    name: "keel-tools",
    transport: "stdio",
    command: "keel-bridge tools",
    status: "ready",
    crashCount: 0,
    lastUsed: minute(14),
  },
  {
    id: "memory",
    name: "copilot-memory",
    transport: "stdio",
    command: "copilot-memory",
    status: "stopped",
    crashCount: 1,
    lastUsed: minute(1),
  },
];

function eventInstruction(id: string, at: number, text: string): TranscriptEvent {
  return { id, at, kind: "instruction", role: "user", text };
}

function seedSessions(): Session[] {
  return [
    {
      id: "s-bridge",
      title: "聚合 MCP，不再按会话起进程",
      characterId: "surveyor",
      modelId: "claude-sonnet-4.6",
      pluginIds: ["github", "context7", "keel"],
      createdAt: minute(0),
      shadow: null,
      timeline: [{ at: minute(0), characterId: "surveyor", kind: "bind" }],
      events: [
        eventInstruction(
          "e-b1",
          minute(1),
          "五个会话都要 github、context7 和文件系统。现在是会话数乘插件数，CLI 一起动就卡。",
        ),
        {
          id: "e-b2",
          at: minute(2),
          kind: "tool",
          role: "tool",
          pluginId: "keel",
          toolName: "bridge.call",
          text: "bridge.call keel-tools · 共享进程 · 引用不随会话相乘",
        },
        {
          id: "e-b3",
          at: minute(3),
          kind: "assistant",
          role: "assistant",
          characterId: "surveyor",
          modelId: "claude-sonnet-4.6",
          text: "脊桥只留一份进程。会话拿引用，不拿子进程。github-mcp 的引用计数等于挂上它的会话数。",
        },
        {
          id: "e-b4",
          at: minute(4),
          kind: "decision",
          role: "user",
          question: "单个插件崩溃时，脊桥怎么处置？",
          selectedId: null,
          options: [
            { id: "restart", label: "原地重启", detail: "只重启该进程。会话、其它插件、模型都保持。" },
            { id: "detach", label: "摘掉引用", detail: "会话继续，但失去这个工具。进程停在故障。" },
            { id: "reboot", label: "整桥重启", detail: "所有会话的工具调用中断。这是要避免的路径。" },
          ],
        },
      ],
    },
    {
      id: "s-model",
      title: "换模型，但别把 CLI 挂死",
      characterId: "edge",
      modelId: "grok-4",
      pluginIds: ["github", "keel"],
      createdAt: minute(5),
      timeline: [{ at: minute(5), characterId: "edge", kind: "bind" }],
      events: [
        eventInstruction(
          "e-m1",
          minute(6),
          "/model 一切，Copilot CLI 就不再回。我要在这个会话里换成 GPT-5.4，历史还在。",
        ),
        {
          id: "e-m2",
          at: minute(7),
          kind: "assistant",
          role: "assistant",
          characterId: "edge",
          modelId: "grok-4",
          text: "不要走 /model。影子探针先跑一轮。你点写入之前，setModel 不会被调用，进程也不换。",
        },
      ],
      shadow: {
        id: "shadow-seed",
        fromModel: "grok-4",
        toModel: "gpt-5.4",
        status: "ready",
        startedAt: minute(8),
        currentText: probeLine("grok-4", "换成 GPT-5.4，历史还在"),
        probeText: probeLine("gpt-5.4", "换成 GPT-5.4，历史还在"),
      },
    },
    {
      id: "s-hand",
      title: "决策要能原样交接",
      characterId: "archivist",
      modelId: "gpt-5.4",
      pluginIds: ["notion", "keel"],
      createdAt: minute(9),
      shadow: null,
      timeline: [{ at: minute(9), characterId: "archivist", kind: "bind" }],
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
            { id: "ask", label: "每步询问", detail: "每次调用都要你点头。选择本身写成指令。" },
            { id: "read", label: "只读放行", detail: "读放行，写和外部调用仍询问。" },
            { id: "allow", label: "全部放行", detail: "不再拦。交接时必须写明这是你的选择。" },
          ],
        },
        {
          id: "e-h3",
          at: minute(12),
          kind: "assistant",
          role: "assistant",
          characterId: "archivist",
          modelId: "gpt-5.4",
          text: "已作为用户级指令写入。导出 handoff 时，问题和全部可选项会跟选择一起走，不是一句「用户选了询问」。",
        },
      ],
    },
  ];
}

type Data = {
  sessions: Session[];
  characters: Character[];
  plugins: Plugin[];
  activeId: string;
};

function seedData(): Data {
  return {
    sessions: seedSessions(),
    characters: SEED_CHARACTERS,
    plugins: SEED_PLUGINS,
    activeId: "s-bridge",
  };
}

function sys(text: string): TranscriptEvent {
  return { id: uid("e"), at: Date.now(), kind: "system", role: "system", text };
}

function patchSession(sessions: Session[], id: string, fn: (session: Session) => Session) {
  return sessions.map((session) => (session.id === id ? fn(session) : session));
}

export type KeelState = Data & {
  pane: MobilePane;
  side: SideTab;
  draft: string;
  notice: string | null;
  setPane: (pane: MobilePane) => void;
  setSide: (side: SideTab) => void;
  setDraft: (draft: string) => void;
  dismiss: () => void;
  selectSession: (id: string) => void;
  createSession: (title: string, characterId: string) => void;
  send: () => void;
  ask: () => void;
  choose: (eventId: string, optionId: string) => void;
  beginShadow: (modelId: string) => void;
  silenceShadow: () => void;
  commitShadow: () => void;
  discardShadow: () => void;
  swapCharacter: (characterId: string) => void;
  forkCharacter: (characterId: string) => void;
  togglePlugin: (pluginId: string) => void;
  faultPlugin: (pluginId: string) => void;
  reapIdle: () => void;
  saveCharacter: (character: Character) => void;
  createCharacter: (input: {
    name: string;
    epithet: string;
    identity: string;
    tone: string;
    posture: Posture;
    defaultModel: string;
  }) => void;
  deleteCharacter: (id: string) => void;
  reset: () => void;
};

function activeSession(state: Data): Session | undefined {
  return state.sessions.find((session) => session.id === state.activeId) ?? state.sessions[0];
}

export const useKeel = create<KeelState>()(
  persist(
    (set, get) => ({
      ...seedData(),
      pane: "record",
      side: "session",
      draft: "",
      notice: null,
      setPane: (pane) => set({ pane }),
      setSide: (side) => set({ side, pane: side === "session" ? get().pane : "bridge" }),
      setDraft: (draft) => set({ draft }),
  dismiss: () => set({ notice: null }),
      selectSession: (id) => set({ activeId: id, pane: "record", side: "session" }),
      createSession: (title, characterId) => {
        const state = get();
        const character = state.characters.find((item) => item.id === characterId);
        if (!character) return;
        const now = Date.now();
        const session: Session = {
          id: uid("s"),
          title: title.trim() || "未命名会话",
          characterId: character.id,
          modelId: character.defaultModel,
          pluginIds: ["github", "keel"].filter((id) => state.plugins.some((plugin) => plugin.id === id)),
          events: [],
          shadow: null,
          timeline: [{ at: now, characterId: character.id, kind: "bind" }],
          createdAt: now,
        };
        const sessions = [...state.sessions, session];
        const plugins = state.plugins.map((plugin) =>
          session.pluginIds.includes(plugin.id) && plugin.status === "stopped"
            ? { ...plugin, status: "ready" as const, lastUsed: now }
            : plugin,
        );
        set({
          sessions,
          plugins,
          activeId: session.id,
          pane: "record",
          side: "session",
          notice: `会话已建。角色 ${character.name}，模型 ${character.defaultModel}。插件只增加引用。`,
        });
      },
      send: () => {
        const state = get();
        const text = state.draft.trim();
        const session = activeSession(state);
        if (!text || !session) return;
        const character = state.characters.find((item) => item.id === session.characterId);
        if (!character) return;
        const attached = state.plugins.filter(
          (plugin) => session.pluginIds.includes(plugin.id) && plugin.status !== "stopped",
        );
        const turn = answerTurn({
          character,
          modelId: session.modelId,
          text,
          pluginNames: attached.map((plugin) => plugin.name),
        });
        const now = Date.now();
        const events = [...session.events];
        events.push({ id: uid("e"), at: now, kind: "instruction", role: "user", text });
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
            text: `bridge.call ${plugin.name} · 共享进程 · 引用 ${state.sessions.filter((item) => item.pluginIds.includes(plugin.id)).length}`,
          });
          plugins = plugins.map((item) =>
            item.id === plugin.id ? { ...item, lastUsed: now } : item,
          );
        }
        events.push({
          id: uid("e"),
          at: now + 2,
          kind: "assistant",
          role: "assistant",
          characterId: character.id,
          modelId: session.modelId,
          text: turn.assistant,
        });
        if (turn.decision) {
          events.push({
            id: uid("e"),
            at: now + 3,
            kind: "decision",
            role: "user",
            question: turn.decision.question,
            options: turn.decision.options,
            selectedId: null,
          });
        }
        set({
          draft: "",
          plugins,
          sessions: patchSession(state.sessions, session.id, (current) => ({ ...current, events })),
        });
      },
      ask: () => {
        const state = get();
        const session = activeSession(state);
        if (!session) return;
        const character = state.characters.find((item) => item.id === session.characterId);
        if (!character) return;
        const asked = forcedQuestion(character);
        const events = [
          ...session.events,
          {
            id: uid("e"),
            at: Date.now(),
            kind: "decision" as const,
            role: "user" as const,
            question: asked.question,
            options: asked.options,
            selectedId: null,
          },
        ];
        set({
          sessions: patchSession(state.sessions, session.id, (current) => ({ ...current, events })),
        });
      },
      choose: (eventId, optionId) => {
        const state = get();
        const session = activeSession(state);
        if (!session) return;
        set({
          notice: "这条选择已写成指令，和打字进来的话同级。",
          sessions: patchSession(state.sessions, session.id, (current) => ({
            ...current,
            events: current.events.map((event) =>
              event.kind === "decision" && event.id === eventId
                ? { ...event, selectedId: optionId }
                : event,
            ),
          })),
        });
      },
      beginShadow: (modelId) => {
        const state = get();
        const session = activeSession(state);
        if (!session || session.shadow || modelId === session.modelId) return;
        const last = [...session.events]
          .reverse()
          .find(
            (event) =>
              event.kind === "instruction" ||
              event.kind === "handoff" ||
              (event.kind === "decision" && event.selectedId),
          );
        const subject =
          last?.kind === "instruction" || last?.kind === "handoff"
            ? last.text
            : last?.kind === "decision"
              ? last.question
              : session.title;
        const id = uid("shadow");
        const shadow = {
          id,
          fromModel: session.modelId,
          toModel: modelId,
          status: "running" as const,
          currentText: "",
          probeText: "",
          startedAt: Date.now(),
        };
        set({
          notice: "探针在跑。setModel 还没调用。",
          sessions: patchSession(state.sessions, session.id, (current) => ({ ...current, shadow })),
        });
        window.setTimeout(() => {
          const latest = get();
          const current = latest.sessions.find((item) => item.id === session.id);
          if (!current?.shadow || current.shadow.id !== id || current.shadow.status !== "running") return;
          set({
            notice: "探针好了。写入之前，会话模型不变。",
            sessions: patchSession(latest.sessions, session.id, (item) => ({
              ...item,
              shadow: item.shadow
                ? {
                    ...item.shadow,
                    status: "ready",
                    currentText: probeLine(item.modelId, subject),
                    probeText: probeLine(modelId, subject),
                  }
                : null,
            })),
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
            shadow: current.shadow ? { ...current.shadow, status: "silent" } : null,
          })),
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
            kind: "assistant" as const,
            role: "assistant" as const,
            characterId: character?.id ?? session.characterId,
            modelId: shadow.toModel,
            text: shadow.probeText,
          },
        ];
        set({
          notice: "已写入。这一步才相当于 setModel。",
          sessions: patchSession(state.sessions, session.id, (current) => ({
            ...current,
            modelId: shadow.toModel,
            shadow: null,
            events,
          })),
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
            events: [...current.events, sys(`放弃影子切换，模型仍是 ${from}。`)],
          })),
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
            timeline: [...current.timeline, { at, characterId: next.id, kind: "swap" }],
            events: [
              ...current.events,
              sys(`角色由 ${prev?.name ?? "未知"} 换成 ${next.name}。会话未重建，模型仍是 ${current.modelId}。`),
            ],
          })),
        });
      },
      forkCharacter: (characterId) => {
        const state = get();
        const session = activeSession(state);
        const target = state.characters.find((item) => item.id === characterId);
        const source = state.characters.find((item) => item.id === session?.characterId);
        if (!session || !target || target.id === session.characterId) return;
        const now = Date.now();
        const text = handoffMarkdown({ session, characters: state.characters, target });
        const child: Session = {
          id: uid("s"),
          title: `${session.title} · ${target.name}`,
          characterId: target.id,
          modelId: target.defaultModel,
          pluginIds: [...session.pluginIds],
          events: [
            {
              id: uid("e"),
              at: now,
              kind: "handoff",
              role: "user",
              text,
              sourceSessionId: session.id,
            },
          ],
          shadow: null,
          timeline: [{ at: now, characterId: target.id, kind: "fork" }],
          createdAt: now,
          parentId: session.id,
        };
        set({
          notice: `已分叉。新会话第一条指令就是 handoff，模型用 ${target.defaultModel}。`,
          activeId: child.id,
          pane: "record",
          side: "session",
          sessions: [
            ...patchSession(state.sessions, session.id, (current) => ({
              ...current,
              events: [
                ...current.events,
                sys(`已分叉给 ${target.name}。本会话保持 ${source?.name ?? "原角色"}。`),
              ],
            })),
            child,
          ],
        });
      },
      togglePlugin: (pluginId) => {
        const state = get();
        const session = activeSession(state);
        const plugin = state.plugins.find((item) => item.id === pluginId);
        if (!session || !plugin) return;
        const has = session.pluginIds.includes(pluginId);
        const now = Date.now();
        const pluginIds = has
          ? session.pluginIds.filter((id) => id !== pluginId)
          : [...session.pluginIds, pluginId];
        const plugins = state.plugins.map((item) => {
          if (item.id !== pluginId) return item;
          if (!has && item.status === "stopped") return { ...item, status: "ready" as const, lastUsed: now };
          return { ...item, lastUsed: now };
        });
        set({
          plugins,
          notice: has
            ? `摘下 ${plugin.name}。进程还在，直到回收。`
            : `挂上 ${plugin.name}。已有进程只加引用，不新起一份。`,
          sessions: patchSession(state.sessions, session.id, (current) => ({
            ...current,
            pluginIds,
            events: [
              ...current.events,
              sys(
                has
                  ? `摘下 ${plugin.name}。引用减少，进程仍由脊桥持有。`
                  : `挂上 ${plugin.name}。走共享进程。`,
              ),
            ],
          })),
        });
      },
      faultPlugin: (pluginId) => {
        const state = get();
        const plugin = state.plugins.find((item) => item.id === pluginId);
        if (!plugin || plugin.status === "stopped") return;
        const sessions = state.sessions.map((session) =>
          session.pluginIds.includes(pluginId)
            ? {
                ...session,
                events: [
                  ...session.events,
                  sys(`${plugin.name} 故障。脊桥只重启这一进程，会话和其它插件保持。`),
                ],
              }
            : session,
        );
        set({
          notice: `${plugin.name} 故障，只重启它。`,
          sessions,
          plugins: state.plugins.map((item) =>
            item.id === pluginId
              ? { ...item, status: "faulted" as const, crashCount: item.crashCount + 1 }
              : item,
          ),
        });
        window.setTimeout(() => {
          const latest = get();
          const current = latest.plugins.find((item) => item.id === pluginId);
          if (!current || current.status !== "faulted") return;
          set({
            plugins: latest.plugins.map((item) =>
              item.id === pluginId ? { ...item, status: "ready" as const, lastUsed: Date.now() } : item,
            ),
            notice: `${plugin.name} 已在原位恢复。`,
          });
        }, 700);
      },
      reapIdle: () => {
        const state = get();
        const used = new Set(state.sessions.flatMap((session) => session.pluginIds));
        let reaped = 0;
        const plugins = state.plugins.map((plugin) => {
          if (!used.has(plugin.id) && plugin.status !== "stopped") {
            reaped += 1;
            return { ...plugin, status: "stopped" as const };
          }
          return plugin;
        });
        set({
          plugins,
          notice: reaped ? `回收了 ${reaped} 个零引用插件。` : "没有零引用的插件。",
        });
      },
      saveCharacter: (character) => {
        set({
          characters: get().characters.map((item) => (item.id === character.id ? character : item)),
          notice: `已更新角色 ${character.name}。`,
        });
      },
      createCharacter: (input) => {
        const name = input.name.trim();
        const identity = input.identity.trim();
        if (!name || !identity) return;
        const character: Character = {
          id: uid("c"),
          name,
          epithet: input.epithet.trim() || "Custom",
          identity,
          tone: input.tone.trim() || "按身份说话。",
          posture: input.posture,
          defaultModel: input.defaultModel,
        };
        set({
          characters: [...get().characters, character],
          notice: `角色 ${name} 已加入。新建会话时可以指定。`,
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
          notice: "角色已删除。",
        });
      },
      reset: () => {
        const data = seedData();
        set({
          ...data,
          pane: "record",
          side: "session",
          draft: "",
          notice: "已回到示例。",
        });
      },
    }),
    {
      name: "keel-harness-v1",
      skipHydration: true,
      partialize: (state) => ({
        sessions: state.sessions,
        characters: state.characters,
        plugins: state.plugins,
        activeId: state.activeId,
        pane: state.pane,
        side: state.side,
        draft: state.draft,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<KeelState>),
        notice: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.sessions = state.sessions.map((session) =>
          session.shadow?.status === "running"
            ? { ...session, shadow: { ...session.shadow, status: "silent" } }
            : session,
        );
      },
    },
  ),
);
