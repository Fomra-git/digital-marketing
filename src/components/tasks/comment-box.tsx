"use client";

import { useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntityAvatar } from "@/components/ui/avatar";
import type { PickerPerson } from "./people-picker";

/**
 * Comment box with @mentions: typing "@" opens a list of people; choosing one
 * inserts "@Name" and records their id. Only ids whose "@Name" is still in
 * the text are sent, and the database only notifies people who can open the
 * task.
 */
export function CommentBox({
  people,
  onSubmit,
  placeholder = "Write a comment… use @ to mention someone",
}: {
  people: PickerPerson[];
  onSubmit: (body: string, mentions: string[]) => Promise<boolean>;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<PickerPerson[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(
    () =>
      query === null
        ? []
        : people
            .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 6),
    [people, query],
  );

  function onChange(value: string, caret: number) {
    setBody(value);
    const upto = value.slice(0, caret);
    const m = /(^|\s)@([\w.\- ]{0,30})$/.exec(upto);
    setQuery(m ? m[2] : null);
  }

  function pick(p: PickerPerson) {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = body
      .slice(0, caret)
      .replace(/@([\w.\- ]{0,30})$/, `@${p.name} `);
    const next = before + body.slice(caret);
    setBody(next);
    setMentioned((list) =>
      list.some((x) => x.user_id === p.user_id) ? list : [...list, p],
    );
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  }

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const ids = mentioned
      .filter((p) => text.includes(`@${p.name}`))
      .map((p) => p.user_id);
    const ok = await onSubmit(text, ids);
    setBusy(false);
    if (ok) {
      setBody("");
      setMentioned([]);
    }
  }

  return (
    <div className="relative space-y-2">
      <Textarea
        ref={ref}
        value={body}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart)}
        onKeyDown={(e) => {
          if (suggestions.length && (e.key === "Enter" || e.key === "Tab")) {
            e.preventDefault();
            pick(suggestions[0]);
          } else if (e.key === "Escape") setQuery(null);
          else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
        }}
        aria-label="Comment"
      />
      {suggestions.length > 0 && (
        <ul
          className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((p) => (
            <li key={p.user_id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <EntityAvatar
                  name={p.name}
                  src={p.avatar_url}
                  className="size-6"
                />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Ctrl/⌘ + Enter to send
        </span>
        <Button
          size="sm"
          onClick={submit}
          loading={busy}
          disabled={!body.trim()}
        >
          <Send /> Comment
        </Button>
      </div>
    </div>
  );
}
