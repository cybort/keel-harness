import { useEffect, useRef, useState } from "react";
import { modelLabel } from "@/lib/keel/catalog";
import { contextBlocks } from "@/lib/keel/protocol";
import { useKeel } from "@/lib/keel/store";
import type { Session, TranscriptEvent } from "@/lib/keel/types";
import { stamp } from "@/lib/keel/types";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function RecordPane({ visible }: { visible: boolean }) {
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
  const [view, setView] = useState<"log" | "context">("log");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scroller.current;
    if (!node || view !== "log") return;
    node.scrollTop = node.scrollHeight;
  }, [session?.id, session?.events.length, view]);

  if (!session) {
    return <section className="flex flex-1 items-center justify-center p-6 text-muted">还没有会话。</section>;
  }

  const character = characters.find((item) => item.id === session.characterId);
  const blocks = contextBlocks(session);
  const decisions = blocks.filter((block) => block.kind === "decision").length;

  return (
    <section
      className={cn(
        "min-h-0 min-w-0 flex-1 flex-col lg:flex",
        visible ? "flex" : "hidden",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base text-fg">{session.title}</h2>
          <p className="font-mono text-xs text-muted">
            {character?.name ?? "无角色"} · {modelLabel(session.modelId)} · 本地运行时
          </p>
        </div>
        <div className="flex shrink-0 border border-line">
          <button
            type="button"
            onClick={() => setView("log")}
            className={cn("min-h-11 px-3 text-sm", view === "log" ? "bg-raised text-fg" : "text-muted")}
          >
            记录
          </button>
          <button
            type="button"
            onClick={() => setView("context")}
            className={cn("min-h-11 px-3 text-sm", view === "context" ? "bg-raised text-fg" : "text-muted")}
          >
            上下文
          </button>
        </div>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {view === "log" ? (
          <div className="flex flex-col gap-3">
            {session.events.length === 0 ? (
              <p className="text-sm text-muted">还没有指令。直接写，或让角色发问。选项和打字是同一级。</p>
            ) : (
              session.events.map((event) => (
                <EventCard key={event.id} event={event} characters={characters} onChoose={choose} />
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              模型看到 {blocks.length} 条。其中决策 {decisions} 条，role 与直接指令相同。工具、系统事件、未选问题和未提交探针不在这里。
            </p>
            {blocks.map((block) => (
              <article key={block.eventId} className="border border-line bg-surface p-3">
                <p className="font-mono text-xs text-brass">
                  {block.role === "user" ? "指令" : "模型"}
                  {block.kind === "decision" ? " · 选项" : ""}
                  {block.kind === "handoff" ? " · 交接" : ""}
                </p>
                <pre className="mt-2 font-sans text-sm whitespace-pre-wrap text-fg">{block.text}</pre>
              </article>
            ))}
          </div>
        )}
      </div>
      {session.shadow ? (
        <ShadowCard
          session={session}
          onCommit={commitShadow}
          onDiscard={discardShadow}
          onSilent={silenceShadow}
        />
      ) : null}
      <form
        className="flex shrink-0 items-end gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="keel-draft">
          直接指令
        </label>
        <textarea
          id="keel-draft"
          value={draft}
          rows={2}
          placeholder="直接指令。和选项决定是同一级。"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          className="min-h-11 flex-1 resize-none border border-line bg-bg px-3 py-2 text-sm text-fg"
        />
        <button
          type="button"
          onClick={ask}
          className="min-h-11 border border-line bg-raised px-3 text-sm text-fg"
        >
          发问
        </button>
        <button
          type="submit"
          disabled={!draft.trim()}
          className="min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink disabled:opacity-40"
        >
          发送
        </button>
      </form>
    </section>
  );
}

function EventCard({
  event,
  characters,
  onChoose,
}: {
  event: TranscriptEvent;
  characters: { id: string; name: string }[];
  onChoose: (eventId: string, optionId: string) => void;
}) {
  if (event.kind === "system") {
    return <p className="font-mono text-xs text-muted">{event.text}</p>;
  }
  if (event.kind === "tool") {
    return (
      <p className="border border-line bg-surface px-3 py-2 font-mono text-xs text-muted">
        脊桥 · {event.text}
      </p>
    );
  }
  if (event.kind === "decision") {
    const chosen = event.options.find((option) => option.id === event.selectedId);
    return (
      <article
        className={cn(
          "border bg-surface p-3",
          event.selectedId ? "border-brass" : "border-ember",
        )}
      >
        <p className="font-mono text-xs text-muted">
          <span className={event.selectedId ? "text-brass" : "text-ember"}>
            {event.selectedId ? "指令" : "待选"}
          </span>
          <span> · {stamp(event.at)}</span>
        </p>
        <h3 className="mt-2 text-sm text-fg">{event.question}</h3>
        <div role="tablist" aria-label={event.question} className="mt-3 grid grid-cols-3 border border-line">
          {event.options.map((option) => {
            const selected = option.id === event.selectedId;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onChoose(event.id, option.id)}
                className={cn(
                  "min-h-11 px-2 text-sm",
                  selected ? "bg-brass text-brass-ink" : "text-fg",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {event.options.map((option) => (
            <li
              key={option.id}
              className={cn("text-sm", option.id === event.selectedId ? "text-fg" : "text-muted")}
            >
              <span className="text-fg">{option.label}</span>
              <span> · {option.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          {chosen
            ? `选择「${chosen.label}」。问题、全部可选项和选择已是一条指令。再点会改写它，不另起一条。`
            : "点一个选项。问题、全部可选项和选择会写成一条指令。"}
        </p>
      </article>
    );
  }
  if (event.kind === "assistant") {
    const name = characters.find((item) => item.id === event.characterId)?.name ?? "角色";
    return (
      <article className="border border-line bg-surface p-3">
        <p className="font-mono text-xs text-muted">
          模型 · {name} · {modelLabel(event.modelId)} · {stamp(event.at)}
        </p>
        <p className="mt-2 text-sm whitespace-pre-wrap text-fg">{event.text}</p>
      </article>
    );
  }
  return (
    <article className="border border-line bg-bg p-3">
      <p className="font-mono text-xs text-brass">
        指令{event.kind === "handoff" ? " · 交接" : ""} · {stamp(event.at)}
      </p>
      <p className="mt-2 text-sm whitespace-pre-wrap text-fg">{event.text}</p>
    </article>
  );
}

function ShadowCard({
  session,
  onCommit,
  onDiscard,
  onSilent,
}: {
  session: Session;
  onCommit: () => void;
  onDiscard: () => void;
  onSilent: () => void;
}) {
  const shadow = session.shadow;
  if (!shadow) return null;
  const status =
    shadow.status === "running" ? "探针在跑" : shadow.status === "silent" ? "无响应" : "待你写入";
  return (
    <section className="shrink-0 border-t border-ember bg-ember-ink px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-xs text-ember">影子探针 · 未写入</h2>
        <p className="font-mono text-xs text-muted">{status}</p>
      </div>
      {shadow.status === "running" ? (
        <p className="mt-2 text-sm text-fg">会话模型仍是 {modelLabel(shadow.fromModel)}。setModel 还没调用。</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs text-muted">当前 · {modelLabel(shadow.fromModel)}</p>
            <p className="mt-1 text-sm text-fg">{shadow.currentText || "没有对照正文。"}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-brass">候选 · {modelLabel(shadow.toModel)}</p>
            <p className="mt-1 text-sm text-fg">
              {shadow.status === "silent" ? "无响应，没有正文。CLI 不需要重启。" : shadow.probeText}
            </p>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {shadow.status === "ready" ? (
          <button type="button" onClick={onCommit} className="min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink">
            写入会话
          </button>
        ) : null}
        {shadow.status === "running" ? (
          <button type="button" onClick={onSilent} className="min-h-11 border border-ember px-3 text-sm text-ember">
            记为无响应
          </button>
        ) : null}
        <button type="button" onClick={onDiscard} className="min-h-11 border border-line bg-raised px-3 text-sm text-fg">
          放弃探针
        </button>
      </div>
    </section>
  );
}
