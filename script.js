/* ============================================================
   MANNHULLET · 110 ÅR — the descent engine
   A fixed cinematic "stage" whose scenes are driven entirely by
   scroll progress (0 → 1). Nothing scrolls visually; scrolling
   moves the camera down the building and into the cellar.
   ============================================================ */

(() => {
  "use strict";

  /* --- Configurable jubilee date (local time) --- */
  const ANNIVERSARY = new Date("2027-01-29T19:00:00");

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
  const scCellar = $("#scCellar");
  const descendVeil = $("#descendVeil");
  const descendText = $("#descendText");
  const depthFill = $("#depthFill");
  const depthLabel = $("#depthLabel");

  /* Total scroll length of the journey. Longer = slower, more cinematic. */
  const TRACK_VH = reduce ? 240 : 550;
  track.style.height = TRACK_VH + "vh";

  /* ---------- reveal the hero on load ---------- */
  window.addEventListener("load", () => {
    document.querySelectorAll(".reveal").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), 180 + i * 160);
    });
  });

  /* ============================================================
     SCROLL → CAMERA (a continuous vertical pan through a
     cross-section of the building — no zoom, no year markers)

     The two scenes are stacked like a filmstrip, each 100vh:
       0 = staircase landing   1 = cellar
     A single "camera" (0 → 100%) slides the strip upward, so we
     descend straight into the cellar.
     ============================================================ */

  let ticking = false;

  function render() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;

    // camera travels 0 → 100% across the descent, then holds on the cellar
    const camera = 100 * smooth(range(p, 0.05, 0.82));
    hero.style.transform     = `translateY(${(0   - camera).toFixed(2)}%)`;
    scCellar.style.transform = `translateY(${(100 - camera).toFixed(2)}%)`;

    hero.style.pointerEvents = camera > 45 ? "none" : "auto";
    scCellar.setAttribute("aria-hidden", camera < 75 ? "true" : "false");

    // gradual white→cellar-color fade through the transition; the intro
    // line rides on this gradient, then the cellar arrives clean beneath it
    const veilIn = range(camera, 10, 42);
    const veilOut = range(camera, 68, 96);
    const veilOpacity = veilIn * (1 - veilOut);
    descendVeil.style.opacity = veilOpacity.toFixed(3);
    descendText.style.opacity = veilOpacity.toFixed(3);
    descendText.style.transform = `translateY(${lerp(16, -10, veilIn)}px)`;

    /* ---- the cellar becomes the menu ---- */
    document.body.classList.toggle("menu-live", p >= 0.94);

    /* ---- theme states + grain ---- */
    document.body.classList.toggle("light-scene", camera < 48);   // white landing → dark topbar ink
    document.body.classList.toggle("descending", camera > 10 && camera < 75);
    document.body.classList.toggle("arrived", camera >= 75);

    /* ---- depth gauge ---- */
    depthFill.style.height = (p * 100).toFixed(1) + "%";
    depthLabel.textContent = camera < 20 ? "1. ETASJE" : "KJELLEREN";
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
          <div class="cell" style="background-image:url('static/Trapp2.jpg')"></div>
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
     HOUSE BEAT (WebAudio) — off by default.
     A steady four-on-the-floor beat that never changes tempo;
     only its volume and tonal "openness" respond to how far
     you've descended, like hearing the party get closer.
     No external audio files — kick, hat, clap and bass are all
     synthesized live.
     ============================================================ */
  const soundBtn = $("#soundToggle");
  const BPM = 124;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const BASS_ROOT = 55; // A1
  const BASS_PATTERN = [
    BASS_ROOT, 0, 0, BASS_ROOT,
    0, 0, BASS_ROOT * 1.5, 0,
    BASS_ROOT, 0, 0, BASS_ROOT,
    0, BASS_ROOT * 1.19, 0, 0,
  ];

  let audio = null;
  let playing = false;
  let step = 0;
  let nextNoteTime = 0;
  let schedulerId = null;

  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();

    // master bus: everything passes through a filter that "opens up" with depth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    filter.Q.value = 0.7;

    const master = ctx.createGain();
    master.gain.value = 0;
    filter.connect(master);
    master.connect(ctx.destination);

    // shared noise buffer for hats/claps
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // a soft sustained pad underneath the beat
    const padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    padGain.connect(filter);
    const mkPad = (freq) => {
      const o = ctx.createOscillator();
      o.type = "sine"; o.frequency.value = freq;
      o.connect(padGain); o.start();
    };
    mkPad(110); mkPad(110.6); mkPad(164.8);

    return { ctx, master, filter, noiseBuf };
  }

  function kick(time) {
    const { ctx, filter } = audio;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.09);
    g.gain.setValueAtTime(1, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    o.connect(g); g.connect(filter);
    o.start(time); o.stop(time + 0.34);
  }

  function hat(time, vel) {
    const { ctx, filter, noiseBuf } = audio;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    src.connect(hp); hp.connect(g); g.connect(filter);
    src.start(time); src.stop(time + 0.05);
  }

  function clap(time) {
    const { ctx, filter, noiseBuf } = audio;
    [0, 0.012, 0.024].forEach((d) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, time + d);
      g.gain.exponentialRampToValueAtTime(0.001, time + d + 0.13);
      src.connect(bp); bp.connect(g); g.connect(filter);
      src.start(time + d); src.stop(time + d + 0.14);
    });
  }

  function bass(time, freq) {
    const { ctx, filter } = audio;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.setValueAtTime(1200, time);
    f.frequency.exponentialRampToValueAtTime(120, time + 0.18);
    g.gain.setValueAtTime(0.42, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    o.connect(f); f.connect(g); g.connect(filter);
    o.start(time); o.stop(time + 0.22);
  }

  function scheduleStep(n, time) {
    if (n % 4 === 0) kick(time);                              // four-on-the-floor
    if (n % 2 === 1) hat(time, n % 4 === 3 ? 0.22 : 0.14);     // off-beat 8th hats
    if (n === 4 || n === 12) clap(time);                       // backbeat
    if (BASS_PATTERN[n]) bass(time, BASS_PATTERN[n]);
  }

  function scheduler() {
    const secondsPer16th = (60.0 / BPM) / 4;
    while (nextNoteTime < audio.ctx.currentTime + SCHEDULE_AHEAD) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += secondsPer16th;
      step = (step + 1) % 16;
    }
    schedulerId = setTimeout(scheduler, LOOKAHEAD_MS);
  }

  function updateAudioDepth() {
    if (!audio || !playing) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? clamp(window.scrollY / max) : 0;
    // deeper = louder + brighter — tempo stays constant, only the "openness" shifts
    audio.master.gain.setTargetAtTime(lerp(0.16, 0.34, p), audio.ctx.currentTime, 0.4);
    audio.filter.frequency.setTargetAtTime(lerp(450, 9000, p), audio.ctx.currentTime, 0.5);
  }
  window.addEventListener("scroll", updateAudioDepth, { passive: true });

  soundBtn.addEventListener("click", () => {
    const on = soundBtn.getAttribute("aria-pressed") === "true";
    if (!on) {
      if (!audio) audio = buildAudio();
      if (!audio) return;
      audio.ctx.resume();
      playing = true;
      step = 0;
      nextNoteTime = audio.ctx.currentTime + 0.05;
      scheduler();
      soundBtn.setAttribute("aria-pressed", "true");
      soundBtn.setAttribute("aria-label", "Skru av lyd");
      updateAudioDepth();
    } else {
      playing = false;
      clearTimeout(schedulerId);
      soundBtn.setAttribute("aria-pressed", "false");
      soundBtn.setAttribute("aria-label", "Skru på lyd");
      if (audio) audio.master.gain.setTargetAtTime(0.0, audio.ctx.currentTime, 0.25);
    }
  });
})();
