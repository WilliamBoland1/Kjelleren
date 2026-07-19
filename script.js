/* ============================================================
   MANNHULLET · 110 ÅR — the descent engine
   The building is stationary; scrolling is the elevator moving
   down through it. Depth (0 → 1) is written to a single CSS
   custom property once per frame — every visual continuity
   effect reads it declaratively via calc()/color-mix() in
   styles.css. Nothing here fakes the descent with transforms.
   ============================================================ */

(() => {
  "use strict";

  /* --- Configurable jubilee date (local time) --- */
  const ANNIVERSARY = new Date("2027-01-29T19:00:00");

  /* ---------- helpers ---------- */
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // smoothstep — eases gently at both ends, so change is slow at the very top
  // and very bottom (a natural hold) and fastest through the middle.
  const smooth = (t) => t * t * (3 - 2 * t);
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- countdown to the jubilee ---------- */
  const cd = {
    days: $("#days"),
    hours: $("#hours"),
    minutes: $("#minutes"),
    seconds: $("#seconds"),
  };

  function tickCountdown() {
    const diff = ANNIVERSARY - new Date();
    if (diff <= 0) {
      cd.days.textContent = cd.hours.textContent = cd.minutes.textContent = cd.seconds.textContent = "00";
      return;
    }
    const total = Math.floor(diff / 1000);
    cd.days.textContent = pad2(Math.floor(total / 86400));
    cd.hours.textContent = pad2(Math.floor((total % 86400) / 3600));
    cd.minutes.textContent = pad2(Math.floor((total % 3600) / 60));
    cd.seconds.textContent = pad2(total % 60);
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------- elements ---------- */
  const root = document.documentElement;
  const depthFill = $("#depthFill");

  /* audio state — declared here (ahead of the initial render() call below)
     so updateAudioDepth() can safely read them before the WebAudio section
     further down has run */
  let audio = null;
  let playing = false;

  /* --- Featured track (Step 2): no audio file yet — see the FEATURED
     TRACK section near the bottom for how the volume ramp works. Swap
     in a licensed file or embed by setting `src` below; everything else
     is already wired up. --- */
  const FEATURED_TRACK = {
    artist: "Kakkmaddafakka",
    title: "Forever Alone (Live)",
    src: "", // e.g. "static/audio/forever-alone-live.mp3" — or replace this feature with a licensed embed
  };
  const featuredAudio = $("#featuredAudio");
  if (FEATURED_TRACK.src) featuredAudio.src = FEATURED_TRACK.src;

  /* ============================================================
     SCROLL → DEPTH
     depth 0 = ground floor, depth 1 = fully arrived in the cellar.
     This single number drives every continuous effect in CSS.
     ============================================================ */

  function computeDepth() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const raw = max > 0 ? clamp(window.scrollY / max) : 0;
    return smooth(raw);
  }

  let ticking = false;

  function render() {
    ticking = false;
    const depth = computeDepth();

    root.style.setProperty("--depth", depth.toFixed(4));
    depthFill.style.height = (depth * 100).toFixed(1) + "%";

    // the cellar becomes the menu once you've fully arrived
    document.body.classList.toggle("menu-live", depth >= 0.93);
    // the top nav recedes in step with the cellar photo's own reveal
    // (same 0.74 threshold as .cellar-img's opacity curve, see styles.css)
    document.body.classList.toggle("nav-recede", depth >= 0.74);

    updateAudioDepth(depth);
    updateFeaturedTrackVolume(depth);
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
     Dots come from one config array — adding a fourth only means adding
     one entry here. Positions are percentages of .floor--cellar (the same
     box .cellar-img fills with background-size:cover), so they track the
     photo's objects at any viewport width instead of drifting on resize.
     ============================================================ */
  const HOTSPOTS = [
    { id: "neon", label: "Neonskiltet", left: 43, top: 38, modalId: "neon" },
    { id: "galleri", label: "Galleri", left: 65, top: 29, modalId: "galleri" },
    { id: "dansegulv", label: "Dansegulvet", left: 33, top: 72, modalId: "dansegulv" },
  ];

  /* Reserved zones no dot may enter: the nav bar (top), the depth scale
     (left edge), and the caption (bottom) — this is what caused an old dot
     to collide with the "GRUNNPLAN" label. Dev-only in spirit (it only ever
     logs), so it's harmless to leave running in production. */
  const RESERVED_ZONES = [
    { name: "nav bar (top 0–8%)", test: (l, t) => t <= 8 },
    { name: "depth scale (left 0–10%)", test: (l, t) => l <= 10 },
    { name: "caption (bottom 88–100%)", test: (l, t) => t >= 88 },
  ];
  function assertReservedZones(spots) {
    spots.forEach((s) => {
      RESERVED_ZONES.forEach((zone) => {
        if (zone.test(s.left, s.top)) {
          console.warn(`[hotspots] "${s.id}" (${s.left}%, ${s.top}%) falls inside the reserved ${zone.name} zone.`);
        }
      });
    });
  }
  assertReservedZones(HOTSPOTS);

  /* Seeds the gallery hotspot with the real cellar/venue photos already in
     static/ — add more paths here as real event photos come in, nothing
     else needs to change. (bilde (1-4).jpg are excluded: those are the
     kontakt.html contact-person portraits, not venue shots.) */
  const GALLERY_IMAGES = [
    "static/kjelleren.jpg",
    "static/Pers (1).jpg",
    "static/Pers (2).jpg",
    "static/Pers (3).jpg",
  ];

  const content = {
    neon: {
      kicker: "Skiltet",
      title: "Neonskiltet",
      html: `<p>Informasjon kommer.</p>`,
    },
    galleri: {
      kicker: "Veggen",
      title: "Galleri",
      html: `
        <p>Bidler fra tidligere Jubileer.</p>
        <div class="gal">${GALLERY_IMAGES.map((src) => `<div class="cell" style="background-image:url('${src}')"></div>`).join("")}</div>`,
    },
    dansegulv: {
      kicker: "Gulvet",
      title: "Dansegulvet",
      html: `<p>Spilleliste og artist kommer.</p>`,
    },
    /* The topics below aren't surfaced as hotspots right now (the photo
       carries three dots: neon, galleri, dansegulv — see HOTSPOTS above),
       but are kept here, fully wired, so any of them can come back as a new
       HOTSPOTS entry later with no other rework. faner (the flag-wall
       writeup that used to live on the galleri dot) joined this list when
       that dot became the gallery. */
    faner: {
      kicker: "Veggen",
      title: "Fanene",
      html: `
        <p>Hvert kull har satt sitt merke på veggen. Fanene henger tett, år på år, som et stille regnskap over alle som har funnet veien ned hit.</p>
        <p>Noen er brodert for hånd, andre malt i all hast en lørdag kveld — men de henger fortsatt, side om side.</p>`,
    },
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
        <div class="featured-track">
          <span class="featured-track-label">Fremhevet låt</span>
          <span class="featured-track-name">${FEATURED_TRACK.artist} — ${FEATURED_TRACK.title}</span>
          <span class="featured-track-status">${FEATURED_TRACK.src ? "Spilles nå" : "Lydklipp kommer"}</span>
        </div>
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
  const modalEl = $(".modal");
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

  modalScrim.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);

  // Escape closes; Tab/Shift+Tab trap focus inside the open modal instead of
  // letting keyboard focus escape to the (still-present) page behind it.
  window.addEventListener("keydown", (e) => {
    if (!modalRoot.classList.contains("open")) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      modalEl.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* ---- Render the dots (desktop overlay) + the <=768px stacked list from
     the same HOTSPOTS config, both wired to the same openModal/visited
     state. See .hotspot-list in styles.css for the mobile breakpoint. ---- */
  const hotspotsLayer = $("#hotspots");
  const hotspotList = $("#hotspotList");

  function renderHotspots() {
    HOTSPOTS.forEach((spot, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "hot" + (spot.left > 70 ? " hot--flip" : "");
      dot.style.setProperty("--x", spot.left + "%");
      dot.style.setProperty("--y", spot.top + "%");
      dot.style.setProperty("--delay", (i % 3) * 0.9 + "s");
      dot.dataset.key = spot.modalId;
      dot.setAttribute("aria-label", spot.label);
      dot.innerHTML = `<span class="hot-dot"></span><span class="hot-name">${spot.label}</span>`;

      const listItem = document.createElement("li");
      const listBtn = document.createElement("button");
      listBtn.type = "button";
      listBtn.textContent = spot.label;
      listBtn.setAttribute("aria-label", spot.label);
      listItem.appendChild(listBtn);

      const open = () => {
        openModal(spot.modalId);
        dot.classList.add("visited");
        listBtn.classList.add("visited");
      };
      dot.addEventListener("click", open);
      listBtn.addEventListener("click", open);

      hotspotsLayer.appendChild(dot);
      hotspotList.appendChild(listItem);
    });
  }
  renderHotspots();

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

  function updateAudioDepth(depth) {
    if (!audio || !playing) return;
    // deeper = louder + brighter — tempo stays constant, only the "openness" shifts
    audio.master.gain.setTargetAtTime(lerp(0.16, 0.34, depth), audio.ctx.currentTime, 0.4);
    audio.filter.frequency.setTargetAtTime(lerp(450, 9000, depth), audio.ctx.currentTime, 0.5);
  }

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
      updateAudioDepth(computeDepth());
    } else {
      playing = false;
      clearTimeout(schedulerId);
      soundBtn.setAttribute("aria-pressed", "false");
      soundBtn.setAttribute("aria-label", "Skru på lyd");
      if (audio) audio.master.gain.setTargetAtTime(0.0, audio.ctx.currentTime, 0.25);
    }
  });

  /* ============================================================
     FEATURED TRACK — volume ramp
     Silent at the top of the page; fades in on the exact same
     curve as the cellar photo's own reveal (see .cellar-img in
     styles.css), so the song arrives together with the room
     rather than on its own separate timeline. Stays completely
     inert until FEATURED_TRACK.src (declared above) is set.
     ============================================================ */
  function updateFeaturedTrackVolume(depth) {
    if (!FEATURED_TRACK.src) return;
    const arrival = clamp((depth - 0.74) * 3.85);
    featuredAudio.volume = arrival * 0.7;
    if (arrival > 0 && featuredAudio.paused) featuredAudio.play().catch(() => {});
    if (arrival === 0 && !featuredAudio.paused) featuredAudio.pause();
  }
})();
