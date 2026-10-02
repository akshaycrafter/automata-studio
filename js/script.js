/* ============================================================
   AUTOMATA — main.js
   Sections:
     [GSAP Setup & Easing]
     [Lenis Smooth Scroll]
     [Preloader]
     [Custom Cursor]
     [Magnetic Buttons]
     [Nav State & Mobile Menu]
     [Hero Animations]
     [Scroll Reveals & Clip Reveals]
     [Manifesto Scroll-Scrub]
     [Process Pinned Timeline]
     [Stats Counters]
     [Tier Feature Data]        <-- edit tier pricing/features HERE
     [Budget Slider Logic]
     [Dashboard Card Reveal]
     [CTA Handoff]
     [Reduced Motion & Cleanup]
   ============================================================ */

document.documentElement.classList.remove("no-js");

/* ============================================================
   [GSAP Setup & Easing]
   ============================================================ */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Signature premium easing curves
CustomEase.create("easeOutExpo", "0.16, 1, 0.3, 1");    // cinematic entrances
CustomEase.create("easeInOutQuart", "0.76, 0, 0.24, 1"); // wipes / pins
const EASE_OUT = "easeOutExpo";
const EASE_INOUT = "easeInOutQuart";

ScrollTrigger.config({ ignoreMobileResize: true });

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ============================================================
   [Lenis Smooth Scroll]
   — buttery weighted scroll, kept in perfect sync with
     ScrollTrigger via the shared gsap ticker. Skipped
     entirely under reduced motion.
   ============================================================ */
const lenis = reduceMotion ? null : new Lenis({
  duration: 1.15,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // weighted ease-out
  smoothWheel: true,
});

if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// One helper for every "scroll to" — Lenis when available, native otherwise
function smoothScrollTo(target, options) {
  options = options || {};
  if (lenis) {
    lenis.scrollTo(target, { duration: options.duration || 1.4, offset: options.offset || 0 });
  } else if (typeof target === "string") {
    const el = document.querySelector(target);
    if (el) el.scrollIntoView();
  } else {
    target.scrollIntoView({ block: "start" });
  }
}

// Smooth anchor navigation — nav links glide, never jump
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const id = anchor.getAttribute("href");
    if (!id || id === "#") { e.preventDefault(); return; } // placeholder links
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    smoothScrollTo(target, { offset: -60 });
  });
});

/* ============================================================
   [Preloader]
   — branded counter + letter reveal, then a two-panel wipe
     into the hero. Starts only after fonts settle.
   ============================================================ */
const preloader     = document.getElementById("preloader");
const preloaderLogo = document.getElementById("preloader-logo");
const counterEl     = document.getElementById("preloader-counter");
const barEl         = document.getElementById("preloader-bar");

function bootPreloader() {
  if (reduceMotion) {
    // Reduced motion: skip the whole sequence, hero shows instantly
    preloader.style.display = "none";
    document.body.classList.add("is-loaded");
    startHero();
    return;
  }

  const split = new SplitText(preloaderLogo, { type: "chars" });
  gsap.set(split.chars, { yPercent: 130 });

  const counter = { v: 0 };
  const tl = gsap.timeline({
    defaults: { ease: EASE_OUT },
    onComplete: () => {
      preloader.style.display = "none";
      document.body.classList.add("is-loaded");
      ScrollTrigger.refresh(); // re-measure now that the overlay is gone
      startHero();
    },
  });

  tl.to(split.chars, { yPercent: 0, duration: 0.8, stagger: 0.045 }, 0.15)
    .to(barEl, { scaleX: 1, duration: 1.5, ease: "power1.inOut" }, 0.3)
    .to(counter, {
      v: 100, duration: 1.5, ease: "power1.inOut",
      onUpdate: () => { counterEl.textContent = String(Math.round(counter.v)).padStart(3, "0"); },
    }, 0.3)
    .to(counterEl, { autoAlpha: 0, y: -12, duration: 0.3 }, "+=0.15")
    .to(".preloader__row .preloader__label", { autoAlpha: 0, duration: 0.3 }, "<")
    // the wipe — two panels peel away like a curtain
    .to(".preloader__panel--top",    { yPercent: -101, duration: 0.95, ease: EASE_INOUT }, "+=0.1")
    .to(".preloader__panel--bottom", { yPercent: 101,  duration: 0.95, ease: EASE_INOUT }, "<0.06");
}

