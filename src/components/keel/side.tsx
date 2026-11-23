import { useEffect, useState } from "react";
import { MODELS, POSTURE_LABEL, modelLabel } from "@/lib/keel/catalog";
import { checkpointDocument, handoffMarkdown, SCHEMAS, bridgeMath } from "@/lib/keel/protocol";
import { useKeel } from "@/lib/keel/store";
import type { Character, Posture } from "@/lib/keel/types";
import { stamp } from "@/lib/keel/types";
import { saveFile } from "@/lib/keel/zip";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const field = "min-h-11 w-full border border-line bg-bg px-3 text-sm text-fg";

export function DeskSide() {
  const side = useKeel((state) => state.side);
  const setSide = useKeel((state) => state.setSide);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-3 border-b border-line">
        {(
          [
            ["session", "本会话"],
            ["bridge", "脊桥"],
            ["protocol", "协议"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSide(id)}
            className={cn(
              "min-h-11 text-sm",
              side === id ? "text-brass" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {side === "session" ? <SessionPanel /> : null}
        {side === "bridge" ? <BridgePanel /> : null}
        {side === "protocol" ? <ProtocolPanel /> : null}
      </div>
    </div>
  );
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
  const [characterId, setCharacterId] = useState(session?.characterId ?? "");
  const [modelId, setModelId] = useState(MODELS[0]?.id ?? "");

  useEffect(() => {
    if (session) setCharacterId(session.characterId);
  }, [session?.id, session?.characterId]);

  if (!session) return <p className="text-sm text-muted">没有会话。</p>;

  const sameCharacter = characterId === session.characterId;
  const refs = (id: string) => sessions.filter((item) => item.pluginIds.includes(id)).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">CHARACTER</p>
        <select value={characterId} onChange={(event) => setCharacterId(event.target.value)} className={field}>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name} · {character.epithet}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={sameCharacter}
            onClick={() => swapCharacter(characterId)}
            className="min-h-11 border border-line bg-raised px-2 text-sm text-fg disabled:opacity-40"
          >
            热切换
          </button>
          <button
            type="button"
            disabled={sameCharacter}
            onClick={() => forkCharacter(characterId)}
            className="min-h-11 bg-brass px-2 text-sm font-medium text-brass-ink disabled:opacity-40"
          >
            分叉
          </button>
        </div>
        <p className="text-xs text-muted">热切换留在这条会话，不改模型。分叉才新建，handoff 是第一条指令。</p>
        <ul className="flex flex-col gap-1">
          {session.timeline.map((mark, index) => {
            const name = characters.find((item) => item.id === mark.characterId)?.name ?? mark.characterId;
            const verb = mark.kind === "bind" ? "绑定" : mark.kind === "swap" ? "换成" : "分叉为";
            return (
              <li key={`${mark.at}-${index}`} className="font-mono text-xs text-muted">
                {stamp(mark.at)} {verb} {name}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">MODEL</p>
        <p className="text-xs text-muted">当前 {modelLabel(session.modelId)}。写入探针之前不调用 setModel。</p>
        <select value={modelId} onChange={(event) => setModelId(event.target.value)} className={field}>
          {MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} · {model.note}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={Boolean(session.shadow) || modelId === session.modelId}
          onClick={() => beginShadow(modelId)}
          className="min-h-11 border border-ember px-3 text-sm text-ember disabled:opacity-40"
        >
          {session.shadow ? "已有未提交的探针" : "跑影子探针"}
        </button>
      </section>
      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">PLUGINS</p>
        {plugins.map((plugin) => {
          const on = session.pluginIds.includes(plugin.id);
          return (
            <button
              key={plugin.id}
              type="button"
              aria-pressed={on}
              onClick={() => togglePlugin(plugin.id)}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 border px-3 text-left text-sm",
                on ? "border-brass text-fg" : "border-line text-muted",
              )}
            >
              <span>{plugin.name}</span>
              <span className="font-mono text-xs">
                {on ? "已挂" : "未挂"} · 引用 {refs(plugin.id)}
              </span>
            </button>
          );
        })}
      </section>
      <section className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => {
            const doc = checkpointDocument({ session, characters, plugins });
            saveFile(
              `keel-checkpoint-${session.id}.json`,
              new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
            );
          }}
          className="min-h-11 border border-line bg-raised px-3 text-sm text-fg"
        >
          导出 checkpoint
        </button>
        <button
          type="button"
          onClick={() => {
            const markdown = handoffMarkdown({ session, characters });
            saveFile(
              `keel-handoff-${session.id}.md`,
              new Blob([markdown], { type: "text/markdown" }),
            );
          }}
          className="min-h-11 border border-line bg-raised px-3 text-sm text-fg"
        >
          导出 handoff
        </button>
      </section>
    </div>
  );
}

function BridgePanel() {
  const plugins = useKeel((state) => state.plugins);
  const sessions = useKeel((state) => state.sessions);
  const faultPlugin = useKeel((state) => state.faultPlugin);
  const reapIdle = useKeel((state) => state.reapIdle);
  const math = bridgeMath(plugins, sessions);

  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="font-mono text-xs text-brass">keel-bridge</p>
        <p className="mt-1 text-sm text-fg">
          1 个监督进程 + {math.live} 个插件进程 = {math.processes}。若按会话各起一份，是 {math.mounts}{" "}
          个子进程。
        </p>
      </section>
      <ul className="flex flex-col gap-2 border-l border-line pl-3">
        {plugins.map((plugin) => {
          const refs = sessions.filter((session) => session.pluginIds.includes(plugin.id));
          return (
            <li key={plugin.id} className="border border-line bg-bg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-fg">{plugin.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {plugin.transport} · {plugin.status === "ready" ? "运行" : plugin.status === "faulted" ? "故障" : "停止"} · 引用 {refs.length} · 崩溃 {plugin.crashCount}
                  </p>
                </div>
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0",
                    plugin.status === "ready" && "bg-brass",
                    plugin.status === "faulted" && "bg-ember",
                    plugin.status === "stopped" && "bg-line",
                  )}
                />
              </div>
              <p className="mt-2 font-mono text-xs break-all text-muted">{plugin.command}</p>
              <p className="mt-1 text-xs text-muted">
                {refs.length ? refs.map((session) => session.title).join("、") : "没有会话引用"}
              </p>
              <button
                type="button"
                disabled={plugin.status === "stopped"}
                onClick={() => faultPlugin(plugin.id)}
                className="mt-2 min-h-11 border border-ember px-3 text-sm text-ember disabled:opacity-40"
              >
                注入故障
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={reapIdle} className="min-h-11 border border-line bg-raised px-3 text-sm text-fg">
        回收空闲
      </button>
    </div>
  );
}

function ProtocolPanel() {
  const [schemaId, setSchemaId] = useState(SCHEMAS[0]?.id ?? "bridge");
  const schema = SCHEMAS.find((item) => item.id === schemaId) ?? SCHEMAS[0];
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 text-sm text-fg">
        <p className="font-mono text-xs text-muted">INVARIANTS</p>
        <p>进程数不随会话相乘。插件按引用计数，故障只重启那一个。</p>
        <p>选项在选定之后才进入上下文，和直接指令同级。未提交的探针不算。</p>
        <p>角色是 overlay。热切换留在原会话。分叉才交接。</p>
      </section>
      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">SCHEMA</p>
        <div className="flex flex-wrap gap-2">
          {SCHEMAS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSchemaId(item.id)}
              className={cn(
                "min-h-11 border px-3 text-sm",
                item.id === schemaId ? "border-brass text-brass" : "border-line text-muted",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
        {schema ? (
          <pre className="max-h-64 overflow-auto border border-line bg-bg p-3 font-mono text-xs whitespace-pre text-muted">
            {JSON.stringify(schema.body, null, 2)}
          </pre>
        ) : null}
      </section>
      <CharacterBook />
    </div>
  );
}

function CharacterBook() {
  const characters = useKeel((state) => state.characters);
  const sessions = useKeel((state) => state.sessions);
  const saveCharacter = useKeel((state) => state.saveCharacter);
  const createCharacter = useKeel((state) => state.createCharacter);
  const deleteCharacter = useKeel((state) => state.deleteCharacter);
  const [editId, setEditId] = useState<string | null>(characters[0]?.id ?? null);
  const editing = characters.find((character) => character.id === editId) ?? null;
  const [draft, setDraft] = useState<Character | null>(editing);
  const [fresh, setFresh] = useState({
    name: "",
    epithet: "",
    identity: "",
    tone: "",
    posture: "ask" as Posture,
    defaultModel: MODELS[0]?.id ?? "grok-4",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(editing);
  }, [editing]);

  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-xs text-muted">CHARACTERS</p>
      <div className="flex flex-wrap gap-2">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            onClick={() => setEditId(character.id)}
            className={cn(
              "min-h-11 border px-3 text-sm",
              character.id === editId ? "border-brass text-fg" : "border-line text-muted",
            )}
          >
            {character.name}
          </button>
        ))}
      </div>
      {draft ? (
        <div className="flex flex-col gap-2">
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            aria-label="角色名"
            className={field}
          />
          <input
            value={draft.epithet}
            onChange={(event) => setDraft({ ...draft, epithet: event.target.value })}
            aria-label="短称"
            className={field}
          />
          <textarea
            value={draft.identity}
            onChange={(event) => setDraft({ ...draft, identity: event.target.value })}
            aria-label="身份"
            rows={3}
            className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg"
          />
          <input
            value={draft.tone}
            onChange={(event) => setDraft({ ...draft, tone: event.target.value })}
            aria-label="语气"
            className={field}
          />
          <select
            value={draft.posture}
            aria-label="工具姿态"
            onChange={(event) => setDraft({ ...draft, posture: event.target.value as Posture })}
            className={field}
          >
            {Object.entries(POSTURE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                工具 {label}
              </option>
            ))}
          </select>
          <select
            value={draft.defaultModel}
            aria-label="默认模型"
            onChange={(event) => setDraft({ ...draft, defaultModel: event.target.value })}
            className={field}
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                默认 {model.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => saveCharacter(draft)}
              className="min-h-11 bg-brass px-3 text-sm font-medium text-brass-ink"
            >
              保存角色
            </button>
            <button
              type="button"
              onClick={() => deleteCharacter(draft.id)}
              disabled={sessions.some((session) => session.characterId === draft.id)}
              className="min-h-11 border border-line px-3 text-sm text-muted disabled:opacity-40"
            >
              删除
            </button>
          </div>
        </div>
      ) : null}
      <form
        className="flex flex-col gap-2 border-t border-line pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!fresh.name.trim() || !fresh.identity.trim()) {
            setError("需要名称和身份。");
            return;
          }
          createCharacter(fresh);
          setFresh({ ...fresh, name: "", epithet: "", identity: "", tone: "" });
          setError("");
        }}
      >
        <p className="text-sm text-muted">新角色</p>
        <input
          value={fresh.name}
          onChange={(event) => setFresh({ ...fresh, name: event.target.value })}
          placeholder="名称"
          aria-label="新角色名称"
          className={field}
        />
        <input
          value={fresh.epithet}
          onChange={(event) => setFresh({ ...fresh, epithet: event.target.value })}
          placeholder="短称"
          aria-label="新角色短称"
          className={field}
        />
        <textarea
          value={fresh.identity}
          onChange={(event) => setFresh({ ...fresh, identity: event.target.value })}
          placeholder="身份"
          aria-label="新角色身份"
          rows={2}
          className="w-full border border-line bg-bg px-3 py-2 text-sm text-fg"
        />
        <button type="submit" className="min-h-11 border border-brass px-3 text-sm text-brass">
          添加角色
        </button>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
      </form>
    </section>
  );
}
