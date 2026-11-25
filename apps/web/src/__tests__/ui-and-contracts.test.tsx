import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  jobFormSchema,
  loginSchema,
  registerSchema,
} from "@talentos/contracts";
import { BrandWordmark, Button, StatePanel, StatusTag } from "@talentos/ui";
import { formatSalaryRange, formatFileSize, initialsFor, stageTone } from "@/lib/format";

describe("TalentOS contracts validation", () => {
  it("validates login and registration schemas accurately", () => {
    expect(loginSchema.safeParse({ email: "bad-email", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "recruiter@example.com", password: "Password!234" }).success).toBe(true);

    expect(
      registerSchema.safeParse({
        full_name: "A",
        email: "user@example.com",
        password: "short",
        account_type: "candidate",
      }).success
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        full_name: "Nadia Kusuma",
        email: "nadia@example.com",
        password: "StrongPassword123",
        account_type: "candidate",
        consent_resume_processing: true,
      }).success
    ).toBe(true);
  });

  it("enforces salary_min <= salary_max in job schema", () => {
    const invalid = jobFormSchema.safeParse({
      title: "Staff Frontend Engineer",
      department: "Engineering",
      employment_type: "full_time",
      work_arrangement: "hybrid",
      location: "Singapore",
      salary_min: 180000,
      salary_max: 120000,
      description: "Build accessible web applications across our product suite.",
    });
    expect(invalid.success).toBe(false);

    const valid = jobFormSchema.safeParse({
      title: "Staff Frontend Engineer",
      department: "Engineering",
      employment_type: "full_time",
      work_arrangement: "hybrid",
      location: "Singapore",
      salary_min: 120000,
      salary_max: 180000,
      description: "Build accessible web applications across our product suite.",
    });
    expect(valid.success).toBe(true);
  });

  it("defines all seven human-led pipeline stages", () => {
    expect(APPLICATION_STAGES).toEqual([
      "applied",
      "screening",
      "shortlisted",
      "interview",
      "offer",
      "hired",
      "rejected",
    ]);
    for (const stage of APPLICATION_STAGES) {
      expect(STAGE_LABELS[stage]).toBeTruthy();
    }
  });
});

describe("TalentOS UI primitives and formatters", () => {
  it("renders accessible buttons and triggers click handlers", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Publish opening</Button>);
    const btn = screen.getByRole("button", { name: "Publish opening" });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders brand wordmark, status tags, and accessible state panels", () => {
    render(
      <div>
        <BrandWordmark />
        <StatusTag tone="success">Published</StatusTag>
        <StatePanel
          tone="error"
          title="Connection issue"
          description="Unable to reach backend API."
        />
      </div>
    );
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Connection issue");
  });

  it("formats salary ranges, file sizes, initials, and stage tones without em dashes", () => {
    const salary = formatSalaryRange(120000, 150000, "USD");
    expect(salary).toContain("$120,000");
    expect(salary).not.toContain("—");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(initialsFor("Nadia Kusuma")).toBe("NK");
    expect(stageTone("hired")).toBe("success");
    expect(stageTone("rejected")).toBe("error");
  });
});
