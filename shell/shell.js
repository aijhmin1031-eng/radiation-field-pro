/* Radiation Lab common shell — behaviour (HEADER-SPEC v3, 2026-10-28). Loaded deferred by every origin.
   It draws nothing: the markup is committed into each page by render.mjs at build time.
   1) Menus: one open at a time · Escape closes and puts focus back on that summary · a click outside closes.
   2) Theme: writes the slot every origin reads, in the tool's shape ({"state":{"mode","resolved"},"version":0}).
   3) Copy link · 4) Account chip label (the state itself is decided before paint by the page's head script). */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;

  var ds = doc.querySelectorAll("header.site details.hd-tools");
  if (ds.length) {
    ds.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (d.open) ds.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      ds.forEach(function (d) { if (d.open) { d.open = false; d.querySelector("summary").focus(); } });
    });
    doc.addEventListener("click", function (e) {
      ds.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
    });
  }

  var KEY = "radmeter-v2-theme";
  var btn = doc.getElementById("thm");
  if (btn) {
    btn.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
    btn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, JSON.stringify({ state: { mode: next, resolved: next }, version: 0 })); } catch (e) {}
      btn.setAttribute("aria-pressed", String(next === "dark"));
    });
  }

  var cp = doc.getElementById("share-copy"), st = doc.getElementById("share-status");
  if (cp) cp.addEventListener("click", function () {
    var u = cp.getAttribute("data-url") || location.href;
    var ok = function () { if (st) { st.textContent = "Copied"; setTimeout(function () { st.textContent = ""; }, 2400); } };
    var no = function () { if (st) st.textContent = u; };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, no); else no(); }
    catch (e) { no(); }
  });

  var who = root.dataset.acctWho || "";
  var el = doc.getElementById("acct-who");
  if (el && who) el.textContent = who;
  var a = doc.getElementById("acct");
  if (a) {
    var label = who ? "Signed in as " + who : "Sign in";
    a.title = label;
    a.setAttribute("aria-label", label);
  }
})();
