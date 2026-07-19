/* ============================================================
   MANNHULLET · 110 ÅR — mobile nav toggle
   Shared by every page (index.html + the three simple pages).
   Purely presentational: toggles a body class the CSS in
   background.css reads to slide .header-nav in/out as a panel
   below 720px. No-ops above that width since #navToggle is
   display:none there and never receives a click.
   ============================================================ */

(() => {
  "use strict";

  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("headerNav");
  const scrim = document.getElementById("navScrim");
  if (!toggle || !nav || !scrim) return;

  const isOpen = () => document.body.classList.contains("nav-open");

  function openNav() {
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    const firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function closeNav({ restoreFocus = false } = {}) {
    if (!isOpen()) return;
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener("click", () => {
    if (isOpen()) closeNav({ restoreFocus: true });
    else openNav();
  });

  scrim.addEventListener("click", () => closeNav());

  // closes on link tap — matters for in-page anchors (e.g. index.html's own
  // "Hjem" link), which wouldn't otherwise unload the page and reset state
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) closeNav();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav({ restoreFocus: true });
  });
})();
