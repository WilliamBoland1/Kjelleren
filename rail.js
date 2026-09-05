/* ============================================================
   MANNHULLET · 110 ÅR — in-page section rail (frivillig.html)
   The rail here follows the four role categories instead of the four
   pages: the marker glides to whichever category you're reading, the
   way .depth on the landing page follows the descent. Page navigation
   stays in the top nav.

   Same idiom as script.js — one passive scroll listener behind a rAF
   guard — writing a single [data-current] attribute that background.css
   already knows how to draw. Nothing is positioned here.

   Falls back cleanly: without JS the markup ships data-current="bar"
   and the rail renders statically, correctly. Clicking a stop needs no
   JS either — they're ordinary # anchors, and scroll-margin-top on the
   sections keeps the heading clear of the fixed header.
   ============================================================ */

(() => {
  "use strict";

  const rail = document.querySelector(".section-rail[data-spy]");
  if (!rail) return;

  // the stops are derived from the markup rather than a config array — the
  // rail list is already the single source of which categories exist, and
  // in which order
  const stops = Array.from(rail.querySelectorAll('.section-rail-link[href^="#"]'))
    .map((link) => ({ link, section: document.getElementById(link.getAttribute("href").slice(1)) }))
    .filter((s) => s.section);
  if (!stops.length) return;

  // the rail is display:none below this width (background.css) — no reason to
  // run a scroll listener while nobody can see the result
  const wide = window.matchMedia("(min-width: 1280px)");

  // the "reading line": a third of the way down rather than at the very top
  // edge, so a category only counts as current once it has actually settled
  // into view
  const readLine = () => window.innerHeight * 0.32;

  let current = null;
  function activate(stop) {
    if (stop === current) return;
    current = stop;
    rail.setAttribute("data-current", stop.section.id.replace(/^cat-/, ""));
    for (const s of stops) {
      if (s === stop) s.link.setAttribute("aria-current", "true");
      else s.link.removeAttribute("aria-current");
    }
  }

  function pick() {
    const line = readLine();
    // the last category to have crossed the reading line wins. Before any of
    // them has, the first stop stays lit — the rail is never dead.
    let winner = stops[0];
    for (const s of stops) {
      if (s.section.getBoundingClientRect().top <= line) winner = s;
    }
    // ...except at the very bottom of the document, which always goes to the
    // last stop: the final category is short enough that its top may never
    // reach the reading line, and the marker would otherwise sit one stop
    // early through the whole tail of the page.
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    activate(atBottom ? stops[stops.length - 1] : winner);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; pick(); });
  }

  let listening = false;
  function sync() {
    if (wide.matches === listening) return;
    if (wide.matches) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      listening = true;
      pick();
    } else {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      listening = false;
    }
  }
  wide.addEventListener("change", sync);
  sync();
})();
