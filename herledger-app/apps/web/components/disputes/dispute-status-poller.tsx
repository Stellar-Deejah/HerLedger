"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DisputeStatusPollerProps {
  eventId: string;
  onSuccess: (status: string) => void;
  onError: (error: string) => void;
  timeout?: number; // in milliseconds, default 60000 (60 seconds)
  interval?: number; // in milliseconds, default 2000 (2 seconds)
}

type PollingStatus = "idle" | "polling" | "success" | "error" | "timeout";

export function DisputeStatusPoller({
  eventId,
  onSuccess,
  onError,
  timeout = 60000,
  interval = 2000,
}: DisputeStatusPollerProps) {
  const [status, setStatus] = useState<PollingStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/disputes/${eventId}/status`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch dispute status");
      }

      const data = await response.json();
      
      if (data.status === "Disputed") {
        cleanup();
        setStatus("success");
        onSuccess(data.status);
      } else if (data.status === "Failed") {
        cleanup();
        setStatus("error");
        setError("Dispute submission failed on-chain");
        onError("Dispute submission failed on-chain");
      }
      // Continue polling if status is still "Pending" or "Submitted"
    } catch (err) {
      // Don't stop polling on transient errors, but log them
      console.error("Polling error:", err);
    }
  }, [eventId, onSuccess, onError, cleanup]);

  const startPolling = useCallback(() => {
    cleanup();
    setStatus("polling");
    setElapsed(0);
    setError(null);
    startTimeRef.current = Date.now();

    // Initial poll
    pollStatus();

    // Set up interval for subsequent polls
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      setElapsed(elapsedMs);

      if (elapsedMs >= timeout) {
        cleanup();
        setStatus("timeout");
        onError("Polling timeout: Dispute status not confirmed within timeout period");
        return;
      }

      pollStatus();
    }, interval);

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setStatus("timeout");
      onError("Polling timeout: Dispute status not confirmed within timeout period");
    }, timeout);
  }, [pollStatus, cleanup, timeout, interval, onError]);

  useEffect(() => {
    startPolling();

    return cleanup;
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsedSeconds = Math.floor(elapsed / 1000);
  const timeoutSeconds = Math.floor(timeout / 1000);
  const progress = Math.min((elapsed / timeout) * 100, 100);

  if (status === "success") {
    return (
      <div
        style={{
          padding: "1rem",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "var(--radius)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--success, #22c55e)", fontWeight: 600 }}>
          ✓ Dispute Confirmed
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          Your dispute has been successfully confirmed on the Stellar network.
        </p>
      </div>
    );
  }

  if (status === "error" || status === "timeout") {
    return (
      <div
        style={{
          padding: "1rem",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "var(--radius)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--error, #ef4444)", fontWeight: 600 }}>
          {status === "timeout" ? "⏰ Timeout" : "❌ Error"}
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          {error || "Failed to confirm dispute status. Please check your activity feed."}
        </p>
        <button
          onClick={startPolling}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--background)",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Polling in progress
  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        borderRadius: "var(--radius)",
        textAlign: "center",
      }}
    >
      <p style={{ color: "var(--info, #3b82f6)", fontWeight: 600 }}>
        ⏳ Confirming Dispute...
      </p>
      <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
        Waiting for on-chain confirmation ({elapsedSeconds}s / {timeoutSeconds}s)
      </p>
      <div
        style={{
          marginTop: "1rem",
          height: "4px",
          backgroundColor: "var(--border)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            backgroundColor: "var(--info, #3b82f6)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
        This may take up to {timeoutSeconds} seconds
      </p>
    </div>
  );
}
