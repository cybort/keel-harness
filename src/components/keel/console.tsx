import { useState } from "react";
import { bridgeMath, protocolPack } from "@/lib/keel/protocol";
import { useKeel } from "@/lib/keel/store";
import { saveFile } from "@/lib/keel/zip";
import { RecordPane } from "./record";
import { DeskSide } from "./side";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 text-brass" aria-hidden="true">
      <path d="M12 3v18M5 16l7 5 7-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function KeelConsole() {
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
  const [arm, setArm] = useState(false);
  const math = bridgeMath(plugins, sessions);
  const session = sessions.find((item) => item.id === activeId) ?? sessions[0];

  function downloadPack() {
    if (!session) return;
    saveFile("keel-protocol.zip", protocolPack({ session, characters, plugins }));
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center border border-brass">
          <Mark />
        </span>
        <div className="min-w-0">
          <h1 className="font-mono text-sm tracking-widest text-fg">KEEL</h1>
          <p className="truncate font-mono text-xs text-muted tabular-nums">
            <span className="text-brass">{math.processes} 进程</span>
            <span>
              {" "}
              · 挂载 {math.mounts} · 省下 {math.avoided}
            </span>
          </p>
        </div>
        <div className="ml-auto flex shrink-0 gap-2">
          <button
            type="button"
            onClick={downloadPack}
            className="min-h-11 border border-brass bg-brass px-3 text-sm font-medium text-brass-ink"
          >
            协议包
          </button>
          <button
            type="button"
            onClick={() => {
              if (!arm) {
                setArm(true);
                return;
              }
              reset();
              setArm(false);
            }}
            className="min-h-11 border border-line bg-raised px-3 text-sm text-fg"
          >
            {arm ? "确认重置" : "重置"}
          </button>
        </div>
      </header>
      {notice ? (
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 border-b border-line px-4 py-2 text-left text-sm text-brass"
        >
          {notice}
          <span className="ml-2 text-muted">点此收起</span>
        </button>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <SessionRail visible={pane === "sessions"} />
        <RecordPane visible={pane === "record"} />
        <aside
          className={cn(
            "min-h-0 w-full min-w-0 flex-col border-line bg-surface lg:flex lg:w-80 lg:shrink-0 lg:border-l",
            pane === "bridge" ? "flex" : "hidden",
          )}
        >
          <DeskSide />
        </aside>
      </div>
      <nav className="grid shrink-0 grid-cols-3 border-t border-line bg-surface lg:hidden">
        {(
          [
            ["sessions", "会话"],
            ["record", "记录"],
            ["bridge", "脊桥"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "bridge") setSide("bridge");
              else setPane(id);
            }}
            className={cn(
              "min-h-14 font-mono text-xs",
              pane === id ? "text-brass" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SessionRail({ visible }: { visible: boolean }) {
  const sessions = useKeel((state) => state.sessions);
  const characters = useKeel((state) => state.characters);
  const activeId = useKeel((state) => state.activeId);
  const selectSession = useKeel((state) => state.selectSession);
  const createSession = useKeel((state) => state.createSession);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");

  return (
    <aside
      className={cn(
        "min-h-0 w-full min-w-0 flex-col border-line bg-surface lg:flex lg:w-64 lg:shrink-0 lg:border-r",
        visible ? "flex" : "hidden",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
        <p className="font-mono text-xs text-muted">SESSION</p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-11 px-2 text-sm text-brass"
        >
          {open ? "取消" : "新会话"}
        </button>
      </div>
      {open ? (
        <form
          className="flex flex-col gap-3 border-b border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            createSession(title, characterId);
            setTitle("");
            setOpen(false);
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-muted">
            标题
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="未命名也可以"
              className="min-h-11 border border-line bg-bg px-3 text-fg"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            角色
            <select
              value={characterId}
              onChange={(event) => setCharacterId(event.target.value)}
              className="min-h-11 border border-line bg-bg px-3 text-fg"
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} · {character.epithet}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink">
            创建
          </button>
        </form>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {sessions.map((session) => {
          const character = characters.find((item) => item.id === session.characterId);
          const pending = session.events.some((event) => event.kind === "decision" && !event.selectedId);
          const active = session.id === activeId;
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => selectSession(session.id)}
              className={cn(
                "relative flex w-full flex-col gap-1 border-b border-line px-3 py-3 text-left",
                active && "bg-raised",
              )}
            >
              <span className={cn("absolute inset-y-0 left-0 w-0.5", active ? "bg-brass" : "bg-transparent")} />
              <span className="text-sm text-fg">{session.title}</span>
              <span className="font-mono text-xs text-muted">
                {character?.name ?? "无角色"}
                {pending ? " · 待选" : ""}
                {session.shadow ? " · 探针" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
