// Radiation Lab common shell renderer — HEADER-SPEC v3 (2026-10-28).
// Pure string functions, no DOM: shell.json + page context → the header/footer markup every origin
// commits into its pages at build time (umbrella: scripts/apply-shell.mjs; RadCalc: SiteHeader.astro;
// Field Pro: Vite transformIndexHtml; RadiMeter: SiteBar.astro; M-Phreefiteq: Shell.tsx).
// The markup is the umbrella's one-row bar of 2026-10-06 (.hd/.tm/.thm/.acct), unchanged in shape,
// plus a section slot ("/ RadiMeter"), a section nav and a three-column footer. Styles: shell.css.
// Behaviour (one open menu, Escape, theme, copy link, account label): shell.js.

/**
 * @typedef {"home"|"calc"|"pro"|"radimeter"|"disposal"} SectionKey
 * @typedef {{ section?: SectionKey, currentHref?: string, apex?: boolean }} HeaderOpts
 * @typedef {{ section?: SectionKey, pageUrl?: string, shareText?: string, apex?: boolean, versionLabel?: string }} FooterOpts
 * @typedef {{ section: SectionKey, trail?: { label: string, href?: string }[], apex?: boolean }} BreadcrumbOpts
 * @typedef {{ section: SectionKey }} SectionOpts
 * @typedef {{ apex?: boolean, withThemeBoot?: boolean }} HeadOpts
 * @typedef {Record<string, any>} ShellSpec  shell.json
 */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const APEX = "https://radiation-lab.com";
const same = (a, b) => a && b && a.replace(/\/$/, "") === b.replace(/\/$/, "");

/** On the apex, apex links are root-relative (the gates and the pages count them as this origin's paths). */
function hrefFor(href, apex) {
  if (apex && href.startsWith(APEX + "/")) return href.slice(APEX.length);
  if (apex && href === APEX + "/") return "/";
  return href;
}
const ICON = (inner, cls = "") =>
  `<svg class="${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const CHEV = `<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const EXT = `<svg class="ext" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`;
const MARK = `<svg class="hd-mark" viewBox="0 0 64 64" aria-hidden="true">
      <defs><radialGradient id="mark-core" cx="36%" cy="31%" r="74%">
        <stop offset="0" stop-color="rgb(var(--mark-core-a))"/>
        <stop offset="1" stop-color="rgb(var(--mark-core-b))"/>
      </radialGradient></defs>
      <polygon points="32.00,6.20 50.24,13.76 57.80,32.00 50.24,50.24 32.00,57.80 13.76,50.24 6.20,32.00 13.76,13.76"
               fill="none" stroke="rgb(var(--c-ink))" stroke-width="5" stroke-linejoin="miter"/>
      <circle cx="32" cy="32" r="15" fill="url(#mark-core)"/>
    </svg>`;
const SUN_MOON = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor"
           stroke-width="1.6" stroke-linecap="round">
        <g class="thm-sun"><circle cx="8" cy="8" r="3.1"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15
          M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13"/></g>
        <g class="thm-moon"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/></g>
      </svg>`;
const USER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
      </svg>`;

function resolveSection(spec, key) {
  const s = { ...spec.sections[key] };
  if (s.nav === "home") s.nav = spec.sections.home.nav;
  if (s.footerColumn === "home") s.footerColumn = spec.sections.home.footerColumn;
  if (!s.footerColumn) s.footerColumn = { title: s.name, links: s.nav.map((n) => ({ href: n.href, label: n.long })) };
  s.key = key;
  return s;
}

function group(g, apex, currentHref, external) {
  const li = g.items.map((it) => {
    const cur = same(it.href, currentHref) ? ' aria-current="page"' : "";
    const ext = external ? EXT : "";
    return `<li><a class="tm-i" href="${esc(hrefFor(it.href, apex))}"${cur}>${ICON(it.icon)}<span><b>${esc(it.name)}${ext}</b><em>${esc(it.line)}</em></span></a></li>`;
  }).join("\n              ");
  return `<p class="tm-h" id="${g.id}">${esc(g.name)}</p>
            <ul aria-labelledby="${g.id}">
              ${li}
            </ul>`;
}

function menu(m, { apex, currentHref, extraGroup }) {
  const groups = extraGroup ? [...m.groups, extraGroup] : m.groups;
  const summary = `<summary class="hd-item${m.chip ? " hd-chip" : ""}"><span class="hd-l">${esc(m.long)}</span><span class="hd-s">${esc(m.short)}</span>${CHEV}</summary>`;
  let body;
  if (m.columns) {
    body = `<div class="tm-cols">
          ${groups.map((g) => `<div class="tm-col">
            ${group(g, apex, currentHref, g.external)}
          </div>`).join("\n          ")}
        </div>`;
  } else {
    body = groups.map((g) => group(g, apex, currentHref, g.external)).join("\n        ");
  }
  return `<details class="hd-tools" id="${m.id}">
      ${summary}
      <div class="${m.panelClass}">
        ${body}
      </div>
    </details>`;
}

