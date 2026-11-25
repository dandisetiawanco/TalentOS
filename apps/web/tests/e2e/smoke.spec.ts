import { test, expect } from "@playwright/test";

test.describe("TalentOS critical end-to-end flows", () => {
  test("public landing page, interactive showcase, and careers board load cleanly", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hiring, with greater clarity." })).toBeVisible();
    await page.getByRole("tab", { name: "Candidate profile" }).click();
    await expect(page.getByText("Required qualifications evidence check")).toBeVisible();

    await page.getByRole("link", { name: "Careers" }).first().click();
    await expect(page.getByRole("heading", { name: "Open positions" })).toBeVisible();
    await expect(page.getByText("Staff Frontend Engineer")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("isolated recruiter demo flows across overview, jobs, candidates, pipeline, interviews, analytics", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /Launch recruiter workspace/i }).click();
    await page.waitForURL("**/workspace");
    await expect(page.getByRole("heading", { name: "Recruitment overview" })).toBeVisible();

    await page.getByRole("link", { name: "Jobs" }).first().click();
    await expect(page.getByRole("heading", { name: "Job openings" })).toBeVisible();

    await page.getByRole("link", { name: "Pipeline" }).first().click();
    await expect(page.getByRole("heading", { name: "Recruitment pipeline" })).toBeVisible();

    await page.getByRole("link", { name: "Interviews" }).first().click();
    await expect(page.getByRole("heading", { name: "Interview coordination" })).toBeVisible();

    await page.getByRole("link", { name: "Analytics" }).first().click();
    await expect(page.getByRole("heading", { name: "Recruitment analytics" })).toBeVisible();
  });

  test("candidate demo portal isolates applicant experience from recruiter views", async ({ page }) => {
    await page.goto("/demo");
    await page.getByRole("button", { name: /Launch candidate portal/i }).click();
    await page.waitForURL("**/candidate");
    await expect(page.getByText("Your applications")).toBeVisible();
    // Attempt to visit recruiter route should redirect back to /candidate
    await page.goto("/workspace");
    await page.waitForURL("**/candidate");
  });
});
