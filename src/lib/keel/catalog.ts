export type ModelSpec = {
  id: string;
  label: string;
  note: string;
};

export const MODELS: ModelSpec[] = [
  { id: "copilot-fusion", label: "Copilot Fusion", note: "按步路由" },
  { id: "gpt-5.4", label: "GPT-5.4", note: "结构化" },
  { id: "claude-sonnet-4.6", label: "Claude Sonnet 4.6", note: "先收边界" },
  { id: "grok-4", label: "Grok 4", note: "只推下一步" },
  { id: "gpt-5-mini", label: "GPT-5 mini", note: "短答" },
];

export function modelLabel(id: string): string {
  return MODELS.find((m) => m.id === id)?.label ?? id;
}

export const POSTURE_LABEL: Record<string, string> = {
  ask: "询问",
  allow: "放行",
  deny: "拒绝",
};
