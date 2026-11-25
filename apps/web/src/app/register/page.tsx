"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@talentos/contracts";
import { BrandWordmark, Button, Input } from "@talentos/ui";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

type RegisterFormValues = {
  full_name: string;
  email: string;
  password: string;
  account_type: "recruiter" | "candidate";
  organization_name?: string;
  consent_resume_processing: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerAccount } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      account_type: "recruiter",
      consent_resume_processing: true,
    },
  });

  const accountType = watch("account_type");

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const user = await registerAccount(values);
      router.push(user.account_type === "candidate" ? "/candidate" : "/workspace");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Registration failed.");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between">
        <Link href="/" aria-label="Return to TalentOS home" className="inline-flex min-h-10 items-center">
          <BrandWordmark markSize={22} />
        </Link>
        <Link href="/login" className="text-sm font-medium text-[var(--color-accent-text)] hover:underline">
          Sign in
        </Link>
      </div>

      <main id="main-content" tabIndex={-1} className="mx-auto my-8 w-full max-w-[480px]">
        <div className="surface-solid rounded-[20px] p-6 sm:p-8 shadow-[0_16px_44px_-24px_rgba(15,23,21,0.16)]">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[var(--color-text)]">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
            Set up an organization hiring workspace or create a candidate portal account.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-5 rounded-[10px] border border-[var(--color-error)] bg-[var(--color-error-soft)] px-3.5 py-2.5 text-sm text-[var(--color-error)]"
            >
              {serverError}
            </div>
          )}

          <div
            role="radiogroup"
            aria-label="Account type"
            className="surface-segment-track mt-6 grid grid-cols-2 gap-1.5 rounded-[13px] p-1"
          >
            {(
              [
                { id: "recruiter", label: "Hiring team", desc: "Jobs and pipeline" },
                { id: "candidate", label: "Candidate", desc: "Apply and track" },
              ] as const
            ).map((opt) => {
              const selected = accountType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setValue("account_type", opt.id)}
                  className={`rounded-[10px] px-3 py-2.5 text-left transition-all ${
                    selected
                      ? "bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,21,0.08)] ring-1 ring-[var(--color-border)]"
                      : "hover:bg-[var(--color-glass-active)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--color-text)]">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-[var(--color-text)]">
                Full name
              </label>
              <Input
                id="reg-name"
                autoComplete="name"
                placeholder="Your full name"
                hasError={Boolean(errors.full_name)}
                className="mt-1.5"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {accountType === "recruiter" && (
              <div>
                <label htmlFor="reg-org" className="block text-sm font-medium text-[var(--color-text)]">
                  Organization name
                </label>
                <Input
                  id="reg-org"
                  placeholder="Your organization name"
                  className="mt-1.5"
                  {...register("organization_name")}
                />
              </div>
            )}

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--color-text)]">
                Email address
              </label>
              <Input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--color-text)]">
                Password
              </label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
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

            {accountType === "candidate" && (
              <label className="flex items-start gap-2.5 rounded-[11px] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded"
                  {...register("consent_resume_processing")}
                />
                <span>
                  I consent to TalentOS processing uploaded resumes for qualification evidence review during
                  applications. You can revoke consent or delete records anytime in settings.
                </span>
              </label>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[480px] text-center text-xs text-[var(--color-text-secondary)]">
        By creating an account you acknowledge our{" "}
        <Link href="/privacy" className="underline">Privacy Notice</Link> and{" "}
        <Link href="/terms" className="underline">Terms of Use</Link>.
      </footer>
    </div>
  );
}