/**
 * renderHeader(spec, { section: "radimeter", currentHref: "https://radimeter.radiation-lab.com/guides/", apex: false })
 *  section     key of spec.sections. "home" and "calc" share the apex bar (no section name).
 *  currentHref absolute URL of the page; marks aria-current on the bar and inside the Calculators panel.
 *  apex        true on radiation-lab.com (umbrella and RadCalc): apex hrefs become root-relative.
 */
/** @param {ShellSpec} spec @param {HeaderOpts} [opts] @returns {string} */
export function renderHeader(spec, { section = "home", currentHref = "", apex = section === "home" || section === "calc" } = {}) {
  const sec = resolveSection(spec, section);
  const offApex = !(section === "home" || section === "calc");
  const items = sec.nav.map((n) => {
    const cur = same(n.href, currentHref) ? ' aria-current="page"' : "";
    const label = n.long === n.short ? esc(n.long) : `<span class="hd-l">${esc(n.long)}</span><span class="hd-s">${esc(n.short)}</span>`;
    return `<a class="hd-item" href="${esc(hrefFor(n.href, apex))}"${cur}>${label}</a>`;
  });
  const count = spec.menus.length + items.length;
  const wrap = count >= 8 ? ' data-wrap="1340"' : count === 7 ? ' data-wrap="1240"' : "";
  const secMark = sec.name
    ? `\n  <span class="hd-sep" aria-hidden="true">/</span><a class="hd-sec" href="${esc(sec.home)}">${esc(sec.name)}</a>`
    : "";
  const acct = sec.account
    ? `
    <a class="acct" id="acct" href="${esc(hrefFor(sec.account, apex))}">
      ${USER}<b data-acct-out>Sign in</b><b data-acct-in id="acct-who"></b>
    </a>`
    : "";
  return `<header class="site" data-shell="${spec.version}" data-section="${esc(section)}"><div class="hd">
  <a class="hd-brand" href="${esc(spec.brand.home)}" aria-label="${esc(spec.brand.label)}">
    ${MARK}
    <span class="hd-nm">${esc(spec.brand.name)}</span>
  </a>${secMark}
  <nav class="hd-nav" aria-label="Main" lang="en"${wrap}>
    ${spec.menus.map((m) => menu(m, { apex, currentHref, extraGroup: offApex && m.columns ? spec.extraGroupOffApex : null })).join("\n    ")}
    ${items.join("\n    ")}
  </nav>
  <div class="hd-ctl">
    <button type="button" class="thm" id="thm" aria-label="${esc(spec.theme.toggleLabel)}"
            title="Light / dark theme">
      ${SUN_MOON}
    </button>${acct}
  </div>
</div></header>`;
}

function shareRow(pageUrl, shareText) {
  const u = (net) => encodeURIComponent(`${pageUrl}?utm_source=${net}&utm_medium=social&utm_campaign=share`).replace(/%2F/g, "/");
  const t = encodeURIComponent(shareText);
  return `<div class="share" aria-label="Share this page">
    <span class="share-l">Share</span>
    <button type="button" class="share-b" id="share-copy" data-url="${esc(pageUrl)}?utm_source=copy&amp;utm_medium=share&amp;utm_campaign=share">Copy link</button>
    <a class="share-b" target="_blank" rel="noopener noreferrer"
       href="https://x.com/intent/post?text=${t}&amp;url=${u("x")}">X</a>
    <a class="share-b" target="_blank" rel="noopener noreferrer"
       href="https://www.threads.net/intent/post?text=${t}%20${u("threads")}">Threads</a>
    <a class="share-b" target="_blank" rel="noopener noreferrer"
       href="https://www.linkedin.com/sharing/share-offsite/?url=${u("linkedin")}">LinkedIn</a>
    <a class="share-b" target="_blank" rel="noopener noreferrer"
       href="https://www.facebook.com/sharer/sharer.php?u=${u("facebook")}">Facebook</a>
    <span class="share-s" id="share-status" role="status" aria-live="polite"></span>
  </div>`;
}

/**
 * renderFooter(spec, { section, pageUrl, shareText, apex, versionLabel })
 *  Share row, three columns ({section or About the site} / Radiation Lab / Legal), one line.
 */
