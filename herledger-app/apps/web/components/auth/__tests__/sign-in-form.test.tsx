// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The form imports Link/useRouter from @/i18n/navigation (which wraps
// next/navigation) and useSearchParams from next/navigation directly.
// Mocking both keeps these tests focused on the form's behavior and avoids
// resolving next's subpath modules inside vitest.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));
vi.mock("@/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string | { pathname: string; query?: Record<string, string> };
      children: React.ReactNode;
    }) =>
      React.createElement(
        "a",
        { href: typeof href === "string" ? href : href.pathname, ...props },
        children
      ),
    useRouter: () => ({ push }),
  };
});

const signInEmail = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  signIn: { email: (...args: unknown[]) => signInEmail(...args) },
}));

import { SignInForm } from "../sign-in-form";

import { WithIntl } from "./intl-test-utils";

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "jane@example.com");
  await user.type(screen.getByLabelText(/password/i), "correct-password-123");
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  push.mockClear();
  signInEmail.mockReset();
  searchParams = new URLSearchParams();
});

describe("SignInForm", () => {
  it("shows a resend-verification link when the sign-in fails with EMAIL_NOT_VERIFIED", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified", status: 403 },
    });
    render(
      <WithIntl>
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/verify your email/i);
    const resendLink = screen.getByRole("link", { name: /resend verification email/i });
    expect(resendLink).toHaveAttribute("href", "/auth/verify-email?email=jane%40example.com");
  });

  it("does not show a resend link for an ordinary invalid-credentials error", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      data: null,
      error: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
        status: 401,
      },
    });
    render(
      <WithIntl>
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid email or password/i);
    expect(
      screen.queryByRole("link", { name: /resend verification email/i })
    ).not.toBeInTheDocument();
  });

  it("redirects to the dashboard on a successful sign-in", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(
      <WithIntl>
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("honors a validated same-origin callbackUrl after a successful sign-in", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ callbackUrl: "/dashboard/activity" });
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(
      <WithIntl>
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/dashboard/activity");
  });

  it("strips a locale prefix from the callbackUrl so the locale-aware router does not double-prefix", async () => {
    const user = userEvent.setup();
    // Simulate an es-locale user: the middleware stored their original
    // (locale-prefixed) pathname as the callback.
    searchParams = new URLSearchParams({ callbackUrl: "/es/dashboard/activity" });
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(
      <WithIntl locale="es">
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/dashboard/activity");
  });

  it("drops a malicious callbackUrl and falls back to the dashboard", async () => {
    const user = userEvent.setup();
    searchParams = new URLSearchParams({ callbackUrl: "https://evil.com" });
    signInEmail.mockResolvedValue({ data: { user: {} }, error: null });
    render(
      <WithIntl>
        <SignInForm />
      </WithIntl>
    );

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
