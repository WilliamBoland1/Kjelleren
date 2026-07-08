/* ============================================================
   MANNHULLET · 110 ÅR — the descent engine
   A fixed cinematic "stage" whose scenes are driven entirely by
   scroll progress (0 → 1). Nothing scrolls visually; scrolling
   moves the camera down the building and into the cellar.
   ============================================================ */

(() => {
  "use strict";

  /* --- Configurable jubilee date (local time) --- */
  const ANNIVERSARY = new Date("2026-10-24T19:00:00");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // normalized progress of `p` across the [a,b] window → 0..1
  const range = (p, a, b) => clamp((p - a) / (b - a));
  // smoothstep for softer easing on transforms
  const smooth = (t) => t * t * (3 - 2 * t);

  /* ---------- elements ---------- */
  const track = $("#scrollTrack");
  const stage = $("#stage");
  const hero = $("#scHero");
  const stairs = $("#scStairs");
  const stairsImg = $("#stairsImg");
  const stairsShade = $("#stairsShade");
  const cellarGlow = $("#cellarGlow");
  const scCellar = $("#scCellar");
  const cellarImg = $("#cellarImg");
  const climax = $("#climax");
  const descentWord = $("#descentWord");
  const flash = $("#flash");
  const depthFill = $("#depthFill");
  const depthLabel = $("#depthLabel");
  const yearEls = [...document.querySelectorAll(".year")];

  /* Total scroll length of the journey. Longer = slower, more cinematic. */
  const TRACK_VH = reduce ? 300 : 620;
  track.style.height = TRACK_VH + "vh";

  /* ---------- reveal the hero on load ---------- */
  window.addEventListener("load", () => {
    document.querySelectorAll(".reveal").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), 180 + i * 160);
    });
  });

  /* ============================================================
     SCROLL → SCENE MAPPING
     progress windows (0..1 of the whole track):
       0.00–0.10  hero holds
       0.08–0.40  descend the staircase (hero fades, stairs zoom)
       0.34–0.52  approach the foot — glow grows, dollhouse pull
       0.50–0.62  the flash → arrival in the cellar
       0.60–0.80  climax text
       0.78–1.00  cellar becomes the interactive menu
     ============================================================ */

  let flashed = false;
  let ticking = false;

  function render() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;

    /* ---- Scene 1: hero ---- */
    const heroOut = range(p, 0.05, 0.24);
    hero.style.opacity = 1 - heroOut;
    hero.style.transform = `scale(${lerp(1, 1.12, smooth(heroOut))})`;
    hero.style.filter = `blur(${lerp(0, 6, heroOut)}px)`;
    hero.style.pointerEvents = heroOut > 0.9 ? "none" : "auto";

    /* ---- Scene 2/3: the staircase ---- */
    const stairsIn = range(p, 0.08, 0.20);
    const descend = range(p, 0.08, 0.52);          // travel down the flight
    const stairsOut = range(p, 0.50, 0.60);
    stairs.style.opacity = stairsIn * (1 - stairsOut);
    stairs.setAttribute("aria-hidden", stairsIn <= 0 ? "true" : "false");

    // move the camera down the image + push in
    const dz = smooth(descend);
    stairsImg.style.transform =
      `scale(${lerp(1.05, 1.9, dz)}) translateY(${lerp(-2, 10, dz)}%)`;
    stairsImg.style.backgroundPosition = `50% ${lerp(6, 88, dz)}%`;
    // light warms and dims as we sink
    stairsImg.style.filter =
      `brightness(${lerp(1, 0.62, dz)}) sepia(${lerp(0, 0.4, dz)}) saturate(${lerp(1, 1.5, dz)}) hue-rotate(${lerp(0, -12, dz)}deg)`;

    // warm glow from the cellar swelling at the foot of the stairs
    cellarGlow.style.opacity = range(p, 0.32, 0.54);
    cellarGlow.style.transform =
      `translateX(-50%) scale(${lerp(0.5, 1.35, range(p, 0.32, 0.56))})`;

    // "Ned." surfaces mid-descent then leaves
    const wordIn = range(p, 0.16, 0.24);
    const wordOut = range(p, 0.30, 0.40);
    descentWord.style.opacity = wordIn * (1 - wordOut);
    descentWord.style.transform =
      `translateX(-50%) translateY(${lerp(20, -20, range(p, 0.16, 0.40))}px)`;

    // historical year markers surface one by one along the descent
    yearEls.forEach((el) => {
      const at = parseFloat(el.dataset.at);
      const local = range(p, at - 0.05, at + 0.05);      // in
      const gone = range(p, at + 0.05, at + 0.12);        // out
      const vis = local * (1 - gone);
      el.style.opacity = vis * 0.9;
      el.style.transform = `translateY(${lerp(40, -40, range(p, at - 0.06, at + 0.12))}px)`;
    });

    /* ---- the flash + Scene 4: arrival ---- */
    const cellarIn = range(p, 0.52, 0.60);
    scCellar.style.opacity = cellarIn;
    scCellar.setAttribute("aria-hidden", cellarIn <= 0 ? "true" : "false");
    // slow drift on the cellar photo = handheld feel
    cellarImg.style.transform =
      `scale(${lerp(1.18, 1.05, range(p, 0.52, 1))})`;

    if (!flashed && p >= 0.53) triggerFlash();
    if (flashed && p < 0.48) flashed = false; // allow re-trigger if scrolling back up

    /* ---- climax text ---- */
    const climaxIn = range(p, 0.60, 0.68);
    const climaxOut = range(p, 0.80, 0.90);
    const cv = climaxIn * (1 - climaxOut);
    climax.style.opacity = cv;
    climax.style.transform = `translateY(${lerp(24, -10, climaxIn)}px)`;

    /* ---- Scene 5: the menu goes live ---- */
    const live = p >= 0.86;
    document.body.classList.toggle("menu-live", live);

    /* ---- body theme states ---- */
    document.body.classList.toggle("descending", p > 0.08 && p < 0.55);
    document.body.classList.toggle("arrived", p >= 0.55);

    /* ---- stage backdrop navy → black ---- */
    const bk = smooth(range(p, 0.1, 0.55));
    stage.style.background =
      `rgb(${lerp(6, 0, bk)}, ${lerp(11, 0, bk)}, ${lerp(20, 0, bk)})`;

    /* ---- depth gauge ---- */
    depthFill.style.height = (p * 100).toFixed(1) + "%";
    depthLabel.textContent =
      p < 0.08 ? "1. ETASJE" :
      p < 0.30 ? "TRAPPA" :
      p < 0.52 ? "PÅ VEI NED" :
      p < 0.62 ? "FOTEN AV TRAPPA" : "KJELLEREN";
  }

  function triggerFlash() {
    flashed = true;
    if (reduce) return;
    flash.classList.remove("pop");
    void flash.offsetWidth; // restart animation
    flash.classList.add("pop");
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", render);
  render();

  /* ============================================================
     COUNTDOWN
     ============================================================ */
  const pad = (n) => String(n).padStart(2, "0");
  const cd = {
    d: $("#cdDays"), h: $("#cdHours"), m: $("#cdMins"), s: $("#cdSecs"),
  };
  function tick() {
    let diff = ANNIVERSARY - new Date();
    if (diff < 0) diff = 0;
    const days = Math.floor(diff / 864e5);
    const hrs = Math.floor((diff % 864e5) / 36e5);
    const min = Math.floor((diff % 36e5) / 6e4);
    const sec = Math.floor((diff % 6e4) / 1e3);
    cd.d.textContent = days;
    cd.h.textContent = pad(hrs);
    cd.m.textContent = pad(min);
    cd.s.textContent = pad(sec);
  }
  tick();
  setInterval(tick, 1000);

  /* ============================================================
     HOTSPOTS → MODAL
     ============================================================ */
  const content = {
    historie: {
      kicker: "Plakatene på veggen",
      title: "Historien",
      html: `
        <p>Mannhullet er kjelleren under marinteknikk — og har vært marinernes tilholdssted i generasjoner. Her henger 110 år med historie på veggene.</p>
        <ul class="tl">
          <li><span class="yr">1915</span> Marinteknikk stiftes. De første marinerne finner veien ned.</li>
          <li><span class="yr">1948</span> Kjelleren blir fast tilholdssted. Den orange M-en tennes.</li>
          <li><span class="yr">1976</span> Tradisjonene formaliseres — sanger, seremonier, samhold.</li>
          <li><span class="yr">1999</span> Nytt bygg over bakken, samme trapp ned.</li>
          <li><span class="yr">2025</span> Fortsatt samme reise. Fortsatt samme kjeller.</li>
        </ul>`,
    },
    billetter: {
      kicker: "Baren",
      title: "Billetter",
      html: `
        <p>Jubileumsfesten — <strong>110 år under bakken</strong>. Lørdag 24. oktober 2026, dørene åpner 19:00.</p>
        <p>Mannhullet, kjelleren under Marinteknisk senter. Antrekk: pent, men det ender uansett i kjelleren.</p>
        <p><a class="btn" href="#" onclick="return false">Sikre plass</a></p>
        <p style="font-size:13px;opacity:.7">Begrenset antall. Marinere og gjester.</p>`,
    },
    spilleliste: {
      kicker: "Anlegget",
      title: "Spillelista",
      html: `
        <p>Lyden av kjelleren gjennom 110 år. Fra allsang til det som spilles klokka to.</p>
        <p><a class="btn" href="https://open.spotify.com" target="_blank" rel="noopener">Åpne i Spotify</a></p>
        <p><a class="btn ghost" href="#" onclick="return false">Jubileums­spillelista</a></p>`,
    },
    program: {
      kicker: "Tavla",
      title: "Program",
      html: `
        <ul class="prog">
          <li><span class="t">19:00</span><span>Dørene åpner. Velkomstdram ved foten av trappa.</span></li>
          <li><span class="t">20:00</span><span>Tale for de 110 årene.</span></li>
          <li><span class="t">21:00</span><span>Allsang. Du kan sangene, eller lærer dem i kveld.</span></li>
          <li><span class="t">22:30</span><span>Anlegget skrus opp.</span></li>
          <li><span class="t">02:00</span><span>Ingen finner veien hjem. Alle fant veien ned.</span></li>
        </ul>`,
    },
    galleri: {
      kicker: "Bildene",
      title: "Galleri",
      html: `
        <p>Ekte bilder fra kjelleren. Blitz, korn, mørke kroker — akkurat sånn det ser ut.</p>
        <div class="gal">
          <div class="cell" style="background-image:url('static/kjelleren.jpg')"></div>
          <div class="cell" style="background-image:url('static/trappa.jpg')"></div>
          <div class="cell ph">1948</div>
          <div class="cell ph">1976</div>
          <div class="cell ph">1999</div>
          <div class="cell ph">I KVELD?</div>
        </div>`,
    },
    effekter: {
      kicker: "Jakka",
      title: "Effekter",
      html: `
        <div class="merch">
          <div class="item"><div class="nm">Jubileumsgenser</div><div class="pr">399,-</div></div>
          <div class="item"><div class="nm">M-emblem, emalje</div><div class="pr">89,-</div></div>
          <div class="item"><div class="nm">110-års plakat</div><div class="pr">149,-</div></div>
          <div class="item"><div class="nm">Kjeller-krus</div><div class="pr">129,-</div></div>
        </div>
        <p style="margin-top:20px"><a class="btn" href="#" onclick="return false">Til butikken</a></p>`,
    },
    kontakt: {
      kicker: "Døra",
      title: "Kontakt",
      html: `
        <p>Veien ut er også veien inn. Ta kontakt.</p>
        <div class="contact-row"><span>E-post</span><a href="mailto:mannhullet@marin.no">mannhullet@marin.no</a></div>
        <div class="contact-row"><span>Instagram</span><a href="#" onclick="return false">@mannhullet</a></div>
        <div class="contact-row"><span>Sted</span><span>Marinteknisk senter, kjelleren</span></div>`,
    },
  };

  const modalRoot = $("#modalRoot");
  const modalScrim = $("#modalScrim");
  const modalClose = $("#modalClose");
  const mKicker = $("#modalKicker");
  const mTitle = $("#modalTitle");
  const mBody = $("#modalBody");
  let lastFocus = null;

  function openModal(key) {
    const c = content[key];
    if (!c) return;
    lastFocus = document.activeElement;
    mKicker.textContent = c.kicker;
    mTitle.textContent = c.title;
    mBody.innerHTML = c.html;
    modalRoot.classList.add("open");
    modalRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    modalClose.focus();
  }
  function closeModal() {
    modalRoot.classList.remove("open");
    modalRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll(".hot").forEach((h) =>
    h.addEventListener("click", () => openModal(h.dataset.key))
  );
  modalScrim.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalRoot.classList.contains("open")) closeModal();
  });

  /* ============================================================
     OPTIONAL AMBIENCE (WebAudio) — off by default.
     A low room tone that warms and swells as you descend.
     No external files; generated live.
     ============================================================ */
  const soundBtn = $("#soundToggle");
  let audio = null;

  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();

    // two detuned oscillators = a soft pad
    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    const mk = (freq, type) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0.5;
      o.connect(g); g.connect(master); o.start();
      return o;
    };
    const oscA = mk(55, "sine");
    const oscB = mk(55.6, "sine");
    const oscC = mk(110, "triangle");

    // gentle filtered noise = crowd/room air
    const bufSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf; noise.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass"; nf.frequency.value = 340;
    const ng = ctx.createGain(); ng.gain.value = 0.25;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();

    return { ctx, master, oscC, nf };
  }

  function updateAudioDepth() {
    if (!audio) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;
    // deeper = louder + warmer + more room air
    audio.master.gain.setTargetAtTime(lerp(0.05, 0.16, p), audio.ctx.currentTime, 0.4);
    audio.nf.frequency.setTargetAtTime(lerp(220, 900, p), audio.ctx.currentTime, 0.4);
    audio.oscC.frequency.setTargetAtTime(lerp(110, 146.8, p), audio.ctx.currentTime, 0.6);
  }
  window.addEventListener("scroll", updateAudioDepth, { passive: true });

  soundBtn.addEventListener("click", () => {
    const on = soundBtn.getAttribute("aria-pressed") === "true";
    if (!on) {
      if (!audio) audio = buildAudio();
      if (!audio) return;
      audio.ctx.resume();
      soundBtn.setAttribute("aria-pressed", "true");
      soundBtn.setAttribute("aria-label", "Skru av lyd");
      audio.master.gain.setTargetAtTime(0.08, audio.ctx.currentTime, 0.6);
      updateAudioDepth();
    } else {
      soundBtn.setAttribute("aria-pressed", "false");
      soundBtn.setAttribute("aria-label", "Skru på lyd");
      if (audio) audio.master.gain.setTargetAtTime(0.0, audio.ctx.currentTime, 0.4);
    }
  });
})();