/** @param {ShellSpec} spec @param {FooterOpts} [opts] @returns {string} */
export function renderFooter(spec, { section = "home", pageUrl, shareText, apex = section === "home" || section === "calc", versionLabel } = {}) {
  const sec = resolveSection(spec, section);
  const col = (title, links) => `<div class="fcol">
      <p class="fh">${esc(title)}</p>
      <div class="links">
        ${links.map((l) => `<a href="${esc(hrefFor(l.href, apex))}">${esc(l.label)}</a>`).join("\n        ")}
      </div>
    </div>`;
  const legal = spec.footer.legal.links.map((l) => ({ ...l, href: l.href === "{disclaimer}" ? sec.disclaimer : l.href }));
  const partOf = sec.name ? spec.footer.partOf.replace("{section}", sec.name) + " " : "";
  return `<footer class="site" data-shell="${spec.version}"><div class="ft">
  ${shareRow(pageUrl, shareText)}
  <div class="fcols">
    ${col(sec.footerColumn.title, sec.footerColumn.links)}
    ${col(spec.footer.platform.title, spec.footer.platform.links)}
    ${col(spec.footer.legal.title, legal)}
  </div>
  <div class="fline">${esc(partOf)}${esc(spec.footer.line)}${versionLabel ? ` <span class="fver">${esc(versionLabel)}</span>` : ""}</div>
</div></footer>`;
}

/** Breadcrumb for every page that is not a home: Radiation Lab / {Section} / … Each crumb a link but the last. Emits BreadcrumbList JSON-LD. */
/** @param {ShellSpec} spec @param {BreadcrumbOpts} opts @returns {string} */
export function renderBreadcrumb(spec, { section, trail = [], apex = section === "home" || section === "calc" }) {
  const sec = resolveSection(spec, section);
  const crumbs = [{ label: spec.brand.name, href: spec.brand.home }];
  if (sec.name) crumbs.push({ label: sec.name, href: sec.home });
  crumbs.push(...trail);
  const li = crumbs.map((c, i) => i === crumbs.length - 1 || !c.href
    ? `<li aria-current="page">${esc(c.label)}</li>`
    : `<li><a href="${esc(hrefFor(c.href, apex))}">${esc(c.label)}</a></li>`).join("");
  const ld = { "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: c.href } : {}) })) };
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${li}</ol></nav><script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

/** One line under the breadcrumb on app screens (workbench UIs): a way back that does not depend on the browser's history. */
/** @param {ShellSpec} spec @param {SectionOpts} opts @returns {string} */
export function renderBackLine(spec, { section }) {
  const sec = resolveSection(spec, section);
  return `<p class="back"><a href="${esc(sec.home)}">&larr; Back to ${esc(sec.name)} home</a></p>`;
}

/** 404 body for the subdomains (the umbrella keeps its own, longer one). */
/** @param {ShellSpec} spec @param {SectionOpts} opts @returns {string} */
export function renderNotFound(spec, { section }) {
  const sec = resolveSection(spec, section);
  const links = [
    ...(sec.name ? [[sec.home, `${sec.name} home`]] : []),
    [spec.brand.home, "Radiation Lab home"],
    [APEX + "/#tools", "The eight calculators"],
    [APEX + "/#workbenches", "Pro workbenches"],
  ];
  return `<main id="main"><div class="nf">
  <div class="crumb"><a href="${esc(spec.brand.home)}">Radiation Lab</a>${sec.name ? ` / <a href="${esc(sec.home)}">${esc(sec.name)}</a>` : ""} / Not found</div>
  <h1>${esc(spec.notFound.title)}</h1>
  <p class="lede">${esc(spec.notFound.body)}</p>
  <ul>${links.map(([h, l]) => `<li><a href="${esc(h)}">${esc(l)}</a></li>`).join("")}</ul>
</div></main>`;
}

/**
 * <head> fragment. apex=true: root-relative asset URLs (same origin, no third-party request);
 * otherwise absolute. withThemeBoot adds the before-paint theme script the umbrella pages already carry.
 */
/** @param {ShellSpec} spec @param {HeadOpts} [opts] @returns {string} */
export function renderHeadAssets(spec, { apex = false, withThemeBoot = !apex } = {}) {
  const v = `?v=${spec.version}`;
  const css = apex ? "/shell/shell.css" : spec.assets.css;
  const js = apex ? "/shell/shell.js" : spec.assets.js;
  const boot = withThemeBoot ? `<script>
  /* Apply the stored theme before first paint. The key and its shape ({"state":{"mode","resolved"},"version":0})
     are the ones every Radiation Lab origin writes, so a choice made on one site follows to the others
     where storage is shared, and is at least spelled the same where it is not. */
  try {
    var raw = localStorage.getItem("${spec.theme.storageKey}");
    var mode = raw ? (JSON.parse(raw).state || {}).mode : "system";
    if (mode !== "light" && mode !== "dark") mode = "system";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    var m = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    document.documentElement.dataset.theme = m && m.matches ? "dark" : "light";
  }
</script>
` : "";
  return `${boot}${apex ? "" : `<link rel="preconnect" href="${APEX}" crossorigin />\n`}<link rel="stylesheet" href="${css}${v}" />
<script src="${js}${v}" defer></script>`;
}

export const SHELL_VERSION_ATTR = "data-shell";
