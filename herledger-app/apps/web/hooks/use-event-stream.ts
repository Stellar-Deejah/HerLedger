"use client";

import { useEffect, useState } from "react";

export interface FinancialEventSummary {
  id: string;
  eventId: string;
  eventType: string;
  assetAddress: string;
  amount: string;
  status: string;
  stellarReference: string;
  ledgerSequence: number;
}

interface EventStreamState {
  newEvents: FinancialEventSummary[];
  isConnected: boolean;
  error: Error | null;
}

type Subscriber = (state: EventStreamState) => void;

interface BroadcastPayload {
  type: "new_events";
  events: unknown;
}

let sharedEventSource: EventSource | null = null;
const subscribers: Set<Subscriber> = new Set();
let globalNewEvents: FinancialEventSummary[] = [];
let isConnected = false;
let globalError: Error | null = null;
let channel: BroadcastChannel | null = null;
let isLeader = false;
let lockAbortController: AbortController | null = null;
let isInitializing = false;

function notifySubscribers() {
  const state: EventStreamState = {
    newEvents: [...globalNewEvents],
    isConnected,
    error: globalError,
  };
  for (const sub of subscribers) {
    sub(state);
  }
}

function handleEvents(data: unknown) {
  if (!Array.isArray(data) || data.length === 0) return;
  // Trusted cast: the SSE payload's shape is owned by our own API route.
  const incoming = data as unknown as FinancialEventSummary[];
  const newUnique = incoming.filter((d) => !globalNewEvents.some((p) => p.eventId === d.eventId));
  if (newUnique.length > 0) {
    globalNewEvents = [...newUnique, ...globalNewEvents];
    notifySubscribers();
  }
}

function connectEventSource() {
  if (sharedEventSource) return;

  sharedEventSource = new EventSource("/api/v1/events/stream");

  sharedEventSource.onopen = () => {
    isConnected = true;
    globalError = null;
    notifySubscribers();
  };

  sharedEventSource.onmessage = (event: MessageEvent<string>) => {
    try {
      const data: unknown = JSON.parse(event.data);
      handleEvents(data);
      if (channel && isLeader) {
        channel.postMessage({ type: "new_events", events: data });
      }
    } catch (err) {
      console.error("Failed to parse SSE message", err);
    }
  };

  sharedEventSource.onerror = () => {
    isConnected = false;
    sharedEventSource?.close();
    sharedEventSource = null;
    notifySubscribers();

    // Attempt reconnect
    setTimeout(() => {
      if (isLeader) connectEventSource();
    }, 3000);
  };
}

function initSSE() {
  if (typeof window === "undefined" || isInitializing) return;
  isInitializing = true;

  if (!channel && "BroadcastChannel" in window) {
    channel = new BroadcastChannel("herledger-events");
    channel.onmessage = (msg: MessageEvent<unknown>) => {
      const payload = msg.data as BroadcastPayload | undefined;
      if (payload?.type === "new_events") {
        handleEvents(payload.events);
      }
    };
  }

  if ("locks" in navigator) {
    lockAbortController = new AbortController();
    navigator.locks
      .request("herledger-sse-leader", { signal: lockAbortController.signal }, () => {
        isLeader = true;
        connectEventSource();
        // Hold lock until aborted
        return new Promise<void>((resolve) => {
          if (lockAbortController) {
            lockAbortController.signal.addEventListener("abort", () => resolve());
          }
        });
      })
      .catch((e: unknown) => {
        const name = e instanceof Error ? e.name : undefined;
        if (name !== "AbortError") {
          connectEventSource();
        }
      });
  } else {
    // Fallback if Web Locks API not supported
    isLeader = true;
    connectEventSource();
  }
}

export function useEventStream() {
  const [state, setState] = useState<EventStreamState>({
    newEvents: globalNewEvents,
    isConnected,
    error: globalError,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      subscribers.add(setState);
      if (subscribers.size === 1) {
        initSSE();
      }

      return () => {
        subscribers.delete(setState);
        if (subscribers.size === 0) {
          if (sharedEventSource) {
            sharedEventSource.close();
            sharedEventSource = null;
          }
          if (lockAbortController) {
            lockAbortController.abort();
            lockAbortController = null;
          }
          isLeader = false;
          isInitializing = false;
          isConnected = false;
        }
      };
    }
    return undefined;
  }, []);

  const clearNewEvents = () => {
    globalNewEvents = [];
    notifySubscribers();
  };

  return { ...state, clearNewEvents };
}