// Wait for web fonts so the split measures cleanly (2s safety net)
const fontsReady = document.fonts && document.fonts.ready
  ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))])
  : Promise.resolve();
fontsReady.then(bootPreloader);



/* ============================================================
   [Magnetic Buttons]
   — element gently pulls toward the cursor, springs back on
     leave. rAF-optimised via gsap.quickTo.
   ============================================================ */
if (finePointer && !reduceMotion) {
  gsap.utils.toArray(".magnetic").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.45);
    });
    el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
  });
}

/* ============================================================
   [Nav State & Mobile Menu]
   ============================================================ */
const nav = document.getElementById("nav");
const burger = document.getElementById("nav-burger");
const menuOverlay = document.getElementById("menu-overlay");

ScrollTrigger.create({
  start: 40,
  onUpdate: (self) => nav.classList.toggle("is-scrolled", self.scroll() > 40),
});

// Top scroll progress bar
gsap.to("#scroll-progress", {
  scaleX: 1, ease: "none",
  scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
});

function closeMenu() {
  if (!menuOverlay.classList.contains("is-open")) return;
  menuOverlay.classList.remove("is-open");
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  menuOverlay.setAttribute("aria-hidden", "true");
  if (lenis) lenis.start();
}

burger.addEventListener("click", () => {
  const isOpen = menuOverlay.classList.toggle("is-open");
  burger.classList.toggle("is-open", isOpen);
  burger.setAttribute("aria-expanded", String(isOpen));
  menuOverlay.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) { if (lenis) lenis.stop(); } else { if (lenis) lenis.start(); }
});

/* ============================================================
   [Hero Animations]
   — split-char stagger reveal, layered scroll parallax,
     mouse parallax on bg layers, ambient floating orb.
   ============================================================ */
function startHero() {
  if (reduceMotion) return; // hero is fully visible by default in CSS

  const heroTitle = document.getElementById("hero-title");

  // --- headline: char-by-char rise, masked per char ---
  const split = new SplitText(heroTitle, { type: "chars" });
  // wrap every char in an overflow-hidden mask span for a clean "rise" reveal
  split.chars.forEach((c) => {
    const mask = document.createElement("span");
    mask.className = "cm";
    c.parentNode.insertBefore(mask, c);
    mask.appendChild(c);
  });
  gsap.set(split.chars, { yPercent: 130 });

  const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
  tl.fromTo(".hero__eyebrow", { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.1)
    .to(split.chars, { yPercent: 0, duration: 1.2, stagger: 0.035 }, 0.22)
    .fromTo(".hero__sub", { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, "-=0.55")
    .fromTo(".hero__cta", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, "-=0.6")
    .fromTo(".hero__meta", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 }, "-=0.55")
    .fromTo(".hero__watermark", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4 }, 0.4);

  // --- ambient: orb drifts forever, watermark breathes ---
  gsap.to("#hero-orb", {
    y: -70, x: 50, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1,
  });
  gsap.to("#hero-watermark", {
    y: -24, duration: 5, ease: "sine.inOut", yoyo: true, repeat: -1,
  });

  // --- scroll parallax: content lifts, background falls away ---
  gsap.to("#hero-inner", {
    yPercent: -12, autoAlpha: 0.25, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to("#hero-watermark", {
    yPercent: 18, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
  });

  // --- mouse parallax on bg layers (throttled by quickTo + rAF) ---
  if (finePointer) {
    const move = gsap.utils.toArray("[data-depth]").map((el) => {
      const depth = parseFloat(el.dataset.depth) || 0.2;
      return {
        x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
        depth,
      };
    });
    window.addEventListener("mousemove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      move.forEach((m) => { m.x(nx * 60 * m.depth); m.y(ny * 60 * m.depth); });
    }, { passive: true });
  }
}

/* ============================================================
   [Scroll Reveals & Clip Reveals]
   — [data-reveal] single elements, [data-reveal-group] with
     staggered [data-reveal-item] children, [data-clip] media.
     transform + opacity only.
   ============================================================ */
if (!reduceMotion) {
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.fromTo(el,
      { y: 44, autoAlpha: 0 },
      {
        y: 0, autoAlpha: 1, duration: 1.1, ease: EASE_OUT,
        scrollTrigger: { trigger: el, start: "top 88%" },
      }
    );
  });

  gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
    const items = group.querySelectorAll("[data-reveal-item]");
    gsap.fromTo(items,
      { y: 46, autoAlpha: 0, scale: 0.97 },
      {
        y: 0, autoAlpha: 1, scale: 1, duration: 1, ease: EASE_OUT, stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 82%" },
      }
    );
  });

  // clip-path wipe for service media blocks
  gsap.utils.toArray("[data-clip]").forEach((el) => {
    gsap.fromTo(el,
      { clipPath: "inset(100% 0% 0% 0%)", y: 40 },
      {
        clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.3, ease: EASE_INOUT,
        scrollTrigger: { trigger: el, start: "top 85%" },
      }
    );
  });
}

