import { test, expect } from "@playwright/test";

test.describe("워크벤치 U1/U2", () => {
  test("기본 N-80: 판독창·ISO 자동매칭이 live로 표시된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Radiation");
    // 특성 판독창
    await expect(page.getByText("HVL1", { exact: true })).toBeVisible();
    await expect(page.locator(".ro.primary .v").first()).toContainText("0.57");
    // ISO 매칭(deferred) — N-80 밴드 내
    await expect(page.locator("section.panel", { hasText: "ISO 4037-1 기준장 비교" })).toContainText("N-80", { timeout: 10_000 });
    await expect(page.getByText("밴드 내")).toBeVisible();
  });

  test("관전압을 바꾸면 출력이 함께 바뀐다", async ({ page }) => {
    await page.goto("/");
    const before = await page.locator(".ro.primary .v").first().innerText();
    await page.getByLabel("관전압 kV").fill("120");
    await expect.poll(async () => page.locator(".ro.primary .v").first().innerText()).not.toBe(before);
  });

  test("Cs-137: 핵종 기준장 S-Cs 대조와 커마율이 표시된다", async ({ page }) => {
    await page.goto("/?source=Cs-137");
    await expect(page.getByText("S-Cs")).toBeVisible();
    await expect(page.getByText("공기커마율 (점선원)")).toBeVisible();
    await expect(page.locator("section.panel", { hasText: "운영선량" })).toContainText("μGy/h");
  });

  test("반복측정 입력 → GUM 불확도 패널이 값을 낸다", async ({ page }) => {
    await page.goto("/");
    const ta = page.getByLabel("판독값 목록");
    await ta.fill("1.482 1.495 1.471 1.488 1.479");
    await ta.blur();
    const panel = page.locator("section.panel", { has: page.getByRole("heading", { name: /^D 측정 불확도/ }) });
    await expect(panel).toContainText("k = 2.776");
    await expect(panel).toContainText("반복성 (Type A)");
  });

  test("가로 넘침 없음(모바일 포함)", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("세션 저장 파일이 내려받아진다", async ({ page }) => {
    await page.goto("/");
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "세션 저장" }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/radiation-field-pro_세션\.json$/);
  });
});
