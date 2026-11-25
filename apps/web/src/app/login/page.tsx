"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@talentos/contracts";
import { BrandWordmark, Button, Input, NativeDialog } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiRequest } from "@/lib/api";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { login, startDemo } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [demoLoading, setDemoLoading] = React.useState(false);

  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetToken, setResetToken] = React.useState("");
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetStatus, setResetStatus] = React.useState<string | null>(null);
  const [resetStep, setResetStep] = React.useState<"request" | "confirm">("request");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const signedIn = await login(values.email, values.password);
      router.push(signedIn.account_type === "candidate" ? "/candidate" : "/workspace");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Unable to sign in right now.");
    }
  };

  const handleQuickDemo = async (role: "recruiter" | "candidate") => {
    setServerError(null);
    setDemoLoading(true);
    try {
      await startDemo(role);
      router.push(role === "candidate" ? "/candidate" : "/workspace");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Demo login failed.");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    try {
      const res = await apiRequest<{ message: string; dev_reset_token?: string }>(
        "/auth/password-reset/request",
        { method: "POST", body: JSON.stringify({ email: resetEmail }) }
      );
      if (res.dev_reset_token) {
        setResetToken(res.dev_reset_token);
        setResetStep("confirm");
        setResetStatus(`${res.message} Development reset token filled automatically.`);
      } else {
        setResetStatus(res.message);
      }
    } catch (err) {
      setResetStatus(err instanceof ApiError ? err.message : "Password reset request failed.");
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    try {
      const res = await apiRequest<{ message: string }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, new_password: resetPassword }),
      });
      setResetStatus(res.message);
      setResetStep("request");
      setResetPassword("");
    } catch (err) {
      setResetStatus(err instanceof ApiError ? err.message : "Unable to update password.");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[440px] items-center justify-between">
        <Link href="/" aria-label="Return to TalentOS home" className="inline-flex min-h-10 items-center">
          <BrandWordmark markSize={22} />
        </Link>
        <Link href="/register" className="text-sm font-medium text-[var(--color-accent-text)] hover:underline">
          Create account
        </Link>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto my-8 w-full max-w-[440px]">
        <div className="surface-solid rounded-[20px] p-6 sm:p-8 shadow-[0_16px_44px_-24px_rgba(15,23,21,0.16)]">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Sign in to TalentOS
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Access your recruiter workspace or candidate portal.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-5 rounded-[10px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-3.5 py-2.5 text-sm text-[var(--color-error)]"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[var(--color-text)]">
                Email address
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="email@example.com"
                hasError={Boolean(errors.email)}
                className="mt-1.5"
                {...register("email")}
              />
              {errors.email && (
                <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-[var(--color-text)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-xs font-medium text-[var(--color-accent-text)] hover:underline"
                >
                  Reset password
                </button>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                hasError={Boolean(errors.password)}
                className="mt-1.5"
                {...register("password")}
              />
              {errors.password && (
                <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-[var(--color-border)] pt-5">
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              Or try an isolated demo session
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={demoLoading}
                onClick={() => void handleQuickDemo("recruiter")}
              >
                Recruiter demo
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={demoLoading}
                onClick={() => void handleQuickDemo("candidate")}
              >
                Candidate demo
              </Button>
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              Looking for hiring manager access?{" "}
              <Link href="/demo" className="font-medium text-[var(--color-accent-text)] hover:underline">
                View all three demo roles
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[440px] text-center text-xs text-[var(--color-text-secondary)]">
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:underline">Terms</Link>
      </footer>

      <NativeDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset your password"
        description="Enter your account email to request a password reset token."
      >
        {resetStatus && (
          <div className="mb-4 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-xs text-[var(--color-text)]">
            {resetStatus}
          </div>
        )}
        {resetStep === "request" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-[var(--color-text)]">
                Account email
              </label>
              <Input
                id="reset-email"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Request reset
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div>
              <label htmlFor="reset-token" className="block text-sm font-medium text-[var(--color-text)]">
                Reset token
              </label>
              <Input
                id="reset-token"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="mt-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <label htmlFor="reset-new-password" className="block text-sm font-medium text-[var(--color-text)]">
                New password (min 8 characters)
              </label>
              <Input
                id="reset-new-password"
                type="password"
                required
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResetStep("request")}>
                Back
              </Button>
              <Button type="submit" variant="primary">
                Update password
              </Button>
            </div>
          </form>
        )}
      </NativeDialog>
    </div>
  );
}