/* ============================================================
   [Manifesto Scroll-Scrub]
   — the signature scrubbed section: each line brightens as
     the reader scrolls through it. No one-shot trigger.
     Rebuilt on resize so line boundaries stay correct.
   ============================================================ */
const manifestoText = document.getElementById("manifesto-text");
let manifestoSplit = null;
let manifestoScrub = null;

function buildManifestoScrub() {
  if (reduceMotion) return;
  if (manifestoScrub) manifestoScrub.kill();
  manifestoSplit = new SplitText(manifestoText, { type: "lines" });
  manifestoScrub = gsap.fromTo(manifestoSplit.lines,
    { autoAlpha: 0.14 },
    {
      autoAlpha: 1, ease: "none", stagger: 0.06,
      scrollTrigger: {
        trigger: manifestoText, start: "top 78%", end: "bottom 45%", scrub: 0.6,
      },
    }
  );
}

buildManifestoScrub();
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (manifestoSplit) manifestoSplit.revert();
    buildManifestoScrub();
    ScrollTrigger.refresh();
  }, 300);
});

/* ============================================================
   [Process Pinned Timeline]
   — the section pins for ~3 viewport heights while four
     steps crossfade and the progress rail fills.
   ============================================================ */
if (!reduceMotion) {
  const steps = gsap.utils.toArray(".process__step");
  const indexEl = document.getElementById("process-index");
  const fillEl = document.getElementById("process-fill");

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#process",
      start: "top top",
      end: "+=300%",
      pin: ".process__pin",
      anticipatePin: 1,
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const idx = Math.min(steps.length - 1, Math.round(self.progress * (steps.length - 1)));
        indexEl.textContent = String(idx + 1).padStart(2, "0") + " / 0" + steps.length;
      },
    },
  });

  steps.forEach((step, i) => {
    if (i === 0) { gsap.set(step, { autoAlpha: 1, y: 0 }); return; }
    tl.fromTo(step, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE_OUT }, i * 1.1)
      .to(steps[i - 1], { autoAlpha: 0, y: -70, duration: 0.7, ease: "power2.in" }, i * 1.1 + 0.45);
  });
  tl.to(fillEl, { scaleX: 1, duration: steps.length * 1.1, ease: "none" }, 0);
} else {
  gsap.set("#process-fill", { scaleX: 1 });
}

/* ============================================================
   [Stats Counters]
   — count up once when scrolled into view.
   ============================================================ */
gsap.utils.toArray("[data-count]").forEach((el) => {
  const end = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const counter = { v: 0 };
  ScrollTrigger.create({
    trigger: el, start: "top 88%", once: true,
    onEnter: () => {
      gsap.to(counter, {
        v: end, duration: reduceMotion ? 0 : 2, ease: "power3.out",
        onUpdate: () => {
          el.textContent = (decimals > 0
            ? counter.v.toFixed(decimals)
            : Math.round(counter.v).toLocaleString("en-IN")) + suffix;
        },
      });
    },
  });
});

/* ============================================================
   [Tier Feature Data]
   — ═══════════════════════════════════════════════════════
   EDIT YOUR PRICING & FEATURES HERE. Nothing else in this
   file needs to change when tiers change.

   - range:    [minBudget, maxBudget] in ₹ (INR)
   - widgets:  how many dashboard cards unlock at this tier
              (cards are unlocked in DOM order)
   - features: rows shown in the configurator list
   ═══════════════════════════════════════════════════════
   ============================================================ */
