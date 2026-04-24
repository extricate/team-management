"use client";

import { useState } from "react";
import { Heading2, Paragraph } from "@rijkshuisstijl-community/components-react";
import type { CommentableType } from "@/lib/db/schema";

interface CommentData {
  id: string;
  body: string;
  createdAt: Date;
  createdByUser: { name: string | null; email: string } | null;
}

interface Props {
  comments: CommentData[];
  commentableType: CommentableType;
  commentableId: string;
  currentUserId: string;
}

export function CommentSection({ comments: initial, commentableType, commentableId, currentUserId }: Props) {
  const [comments, setComments] = useState(initial);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, commentableType, commentableId }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setComments(prev => [data, ...prev]);
        setBody("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <Heading2 style={{ marginBottom: "1rem" }}>Opmerkingen</Heading2>

      <form onSubmit={submit} style={{ marginBottom: "1.5rem" }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          className="utrecht-textarea"
          style={{ width: "100%", display: "block", marginBottom: "0.75rem", resize: "vertical" }}
          placeholder="Schrijf een opmerking..."
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="utrecht-button utrecht-button--primary-action"
          style={{ fontSize: "0.875rem" }}
        >
          {saving ? "Opslaan..." : "Opmerking plaatsen"}
        </button>
      </form>

      <div>
        {comments.length === 0 && (
          <Paragraph style={{ color: "var(--rvo-color-grijs-600)", fontStyle: "italic" }}>
            Nog geen opmerkingen.
          </Paragraph>
        )}
        {comments.map((c) => (
          <div key={c.id} style={{
            borderLeft: "3px solid var(--rvo-color-hemelblauw-300, #7daed4)",
            paddingLeft: "1rem",
            marginBottom: "1rem",
          }}>
            <div style={{ fontSize: "0.8125rem", color: "var(--rvo-color-grijs-600)", marginBottom: "0.25rem" }}>
              <strong>{c.createdByUser?.name ?? c.createdByUser?.email ?? "Onbekend"}</strong>
              {" · "}
              {new Date(c.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
            </div>
            <Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.body}</Paragraph>
          </div>
        ))}
      </div>
    </section>
  );
}
