# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke-onboarding.spec.ts >> new user lands on onboarding and can reach the plan screen
- Location: test/smoke-onboarding.spec.ts:17:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/signup
Call log:
  - navigating to "http://localhost:3000/signup", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { test, expect, type Page } from "@playwright/test";
  2  | 
  3  | const TEST_EMAIL = `smoke-${Date.now()}@fittrack.test`;
  4  | const TEST_PASSWORD = "Testpassword1";
  5  | const TEST_NAME = "Smoke Tester";
  6  | 
  7  | async function signUp(page: Page) {
> 8  |   await page.goto("/signup", { waitUntil: "domcontentloaded" });
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/signup
  9  |   await page.waitForLoadState("networkidle", { timeout: 30_000 });
  10 |   await page.getByLabel("Name").fill(TEST_NAME);
  11 |   await page.getByLabel("Email").fill(TEST_EMAIL);
  12 |   await page.getByLabel("Password").fill(TEST_PASSWORD);
  13 |   await page.getByRole("button", { name: /create account/i }).click();
  14 |   await page.waitForURL("/");
  15 | }
  16 | 
  17 | test("new user lands on onboarding and can reach the plan screen", async ({ page }) => {
  18 |   await signUp(page);
  19 | 
  20 |   // First-time users should be redirected to the onboarding flow, not the empty dashboard.
  21 |   await expect(page).toHaveURL(/\/onboarding/);
  22 |   await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible({ timeout: 10_000 });
  23 | 
  24 |   // Step 1 — goal form.
  25 |   await page.getByRole("link", { name: /start the assessment/i }).click();
  26 |   await expect(page.getByRole("heading", { name: /step 1 of 2/i })).toBeVisible();
  27 |   await page.getByRole("radio", { name: /muscle/i }).check();
  28 |   await page.getByRole("radio", { name: /intermediate/i }).check();
  29 |   await page.getByRole("radio", { name: /bodyweight only/i }).check();
  30 |   await page.getByRole("button", { name: /continue to fitness checks/i }).click();
  31 | 
  32 |   // Step 2 — fitness checks. We only verify the UI renders each exercise prompt
  33 |   // and can log a value; the actual Groq plan generation is skipped when there is
  34 |   // no GROQ_API_KEY, so we assert the plan step has a regenerate path instead.
  35 |   await expect(page.getByRole("heading", { name: /step 2 of 2/i })).toBeVisible();
  36 |   await page.getByRole("button", { name: /i’m ready — take the test/i }).click();
  37 |   await expect(page.getByLabel(/max push-ups result/i)).toBeVisible();
  38 | 
  39 |   // Log all four assessment exercises with dummy values.
  40 |   const dummyValues = ["25", "30", "45", "75"];
  41 |   for (let i = 0; i < dummyValues.length; i++) {
  42 |     await page.getByLabel(/your result/i).fill(dummyValues[i]);
  43 |     await page.getByRole("button", { name: /log result/i }).click();
  44 |     // After the last exercise the page moves to "generating" then "plan".
  45 |     if (i < dummyValues.length - 1) {
  46 |       await expect(page.getByRole("heading", { name: /fitness checks/i })).toBeVisible();
  47 |       await page.getByRole("button", { name: /i’m ready — take the test/i }).click();
  48 |     } else {
  49 |       // Wait for either the plan screen or the generating spinner.
  50 |       await page.waitForFunction(
  51 |         () => {
  52 |           const text = document.body.innerText;
  53 |           return (
  54 |             text.includes("Building your plan") ||
  55 |             text.includes("Your training menu is ready") ||
  56 |             text.includes("Plan generation failed")
  57 |           );
  58 |         },
  59 |         { timeout: 60_000 },
  60 |       );
  61 | 
  62 |       const bodyText = await page.innerText("body");
  63 |       if (bodyText.includes("Plan generation failed") || bodyText.includes("Building your plan")) {
  64 |         // No Groq key — that's fine for this smoke test. Just make sure the page is
  65 |         // in a recoverable state (the plan screen or an error with a regenerate/retry path).
  66 |         await expect(
  67 |           page.getByRole("button", { name: /regenerate/i }).or(page.getByRole("button", { name: /retry/i })),
  68 |         ).toBeVisible({ timeout: 10_000 });
  69 |         // Continue to the dashboard through the "Go to dashboard" link if present.
  70 |         const dashLink = page.getByRole("link", { name: /go to dashboard/i });
  71 |         if (await dashLink.isVisible()) {
  72 |           await dashLink.click();
  73 |         } else {
  74 |           await page.goto("/");
  75 |         }
  76 |       } else {
  77 |         await expect(page.getByRole("heading", { name: /your training menu is ready/i })).toBeVisible();
  78 |         await page.getByRole("link", { name: /go to dashboard/i }).click();
  79 |       }
  80 |     }
  81 |   }
  82 | 
  83 |   // Dashboard should now show the "This week" plan card (if Groq succeeded) or at
  84 |   // least be reachable and show the training-plan nav item.
  85 |   await expect(page).toHaveURL("/");
  86 |   await expect(page.getByRole("heading", { name: /personal bests/i })).toBeVisible();
  87 | 
  88 |   // Training plan is now a dashboard nav item.
  89 |   await expect(page.getByRole("link", { name: /training plan/i })).toBeVisible();
  90 | 
  91 |   // Full plan page is reachable.
  92 |   await page.getByRole("link", { name: /training plan/i }).click();
  93 |   await expect(page.getByRole("heading", { name: /training plan/i })).toBeVisible();
  94 | });
  95 | 
```