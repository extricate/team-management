"use client";

import { Children, useState } from "react";
import { useRouter } from "next/navigation";

interface DevLoginButtonProps {
  callbackUrl?: string;
  children: React.ReactNode;
}

export default function DevLoginButton({ callbackUrl, children }: DevLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDevLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dev/login", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to log in as admin");
      }

      router.push(callbackUrl ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDevLogin}
        disabled={loading}
        className="utrecht-button"
        style={{
          width: "100%",
          background: "var(--rvo-color-oranje-500)",
          color: "white",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Logging in..." : "Dev: Log in as Admin"}
        {children}
      </button>
      {error && (
        <div style={{ color: "var(--rvo-color-rood-600)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}
    </>
  );
}