const TIERS = [
  {
    id: "starter",
    name: "Starter",
    range: [15000, 30000],
    tagline: "Launch-ready single-page site with premium motion.",
    features: [
      "Single-page website (up to 5 sections)",
      "Premium typography & brand styling",
      "Scroll animations — GSAP + Lenis",
      "Mobile-first responsive build",
      "Basic SEO & meta setup",
      "1 revision round · 7-day delivery",
    ],
    widgets: 3,
  },
  {
    id: "growth",
    name: "Growth",
    range: [30000, 60000],
    tagline: "Multi-page site, CMS and your first automations.",
    features: [
      "Everything in Starter",
      "Up to 5 pages with shared design system",
      "Custom GSAP choreography (scroll-scrubbed)",
      "CMS / blog so you self-edit",
      "Analytics dashboard setup",
      "WhatsApp chatbot (rule-based)",
      "2 revision rounds · 14-day delivery",
    ],
    widgets: 5,
  },
  {
    id: "premium",
    name: "Premium",
    range: [60000, 150000],
    tagline: "The full machine — AI automations, CRM, live dashboard.",
    features: [
      "Everything in Growth",
      "AI automation workflows (GPT-powered)",
      "CRM integration & automated lead scoring",
      "Full client dashboard — live analytics",
      "WhatsApp bot + auto follow-up flows",
      "30-day post-launch support",
      "Priority delivery · dedicated line",
    ],
    widgets: 8,
  },
];

/* ============================================================
   [Budget Slider Logic]
   — slider → price (counted, never jumped) → tier detection
     → feature list swap + dashboard unlock, all in sync.
   ============================================================ */
const slider     = document.getElementById("budget-range");
const priceEl    = document.getElementById("price-value");
const tierTagEl  = document.getElementById("plans-tier-tag");
const taglineEl  = document.getElementById("plans-tagline");
const featuresEl = document.getElementById("features-list");
const ctaTierEl  = document.getElementById("cta-tier");
const markers    = document.querySelectorAll(".plans__marker");
const presets    = document.querySelectorAll(".preset");
const widgets    = document.querySelectorAll(".widget");
const dashCount  = document.getElementById("dash-widget-count");

const MIN = parseFloat(slider.min);
const MAX = parseFloat(slider.max);
const priceCounter = { v: parseFloat(slider.value) };
const state = { tierIndex: 0, price: parseFloat(slider.value) };
let featToken = 0; // guards against overlapping feature-swap timelines

const formatINR = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

function getTierIndex(price) {
  for (let i = 0; i < TIERS.length; i++) {
    if (price <= TIERS[i].range[1]) return i;
  }
  return TIERS.length - 1;
}

// Move tier markers to their budget positions + highlight active tier
function positionMarkers() {
  const pct = (v) => ((v - MIN) / (MAX - MIN)) * 100;
  markers.forEach((m) => {
    m.style.left = pct(parseFloat(m.dataset.marker)) + "%";
    m.classList.toggle("is-active", getTierIndex(parseFloat(m.dataset.marker)) === state.tierIndex);
  });
}

function setSliderFill() {
  slider.style.setProperty("--fill", ((state.price - MIN) / (MAX - MIN)) * 100 + "%");
}

// Animated price counter — count up/down, never a hard jump
function updatePrice() {
  gsap.to(priceCounter, {
    v: state.price,
    duration: reduceMotion ? 0 : 0.7,
    ease: "power2.out",
    onUpdate: () => { priceEl.textContent = formatINR(priceCounter.v); },
  });
}

// Rebuild the features list with a quick crossfade + stagger
function renderFeatures(tierIndex) {
  const token = ++featToken;
  const current = featuresEl.children;

  const finish = () => {
    if (token !== featToken) return; // a newer render already took over
    featuresEl.innerHTML = TIERS[tierIndex].features
      .map((f) => '<li class="feature"><i>✓</i><span>' + f + "</span></li>")
      .join("");
    if (reduceMotion) return;
    gsap.fromTo(featuresEl.children,
      { y: 14, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE_OUT, stagger: 0.05 }
    );
  };

  if (current.length === 0 || reduceMotion) { finish(); return; }

  gsap.to(current, {
    y: -10, autoAlpha: 0, duration: 0.22, stagger: 0.025, ease: "power2.in",
    onComplete: finish,
  });
}

// Update preset chips + tier tag + tagline + CTA label
function renderTierMeta() {
  const tier = TIERS[state.tierIndex];
  presets.forEach((p, i) => p.classList.toggle("is-active", i === state.tierIndex));
  tierTagEl.textContent = tier.name;
  taglineEl.textContent = tier.tagline;
  ctaTierEl.textContent = tier.name;
  positionMarkers();
}

/* ============================================================
   [Dashboard Card Reveal]
   — widgets carry data-tier (0/1/2). Below the current tier
     they sit in a dimmed "locked" state; crossing the
     threshold triggers a satisfying scale+glow unlock.
   ============================================================ */
