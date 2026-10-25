import { test, expect, type Page } from "@playwright/test";

/** 모바일(≤980px)에서는 [결과] 탭을 눌러야 결과가 보인다. */
async function showResults(page: Page) {
  const tab = page.getByRole("tab", { name: /^Results/ });
  if (await tab.isVisible()) await tab.click();
}
async function showInputs(page: Page) {
  const tab = page.getByRole("tab", { name: "Input" });
  if (await tab.isVisible()) await tab.click();
}

test.describe("워크벤치 U1/U2/U3", () => {
  test("기본 N-80: 판독창·ISO 자동매칭이 표시된다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Radiation");
    await showResults(page);
    await expect(page.getByText("HVL1", { exact: true })).toBeVisible();
    await expect(page.locator(".ro.primary .v").first()).toContainText("0.57");
    await expect(page.locator("section.panel", { hasText: "ISO 4037-1 reference-field comparison" })).toContainText("N-80", { timeout: 10_000 });
    await expect(page.getByText("Within band")).toBeVisible();
  });

  test("수동 모드: 조건을 바꾸면 대기 상태, 계산하기 후 변화량(▲▼) 표시", async ({ page }) => {
    await page.goto("/");
    await showResults(page);
    const before = await page.locator(".ro.primary .v").first().innerText();
    await showInputs(page);
    await page.getByLabel("Tube voltage kV").fill("120");
    // 대기 상태: 결과 탭/바에 변경 표시, 결과는 아직 이전 값
    await showResults(page);
    await expect(page.getByRole("status").filter({ hasText: "Inputs have changed" })).toBeVisible();
    await expect(page.locator(".ro.primary .v").first()).toHaveText(before);
    // 계산하기(화면 폭에 따라 툴바 또는 하단 바)
    await page.getByRole("button", { name: /^Calculate/ }).first().click();
    await expect.poll(async () => page.locator(".ro.primary .v").first().innerText()).not.toBe(before);
    await expect(page.locator(".delta").first()).toBeVisible();
    await expect(page.getByText(/Calculation #1 done/)).toBeVisible();
  });

  test("자동 계산 모드: 입력 즉시 반영", async ({ page, isMobile }) => {
    test.skip(isMobile, "모바일은 하단 바 수동 계산 전용");
    await page.goto("/");
    await page.getByLabel("Auto-calculate").check();
    const before = await page.locator(".ro.primary .v").first().innerText();
    await page.getByLabel("Tube voltage kV").fill("100");
    await expect.poll(async () => page.locator(".ro.primary .v").first().innerText()).not.toBe(before);
  });

  test("Cs-137: 핵종 기준장 S-Cs 대조와 커마율이 표시된다", async ({ page }) => {
    await page.goto("/?source=Cs-137");
    await showResults(page);
    await expect(page.getByText("S-Cs")).toBeVisible();
    await expect(page.getByText("Air kerma rate (point source)")).toBeVisible();
    await expect(page.locator("section.panel", { hasText: "Operational dose" })).toContainText("μGy/h");
  });

  test("반복측정 입력 → 계산하기 → GUM 불확도 패널이 값을 낸다", async ({ page }) => {
    await page.goto("/");
    const ta = page.getByLabel("Repeat readings");
    await ta.fill("1.482 1.495 1.471 1.488 1.479");
    await ta.blur();
    await page.getByRole("button", { name: /^Calculate/ }).first().click();
    await showResults(page);
    const panel = page.locator("section.panel", { has: page.getByRole("heading", { name: /^D Measurement uncertainty/ }) });
    await expect(panel).toContainText("k = 2.776");
    await expect(panel).toContainText("Repeatability (Type A)");
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
    await page.getByRole("button", { name: "Save session" }).click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/radiation-field-pro_session\.json$/);
  });

  test("영어 전용: <html lang=en>, 화면에 한글 없음, 언어 토글 없음", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("group", { name: /Language|언어/ })).toHaveCount(0);
    for (const view of [showInputs, showResults]) {
      await view(page);
      expect((await page.locator("body").innerText()).match(/[가-힣]/g)).toBeNull();
    }
  });

  test("기본값 문자열: Type B 기본 성분·새 성분·스펙트럼 붙여넣기 이름이 영어", async ({ page }) => {
    await page.goto("/");
    await showInputs(page);
    const names = page.getByLabel("Type B component name");
    await expect(names.first()).toHaveValue("Calibration certificate (reference chamber)");
    await page.getByRole("button", { name: /^\+ Type B component/ }).click();
    await expect(names.nth(1)).toHaveValue("Type B component");
    await expect(page.getByLabel("Repeat readings")).toHaveAttribute("placeholder", /separate with spaces/);
    await page.getByRole("button", { name: "Import", exact: true }).click();
    await page.getByLabel("Paste", { exact: true }).fill("10 1\n20 2\n30 1");
    await page.getByRole("button", { name: /^Apply/ }).click();
    await expect(page.locator("body")).toContainText("Pasted");
  });

  test("ISO 선질 프리셋: 고르면 그 이름이 남고, 관전압을 손으로 바꾸면 Custom (edited)", async ({ page }) => {
    await page.goto("/");
    await showInputs(page);
    const preset = page.getByLabel("ISO beam quality");
    await expect(preset.locator("option:checked")).toHaveText("N-80"); // 기본 입력 = N-80
    await preset.selectOption("H-150");
    await expect(preset).toHaveValue("H-150");
    await expect(preset.locator("option:checked")).toHaveText("H-150");
    await expect(page.getByLabel("Tube voltage kV")).toHaveValue("150");
    await page.getByLabel("Tube voltage kV").fill("151");
    await expect(preset).toHaveValue("");
    await expect(preset.locator("option:checked")).toHaveText("Custom (edited)");
    // 다른 드롭다운도 고른 값이 그대로 보인다
    await page.getByLabel("HVL material").selectOption("Cu");
    await expect(page.getByLabel("HVL material")).toHaveValue("Cu");
    await page.getByLabel("ISO comparison").selectOption("N-100");
    await expect(page.getByLabel("ISO comparison")).toHaveValue("N-100");
  });

  test("모바일 스크린샷(확인용)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "모바일 전용");
    await page.goto("/");
    await page.screenshot({ path: "test-results/mobile-input.png", fullPage: true });
    await showResults(page);
    await page.screenshot({ path: "test-results/mobile-result.png", fullPage: true });
  });
});
