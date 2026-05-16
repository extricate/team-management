"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useApiSubmit<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  options?: {
    redirectTo?: string | ((data: T) => string);
    onSuccess?: (data: T) => void;
  }
) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(body: unknown): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Er is een fout opgetreden.");
        return;
      }
      const { data } = (await res.json()) as { data: T };
      if (options?.onSuccess) {
        options.onSuccess(data);
      } else if (options?.redirectTo) {
        const target =
          typeof options.redirectTo === "function"
            ? options.redirectTo(data)
            : options.redirectTo;
        router.push(target);
        router.refresh();
      }
    } catch {
      setError("Er is een verbindingsfout opgetreden.");
    } finally {
      setSaving(false);
    }
  }

  return { error, saving, submit };
}