let dashboardRevealed = false;

function revealDashboard() {
  if (dashboardRevealed) return;
  dashboardRevealed = true;

  gsap.fromTo(widgets,
    { y: 34, autoAlpha: 0, scale: 0.94 },
    {
      y: 0, autoAlpha: 1, scale: 1,
      duration: reduceMotion ? 0 : 0.85,
      ease: EASE_OUT, stagger: reduceMotion ? 0 : 0.09,
      scrollTrigger: { trigger: "#dashboard-grid", start: "top 80%" },
      onComplete: () => {
        // hand opacity back to CSS so the dimmed .is-locked style wins
        widgets.forEach((w) => {
          if (w.classList.contains("is-locked")) {
            gsap.set(w, { clearProps: "opacity,visibility" });
          }
        });
      },
    }
  );
}

function applyLockStates(tierIndex) {
  widgets.forEach((w) => {
    const needs = parseInt(w.dataset.tier, 10);
    const wasLocked = w.classList.contains("is-locked");
    const locked = needs > tierIndex;

    if (locked) {
      // lock instantly, no waiting
      w.classList.add("is-locked");
      gsap.set(w, { clearProps: "opacity,visibility" });
    } else if (wasLocked) {
      // upgrade moment — spring in + glow pulse
      w.classList.remove("is-locked");
      if (reduceMotion) return;
      gsap.fromTo(w,
        { scale: 0.9, autoAlpha: 0.2 },
        { scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(1.8)", clearProps: "scale" }
      );
      w.classList.add("is-unlocking");
      w.addEventListener("animationend", () => w.classList.remove("is-unlocking"), { once: true });
    }
  });
  dashCount.textContent = TIERS[tierIndex].widgets + " / " + widgets.length + " widgets unlocked";
}

/* ============================================================
   [CTA Handoff]
   — every plan change rebuilds the WhatsApp deep link with the
     current tier + price. "Get this plan" jumps to contact.
     DEMO: placeholder number only (not a real WhatsApp number).
   ============================================================ */
const WA_NUMBER = "910000000000"; // DEMO placeholder - intentionally not a real WhatsApp number

function buildWhatsAppUrl() {
  const tier = TIERS[state.tierIndex];
  const msg =
    "Hi AUTOMATA! I just used your budget configurator. " +
    "I'm interested in the *" + tier.name + "* plan at *" + formatINR(state.price) + "* (" + tier.tagline + "). Let's talk!";
  return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
}

function syncContactSelection() {
  const tier = TIERS[state.tierIndex];
  document.getElementById("sel-tier").textContent = tier.name;
  document.getElementById("sel-price").textContent = formatINR(state.price);
  document.getElementById("sel-tagline").textContent = tier.tagline;
  const url = buildWhatsAppUrl();
  document.getElementById("wa-cta").href = url;
  document.getElementById("wa-cta-2").href = url;
  document.getElementById("wa-footer").href = url;
}

/* ---------- wire the controls ---------- */

// Slider input → everything updates in one place
slider.addEventListener("input", () => {
  state.price = parseFloat(slider.value);
  const nextTier = getTierIndex(state.price);

  setSliderFill();
  updatePrice();

  if (nextTier !== state.tierIndex) {
    state.tierIndex = nextTier;
    renderFeatures(nextTier);
    applyLockStates(nextTier);
    renderTierMeta();
    syncContactSelection();
  }
});

// Preset chips → snap the slider to the tier's starting budget
presets.forEach((preset) => {
  preset.addEventListener("click", () => {
    const idx = parseInt(preset.dataset.tier, 10);
    state.price = TIERS[idx].range[0];
    slider.value = state.price;
    slider.dispatchEvent(new Event("input"));
    smoothScrollTo(slider, { offset: -90 });
  });
});

// "Get this plan" → carries tier + price into the contact step
document.getElementById("get-plan").addEventListener("click", () => {
  syncContactSelection();
  smoothScrollTo("#contact", { offset: -40 });
});

// "Adjust budget" → back up to the configurator
document.getElementById("adjust-budget").addEventListener("click", () => {
  smoothScrollTo("#plans", { offset: -40 });
});

/* ---------- initialise the configurator ---------- */
setSliderFill();
positionMarkers();
renderFeatures(0);
applyLockStates(0);
renderTierMeta();
syncContactSelection();

// First entrance of the dashboard — stagger the cards in
revealDashboard();