import { test, expect, type Page } from "@playwright/test";

/** 모바일(≤980px)에서는 [결과] 탭을 눌러야 결과가 보인다. */
async function showResults(page: Page) {
  const tab = page.getByRole("tab", { name: /^결과/ });
  if (await tab.isVisible()) await tab.click();
}
async function showInputs(page: Page) {
  const tab = page.getByRole("tab", { name: "입력" });
  if (await tab.isVisible()) await tab.click();
}

test.describe("워크벤치 U1/U2/U3", () => {
  test("기본 N-80: 판독창·ISO 자동매칭이 표시된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Radiation");
    await showResults(page);
    await expect(page.getByText("HVL1", { exact: true })).toBeVisible();
    await expect(page.locator(".ro.primary .v").first()).toContainText("0.57");
    await expect(page.locator("section.panel", { hasText: "ISO 4037-1 기준장 비교" })).toContainText("N-80", { timeout: 10_000 });
    await expect(page.getByText("밴드 내")).toBeVisible();
  });

  test("수동 모드: 조건을 바꾸면 대기 상태, 계산하기 후 변화량(▲▼) 표시", async ({ page }) => {
    await page.goto("/");
    await showResults(page);
    const before = await page.locator(".ro.primary .v").first().innerText();
    await showInputs(page);
    await page.getByLabel("관전압 kV").fill("120");
    // 대기 상태: 결과 탭/바에 변경 표시, 결과는 아직 이전 값
    await showResults(page);
    await expect(page.getByRole("status").filter({ hasText: "조건이 바뀌었습니다" })).toBeVisible();
    await expect(page.locator(".ro.primary .v").first()).toHaveText(before);
    // 계산하기(화면 폭에 따라 툴바 또는 하단 바)
    await page.getByRole("button", { name: /^계산하기/ }).first().click();
    await expect.poll(async () => page.locator(".ro.primary .v").first().innerText()).not.toBe(before);
    await expect(page.locator(".delta").first()).toBeVisible();
    await expect(page.getByText(/계산 #1 완료/)).toBeVisible();
  });

  test("자동 계산 모드: 입력 즉시 반영", async ({ page, isMobile }) => {
    test.skip(isMobile, "모바일은 하단 바 수동 계산 전용");
    await page.goto("/");
    await page.getByLabel("자동 계산").check();
    const before = await page.locator(".ro.primary .v").first().innerText();
    await page.getByLabel("관전압 kV").fill("100");
    await expect.poll(async () => page.locator(".ro.primary .v").first().innerText()).not.toBe(before);
  });

  test("Cs-137: 핵종 기준장 S-Cs 대조와 커마율이 표시된다", async ({ page }) => {
    await page.goto("/?source=Cs-137");
    await showResults(page);
    await expect(page.getByText("S-Cs")).toBeVisible();
    await expect(page.getByText("공기커마율 (점선원)")).toBeVisible();
    await expect(page.locator("section.panel", { hasText: "운영선량" })).toContainText("μGy/h");
  });

  test("반복측정 입력 → 계산하기 → GUM 불확도 패널이 값을 낸다", async ({ page }) => {
    await page.goto("/");
    const ta = page.getByLabel("판독값 목록");
    await ta.fill("1.482 1.495 1.471 1.488 1.479");
    await ta.blur();
    await page.getByRole("button", { name: /^계산하기/ }).first().click();
    await showResults(page);
    const panel = page.locator("section.panel", { has: page.getByRole("heading", { name: /^D 측정 불확도/ }) });
    await expect(panel).toContainText("k = 2.776");
    await expect(panel).toContainText("반복성 (Type A)");
  });

  test("가로 넘침 없음(입력·결과 탭 모두)", async ({ page }) => {
    await page.goto("/");
    const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(await overflow()).toBeLessThanOrEqual(1);
    await showResults(page);
    expect(await overflow()).toBeLessThanOrEqual(1);
  });

  test("세션 저장 파일이 내려받아진다", async ({ page }) => {
    await page.goto("/");
    const dl = page.waitForEvent("download");
    await page.getByRole("button", { name: "세션 저장" }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/radiation-field-pro_세션\.json$/);
  });

  test("모바일 스크린샷(확인용)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "모바일 전용");
    await page.goto("/");
    await page.screenshot({ path: "test-results/mobile-input.png", fullPage: true });
    await showResults(page);
    await page.screenshot({ path: "test-results/mobile-result.png", fullPage: true });
  });
});
