import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { CtaSection } from "@/components/marketing/CtaSection";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { TrustSimulatorSkeleton } from "@/components/marketing/TrustSimulatorSkeleton";

const TrustSimulator = dynamic(
  () => import("@/components/marketing/TrustSimulator").then((mod) => mod.TrustSimulator),
  {
    ssr: false,
    loading: () => <TrustSimulatorSkeleton />,
  }
);

export const metadata: Metadata = {
  title: "HerLedger — Verifiable Financial History for Women-Owned Businesses",
  description:
    "Build an immutable, portable, and verifiable financial reputation on Stellar without sharing unnecessary private information.",
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <TrustSimulator />
      <TestimonialsSection />
      <CtaSection />
    </main>
  );
}
