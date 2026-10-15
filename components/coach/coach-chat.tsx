"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ChatMessageDto = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Pre-formatted on the server — the client never builds a Date. */
  time: string;
};

function errorMessage(body: unknown, fallback: string) {
  const error = (body as { error?: unknown } | null)?.error;
  return typeof error === "string" ? error : fallback;
}

export function CoachChat({ initialMessages }: { initialMessages: ChatMessageDto[] }) {
  const [messages, setMessages] = useState<ChatMessageDto[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  async function send() {
    const content = draft.trim();
    if (!content || pending) return;

    setError(null);
    setPending(true);
    const optimistic: ChatMessageDto = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      time: "",
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(errorMessage(body, "The coach did not answer"));
      setMessages((prev) => [...prev, body.message as ChatMessageDto]);
    } catch (e) {
      // Put the question back in the composer rather than leaving it stranded
      // in the transcript with no reply underneath it.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(content);
      setError(e instanceof Error ? e.message : "The coach did not answer");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && !pending && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Ask about today&apos;s session, a stalled lift, or what to change next week.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "border border-primary/30 bg-primary/5"
                  : "border border-border bg-card",
              )}
            >
              {m.content}
              {m.time && (
                <div className="mt-1 text-[0.65rem] text-muted-foreground">{m.time}</div>
              )}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Coach is reading your log…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask the coach…"
          rows={2}
          disabled={pending}
        />
        <Button onClick={send} disabled={pending || draft.trim().length === 0} size="sm">
          Send
        </Button>
      </div>
    </div>
  );
}
