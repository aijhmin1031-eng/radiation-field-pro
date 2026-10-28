import { test, expect, type Page } from "@playwright/test";
import { routeShellAssets } from "./shell-assets";

// 공통 셸 v3 의 apex 자산(https://radiation-lab.com/shell/*)은 vendored 사본 shell/ 로 대신 내준다 — 네트워크 없이, 빌드와 같은 판으로.
test.beforeEach(async ({ page }) => {
  await routeShellAssets(page);
});

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

  test("공통 셸 v3: 머리글 · 꼬리말이 정적으로 있고 shell.css 가 적용되며 제3자(Google Fonts) 요청이 없다", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") external.push(u.hostname);
    });
    await page.goto("/");
    const header = page.locator("header.site[data-shell][data-section='pro']");
    await expect(header).toHaveCount(1);
    await expect(header.locator(".hd-sec")).toHaveText("Field Pro");
    await expect(header.locator('a.hd-item[aria-current="page"]')).toHaveText("Workbench"); // 구역 메뉴의 현재 칸
    await expect(header.locator('.tm-i[aria-current="page"] b')).toContainText("Field Pro"); // Pro workbenches 패널 안(닫혀 있어 보이지 않음)
    await expect(page.locator("footer.site[data-shell]")).toHaveCount(1);
    await expect(page.locator("footer.site .fcol")).toHaveCount(3);
    // 머리글은 React 가 아니라 HTML 에 있다 — 앱 뿌리(#root) 밖에서 body 의 첫 요소(건너뛰기 링크 다음)
    expect(await page.evaluate(() => document.body.children[1]?.matches("header.site") && !document.getElementById("root")?.contains(document.querySelector("header.site")))).toBe(true);
    await page.waitForLoadState("networkidle");
    const applied = await page.evaluate(() => ({
      sheet: [...document.styleSheets].some((s) => s.href?.includes("radiation-lab.com/shell/shell.css")),
      paper: getComputedStyle(document.documentElement).getPropertyValue("--c-paper").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyFont: getComputedStyle(document.body).fontFamily,
      h1Font: getComputedStyle(document.querySelector("h1")!).fontFamily,
      theme: document.documentElement.dataset.theme,
      pressed: document.getElementById("thm")?.getAttribute("aria-pressed"),
    }));
    expect(applied.sheet).toBe(true);
    expect(applied.paper).toBe("232 234 230");
    expect(applied.bodyBg).toBe("rgb(232, 234, 230)");
    expect(applied.bodyFont).not.toMatch(/IBM Plex/);
    expect(applied.h1Font).toMatch(/Saira/);
    expect(applied.theme).toBe("light");
    expect(applied.pressed).toBe("false"); // shell.js 가 돌았다
    expect([...new Set(external)]).toEqual(["radiation-lab.com"]); // apex 뿐 — fonts.googleapis · gstatic 0
  });

  test("공통 셸 v3: 테마 단추로 다크가 켜지고 토큰이 뒤집힌다", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // 셸 파일 v3: 640px 미만의 data-wrap 구역에서는 막대의 #thm 이 숨고 ☰ 시트 안의 #thm-sheet 가 테마 단추다
    const thm = page.locator("#thm");
    if (await thm.isVisible()) await thm.click();
    else {
      await page.locator("summary.hd-burger").click();
      await expect(page.locator("#thm-sheet")).toBeVisible();
      await page.locator("#thm-sheet").click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const dark = await page.evaluate(() => ({
      paper: getComputedStyle(document.documentElement).getPropertyValue("--c-paper").trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      panelBg: getComputedStyle(document.querySelector("section.panel")!).backgroundColor,
      ink: getComputedStyle(document.body).color,
    }));
    expect(dark.paper).toBe("18 21 23");
    expect(dark.bodyBg).toBe("rgb(18, 21, 23)");
    expect(dark.panelBg).toBe("rgb(26, 30, 33)");
    expect(dark.ink).toBe("rgb(230, 233, 234)");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark"); // 저장된 선택이 그리기 전에 적용된다
  });

  test("구획 해시(D8): 탭 · 패널을 옮기면 주소가 바뀌고, 뒤로가기 두 번이 앱 안에서 멈춘다", async ({ page, isMobile }) => {
    await page.goto("/");
    const path = async () => page.evaluate(() => location.pathname + location.hash);
    if (isMobile) {
      await page.getByRole("tab", { name: /^Results/ }).click();
      expect(await path()).toBe("/#results");
      await expect(page.getByText("HVL1", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Input" }).click();
      expect(await path()).toBe("/#input");
      await page.goBack();
      expect(await path()).toBe("/#results");
      await expect(page.getByRole("tab", { name: /^Results/ })).toHaveAttribute("aria-selected", "true");
      await page.goBack();
      expect(await path()).toBe("/");
      await expect(page.getByRole("tab", { name: "Input" })).toHaveAttribute("aria-selected", "true");
    } else {
      await page.locator('a.idx[href="#characteristics"]').click();
      expect(await path()).toBe("/#characteristics");
      await page.locator('a.idx[href="#iso"]').click();
      expect(await path()).toBe("/#iso");
      await page.goBack();
      expect(await path()).toBe("/#characteristics");
      await page.goBack();
      expect(await path()).toBe("/");
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Radiation"); // 아직 앱 안이다
  });

  test("구획 해시(D8): #uncertainty 로 접속하면 그 탭이 열리고 패널이 보인다", async ({ page }) => {
    await page.goto("/#uncertainty");
    const h = page.locator("h2#uncertainty");
    await expect(h).toBeVisible();
    await expect(h).toBeInViewport();
  });

  test("404.html: 공통 셸 + Page not found 본문", async ({ page }) => {
    await page.goto("/404.html");
    await expect(page.locator("header.site[data-shell]")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("There is no page at this address");
    await expect(page.locator("main#main .nf a", { hasText: "Field Pro home" })).toHaveAttribute("href", "https://pro.radiation-lab.com/");
    await expect(page.locator("footer.site[data-shell]")).toHaveCount(1);
    expect((await page.locator("body").innerText()).match(/[가-힣]/g)).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });

  test("공통 셸 v3: 구역 메뉴 다섯 링크(Workbench · Guide · Methods · Validation · About)가 모두 200 — 로컬 서버 기준", async ({ page, baseURL }) => {
    await page.goto("/");
    const hrefs = await page.locator("header.site nav.hd-nav > a.hd-item").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    expect(hrefs).toEqual(["https://pro.radiation-lab.com/", "https://pro.radiation-lab.com/guide/", "https://pro.radiation-lab.com/methods/", "https://pro.radiation-lab.com/validation/", "https://pro.radiation-lab.com/about/"]);
    for (const h of hrefs) {
      const local = new URL(new URL(h).pathname, baseURL!).href; // 절대 주소(pro.radiation-lab.com)의 경로를 이 서버에서
      const res = await page.request.get(local);
      expect(res.status(), h).toBe(200);
      const html = await res.text();
      expect(html, h).toContain('<header class="site"');
      if (h !== "https://pro.radiation-lab.com/") {
        expect(html, h).toContain('<meta name="robots" content="noindex,follow" />'); // T6 전까지 색인 제외
        expect(html, h).toContain(`<a class="hd-item" href="${h}" aria-current="page">`); // 구역 칸 「현재」
        expect(html, h).toContain('<nav class="crumbs"');
      }
    }
    // 임시 쪽 하나를 실제로 열어 셸 · 빵부스러기 · 본문 · 한글 0 · 넘침 0
    await page.goto("/validation/");
    await expect(page.locator("header.site[data-shell]")).toHaveCount(1);
    await expect(page.locator("nav.crumbs li")).toHaveText(["Radiation Lab", "Field Pro", "Validation"]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Validation");
    await expect(page.locator("main#main a.open")).toHaveAttribute("href", "https://pro.radiation-lab.com/");
    expect((await page.locator("body").innerText()).match(/[가-힣]/g)).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  });

  test("모바일 스크린샷(확인용)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "모바일 전용");
    await page.goto("/");
    await page.screenshot({ path: "test-results/mobile-input.png", fullPage: true });
    await showResults(page);
    await page.screenshot({ path: "test-results/mobile-result.png", fullPage: true });
  });
});
