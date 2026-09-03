// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Marketing components link through @/i18n/navigation; mocking the Link
// wrapper keeps these tests focused on the sections' content.
vi.mock("@/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string | { pathname: string };
      children: React.ReactNode;
    }) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : href.pathname, ...props },
        children
      ),
  };
});

import { CtaSection } from "../CtaSection";
import { FeaturesSection } from "../FeaturesSection";
import { HeroSection } from "../HeroSection";
import { MarketingFooter } from "../MarketingFooter";
import { TestimonialsSection } from "../TestimonialsSection";
import { TrustSimulator } from "../TrustSimulator";
import { TrustSimulatorSkeleton } from "../TrustSimulatorSkeleton";

describe("Marketing Components", () => {
  it("renders HeroSection with priority LCP image and explicit dimensions", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build a verifiable financial history for your business/i,
      })
    ).toBeDefined();

    const heroImg = screen.getByAltText(/HerLedger verifiable financial dashboard/i);
    expect(heroImg).toBeDefined();
    expect(heroImg.getAttribute("src")).toContain("hero-preview.svg");
    expect(heroImg.getAttribute("width")).toBe("800");
    expect(heroImg.getAttribute("height")).toBe("480");
  });

  it("renders FeaturesSection with lazy loading on feature icons", () => {
    render(<FeaturesSection />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /engineered for verifiable credibility/i,
      })
    ).toBeDefined();

    const featureIcons = screen.getAllByRole("img");
    expect(featureIcons.length).toBeGreaterThanOrEqual(4);

    featureIcons.forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("width")).toBe("64");
      expect(img.getAttribute("height")).toBe("64");
    });
  });

  it("renders TrustSimulator and allows scenario selection and proof simulation", () => {
    render(<TrustSimulator />);

    expect(screen.getByText(/interactive trust simulator/i)).toBeDefined();
    expect(screen.getByText(/2,450.00 USDC/i)).toBeDefined();

    const verifyBtn = screen.getByRole("button", { name: /simulate proof check/i });
    expect(verifyBtn).toBeDefined();
  });

  it("renders TrustSimulatorSkeleton with accessibility attributes", () => {
    render(<TrustSimulatorSkeleton />);

    const skeleton = screen.getByLabelText(/loading trust simulator/i);
    expect(skeleton).toBeDefined();
    expect(skeleton.getAttribute("aria-busy")).toBe("true");
  });

  it("renders TestimonialsSection with lazy loaded avatars", () => {
    render(<TestimonialsSection />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /trusted by businesses and attesters/i,
      })
    ).toBeDefined();

    const avatars = screen.getAllByRole("img");
    expect(avatars.length).toBe(2);
    avatars.forEach((img) => {
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("width")).toBe("48");
      expect(img.getAttribute("height")).toBe("48");
    });
  });

  it("renders CtaSection with get started action", () => {
    render(<CtaSection />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /ready to turn transactions into your business superpower/i,
      })
    ).toBeDefined();

    const ctaLink = screen.getByRole("link", { name: /get started for free/i });
    expect(ctaLink).toBeDefined();
    expect(ctaLink.getAttribute("href")).toBe("/auth/sign-up");
  });

  it("renders MarketingFooter with links and non-lending disclaimer", () => {
    render(<MarketingFooter />);

    expect(
      screen.getByText(/HerLedger does not issue loans, calculate credit scores/i)
    ).toBeDefined();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeDefined();
  });
});
