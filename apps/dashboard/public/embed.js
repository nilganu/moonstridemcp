/*
 * Moonstride Navigator — embeddable chat widget loader.
 *
 * Usage on any page:
 *   <script src="https://YOUR_HOST/embed.js"
 *           data-host="https://YOUR_HOST"
 *           data-key="YOUR_WIDGET_KEY"></script>
 *
 * Injects the compass launcher (bottom-right) + an isolated iframe panel.
 * data-host defaults to the script's own origin. data-key is required only if
 * the dashboard has WIDGET_KEY configured.
 */
(function () {
  var script = document.currentScript;
  var origin = (function () { try { return new URL(script.src).origin; } catch (e) { return ""; } })();
  var host = (script && script.getAttribute("data-host")) || origin;
  var key = (script && script.getAttribute("data-key")) || "";
  var Z = 2147483000;

  if (window.__moonstrideWidgetLoaded) return;
  window.__moonstrideWidgetLoaded = true;

  // ── Panel iframe (the Navigator dialog) ──
  var iframe = document.createElement("iframe");
  iframe.src = host + "/widget" + (key ? "?k=" + encodeURIComponent(key) : "");
  iframe.title = "Aria — Moonstride assistant";
  iframe.allow = "clipboard-write";
  var PANEL = "position:fixed;bottom:104px;right:28px;z-index:" + Z +
    ";width:420px;height:680px;max-width:calc(100vw - 32px);max-height:calc(100vh - 140px);" +
    "border:0;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.2);background:#f8f7fc;display:none;";
  var PANEL_EXPANDED = "position:fixed;bottom:104px;right:28px;z-index:" + Z +
    ";width:80vw;max-width:1200px;height:85vh;border:0;border-radius:24px;" +
    "box-shadow:0 20px 60px rgba(0,0,0,.2);background:#f8f7fc;display:block;";
  iframe.style.cssText = PANEL;

  // ── Compass launcher (matches the Navigator FAB) ──
  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open Aria");
  btn.style.cssText =
    "position:fixed;bottom:28px;right:28px;z-index:" + Z +
    ";width:60px;height:60px;border-radius:50%;background:#fff;border:2px solid #5B50D6;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 0 0 3px rgba(91,80,214,.12),0 4px 20px rgba(91,80,214,.25);transition:transform .2s;";
  var COMPASS =
    '<svg width="34" height="34" viewBox="0 0 46 46" fill="none"><circle cx="23" cy="23" r="18" stroke="#C8B8FF" stroke-width="1.2"/><circle cx="23" cy="23" r="13" stroke="#A080FF" stroke-width="1.2"/><circle cx="23" cy="23" r="8" stroke="#7B50FF" stroke-width="1.2"/><circle cx="23" cy="5" r="4.5" fill="#FF0060"/><circle cx="41" cy="23" r="3.5" fill="#A020FF"/><circle cx="23" cy="41" r="3.5" fill="#00E8A2"/><circle cx="5" cy="23" r="3.5" fill="#00BBFF"/><circle cx="23" cy="5" r="2.2" fill="#fff"/><circle cx="41" cy="23" r="1.7" fill="#fff"/><circle cx="23" cy="41" r="1.7" fill="#fff"/><circle cx="5" cy="23" r="1.7" fill="#fff"/></svg>';
  var CLOSE =
    '<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="#7B2FFF" stroke-width="2.2" stroke-linecap="round"/></svg>';
  btn.innerHTML = COMPASS;

  var open = false;
  var expanded = false;
  function setOpen(v) {
    open = v;
    iframe.style.cssText = v ? (expanded ? PANEL_EXPANDED : PANEL) : PANEL;
    iframe.style.display = v ? "block" : "none";
    btn.innerHTML = v ? CLOSE : COMPASS;
    btn.setAttribute("aria-label", v ? "Close Aria" : "Open Aria");
  }
  btn.addEventListener("click", function () { setOpen(!open); });
  btn.addEventListener("mouseenter", function () { btn.style.transform = "scale(1.08)"; });
  btn.addEventListener("mouseleave", function () { btn.style.transform = "scale(1)"; });

  // Messages from the panel (close / expand toggle).
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.source !== "moonstride-navigator") return;
    if (d.type === "navigator:close") setOpen(false);
    if (d.type === "navigator:toggle-expand") { expanded = !expanded; setOpen(true); }
  });

  function mount() { document.body.appendChild(iframe); document.body.appendChild(btn); }
  if (document.body) mount();
  else window.addEventListener("DOMContentLoaded", mount);
})();
