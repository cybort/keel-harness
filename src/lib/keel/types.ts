export type Posture = "ask" | "allow" | "deny";

export type Choice = {
  id: string;
  label: string;
  detail: string;
};

export type TranscriptEvent =
  | { id: string; at: number; kind: "instruction"; role: "user"; text: string }
  | {
      id: string;
      at: number;
      kind: "decision";
      role: "user";
      question: string;
      options: Choice[];
      selectedId: string | null;
    }
  | {
      id: string;
      at: number;
      kind: "assistant";
      role: "assistant";
      text: string;
      characterId: string;
      modelId: string;
    }
  | { id: string; at: number; kind: "handoff"; role: "user"; text: string; sourceSessionId: string }
  | { id: string; at: number; kind: "system"; role: "system"; text: string }
  | {
      id: string;
      at: number;
      kind: "tool";
      role: "tool";
      text: string;
      pluginId: string;
      toolName: string;
    };

export type ShadowStatus = "running" | "ready" | "silent";

export type ShadowProbe = {
  id: string;
  fromModel: string;
  toModel: string;
  status: ShadowStatus;
  currentText: string;
  probeText: string;
  startedAt: number;
};

export type TimelineMark = {
  at: number;
  characterId: string;
  kind: "bind" | "swap" | "fork";
};

export type Character = {
  id: string;
  name: string;
  epithet: string;
  identity: string;
  tone: string;
  posture: Posture;
  defaultModel: string;
};

export type PluginStatus = "stopped" | "ready" | "faulted";

export type Plugin = {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command: string;
  status: PluginStatus;
  crashCount: number;
  lastUsed: number;
};

export type Session = {
  id: string;
  title: string;
  characterId: string;
  modelId: string;
  pluginIds: string[];
  events: TranscriptEvent[];
  shadow: ShadowProbe | null;
  timeline: TimelineMark[];
  createdAt: number;
  parentId?: string;
};

export type MobilePane = "sessions" | "record" | "bridge";
export type SideTab = "session" | "bridge" | "protocol";

export type ContextBlock = {
  eventId: string;
  role: "user" | "assistant";
  weight: "instruction";
  kind: "instruction" | "decision" | "handoff" | "assistant";
  text: string;
};

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function stamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
