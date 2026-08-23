"use client";

import dynamic from "next/dynamic";

import { TrustSimulatorSkeleton } from "@/components/marketing/TrustSimulatorSkeleton";

// next/dynamic's `ssr: false` option is only valid inside a Client Component
// -- this file exists solely to hold that call so the (marketing) page
// itself can stay a Server Component.
export const TrustSimulator = dynamic(
  () => import("@/components/marketing/TrustSimulator").then((mod) => mod.TrustSimulator),
  {
    ssr: false,
    loading: () => <TrustSimulatorSkeleton />,
  }
);
