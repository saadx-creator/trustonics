import { test, expect, type Page } from "@playwright/test";
const message =
  "  E2E TEST ONLY: ThinkPad T14 Gen 2, 16GB RAM.\nKeep my original formatting.  ";
async function contact(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill("E2E Test Customer");
  await page.getByLabel("WhatsApp number", { exact: true }).fill("03001234567");
  await page
    .getByLabel(
      "I agree that Trustonics may contact me regarding this request.",
    )
    .check();
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
}
async function login(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel("Email address").fill("e2e-admin@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("e2e-only-disposable-password-42");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test("customer request → admin contact, requirements, assignment, note and status history", async ({
  page,
}) => {
  await page.goto("/request/model");
  await page.getByLabel("Your request", { exact: true }).fill(message);
  await page.getByLabel("City", { exact: true }).fill("Lahore");
  await expect(
    page.getByText("Instant estimates aren’t available yet.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue with this request" })
    .click();
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await contact(page);
  await expect(page.locator(".original-message")).toHaveText(message);
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request received." }),
  ).toBeVisible();
  const ref = (await page.locator(".ref-box strong").innerText()).trim();
  await expect(page.locator("body")).not.toContainText("E2E Test Customer");
  await login(page);
  await page.getByRole("link", { name: ref, exact: true }).first().click();
  await expect(page.locator(".original-message")).toHaveText(message);
  await expect(
    page.getByRole("link", { name: "WhatsApp customer" }),
  ).toHaveAttribute("href", /wa\.me\/923001234567/);
  await page.getByLabel("Ram", { exact: true }).fill("16GB");
  await page.getByRole("button", { name: "Save requirements" }).click();
  await page.reload();
  await expect(page.getByLabel("Ram", { exact: true })).toHaveValue("16GB");
  await page.getByLabel("Assigned to", { exact: true }).click();
  await page.getByRole("option", { name: "E2E Test Admin" }).click();
  await page.getByRole("button", { name: "Save assignment" }).click();
  await page.reload();
  await expect(page.getByLabel("Assigned to", { exact: true })).toContainText(
    "E2E Test Admin",
  );
  await page
    .getByLabel("Note", { exact: true })
    .fill("Test only: customer prefers afternoon contact.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(
    page.getByText("Test only: customer prefers afternoon contact.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.locator(".badge-CONTACTED")).toBeVisible();
  await expect(page.locator(".timeline")).toContainText("New → Contacted");
});
test("custom build intake and mobile controls remain usable", async ({
  page,
}) => {
  await page.goto("/builder");
  await expect(
    page.getByText(
      "The interactive builder and instant prices aren’t available yet.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByLabel("Your request", { exact: true })
    .fill("E2E TEST ONLY: i7 desktop, 16GB RAM and 512GB SSD.");
  await page.getByLabel("City", { exact: true }).fill("Karachi");
  await page
    .getByRole("button", { name: "Continue with this request" })
    .click();
  await contact(page);
  const button = page.getByRole("button", {
    name: "Submit request",
    exact: true,
  });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  await expect(page.locator(".floating-whatsapp")).toHaveCount(0);
  await button.click();
  await expect(
    page.getByRole("heading", { name: "Request received." }),
  ).toBeVisible();
});
test("manual WhatsApp lead is recorded with the correct source", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Add request manually" }).click();
  await page
    .getByLabel("Original customer message")
    .fill("E2E TEST ONLY: Customer asked on WhatsApp for a study laptop.");
  await page.getByLabel("City", { exact: true }).fill("Lahore");
  await page
    .getByRole("button", { name: "Continue with this request" })
    .click();
  await page.getByLabel("Customer name").fill("E2E Manual Lead");
  await page.getByLabel("WhatsApp number").fill("03001234567");
  await page
    .getByLabel(
      "The customer has agreed that Trustonics may contact them regarding this request.",
    )
    .check();
  await page
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByText("Need-based · WhatsApp direct", { exact: false }),
  ).toBeVisible();
});
test("business WhatsApp configuration and context", async ({ page }) => {
  await page.goto("/");
  if (process.env.E2E_WHATSAPP !== "1") {
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
    return;
  }
  await expect(page.locator('[data-location="header"]')).toHaveAttribute(
    "href",
    /^https:\/\/wa.me\/923001234567\?text=/,
  );
  await page.goto("/request/need");
  await page
    .getByLabel("Your request", { exact: true })
    .fill("ThinkPad & Dell?");
  let href = await page
    .locator('[data-location="request"]')
    .getAttribute("href");
  expect(new URL(href!).searchParams.get("text")).toContain("ThinkPad & Dell?");
  await page.goto("/builder");
  await page
    .getByLabel("Your request", { exact: true })
    .fill("Core i7, 16GB RAM, 512GB SSD");
  href = await page.locator('[data-location="builder"]').getAttribute("href");
  expect(new URL(href!).searchParams.get("text")).toContain(
    "I'd like this build: Core i7, 16GB RAM, 512GB SSD",
  );
});
test("anonymous admin mutations and cross-origin submissions are rejected", async ({
  request,
}) => {
  const unauthorized = await request.post("/api/admin/requests", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect(unauthorized.status()).toBe(401);
  const csrf = await request.post("/api/requests", {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const res = await request.get("/api/requests");
  expect(res.status()).toBe(405);
});
