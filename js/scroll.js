/* Wasabi · scroll scenes (GSAP 3.13.0, hosted in vendor/, design-dna _gsap-core.md).
   Two quiet scenes, no pin (the meeting: "no complex scrolling"):
   - process: G20 without the pin. The rule under the numbers fills in lime with the scroll, and each step lights up
     when the fill reaches it. On a phone each step fills on its own as it passes.
   - about: G48. The paragraph is painted word by word as it is read. Opacity, not colour, so the a11y high-contrast
     switch still owns the colour.
   Without GSAP (blocked, or missing) everything stays as the plain page. */
(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  addEventListener("load", function () { ScrollTrigger.refresh(); });

  var tls = [];
  var still = document.documentElement.classList.contains("a11y-still");
  var steps = gsap.utils.toArray(".step");

  /* about: wrap every word (the Formiga words stay whole) so the scroll can paint them in order */
  var para = document.querySelector(".about .text"), words = [];
  if (para) {
    [].slice.call(para.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement("span"); w.className = "w"; w.textContent = part; frag.appendChild(w); words.push(w);
        });
        para.replaceChild(frag, n);
      } else if (n.nodeType === 1) { n.classList.add("w"); words.push(n); }
    });
  }

  /* spice: split the word into letters (English, so letters are safe), with the word kept whole for screen readers */
  var giant = document.querySelector(".breath .giant"), outer = [], inner = [];
  if (giant) {
    var word = giant.textContent;
    giant.textContent = "";
    var sr = document.createElement("span"); sr.className = "sr"; sr.textContent = word; giant.appendChild(sr);
    word.split("").forEach(function (c) {
      var o = document.createElement("span"), i = document.createElement("span");
      o.className = "ch"; i.className = "ci"; o.setAttribute("aria-hidden", "true"); i.textContent = c;
      o.appendChild(i); giant.appendChild(o); outer.push(o); inner.push(i);
    });
  }

  var mm = gsap.matchMedia();
  mm.add({
    wide: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    narrow: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)"
  }, function (ctx) {
    tls = [];
    var cleanup;
    /* process: the four steps come in together as the row arrives, then the rule under the numbers fills (Klil 4.10:
       step by step broke the scroll). A short entrance, not a scrub */
    if (steps.length) {
      var tp = gsap.timeline({ scrollTrigger: { trigger: ".steps", start: "top 82%", toggleActions: "play none none none" } });
      tp.fromTo(steps, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .7, stagger: .08, ease: "power3.out" })
        .fromTo(steps, { "--p": 0 }, { "--p": 1, duration: .6, stagger: .08, ease: "power2.out" }, .3);
      tls.push(tp);
    }
    /* about: stagger is a share of the scroll distance here, not milliseconds (moves.md G4).
       The Formiga words (kick, spicy, heat) turn the brand red as the paint reaches them, with a hop (--kick in site.css) */
    if (words.length) {
      var ta = gsap.timeline({ scrollTrigger: { trigger: para, start: "top 82%", end: "bottom 58%", scrub: .5 } });
      var STEP = .35;
      ta.fromTo(words, { opacity: .28 }, { opacity: 1, duration: .5, stagger: STEP, ease: "none" }, 0);
      words.forEach(function (w, i) {
        if (!w.classList.contains("spice")) return;
        ta.fromTo(w, { color: "rgb(225, 225, 225)" }, { color: "rgb(255, 43, 43)", duration: .3, ease: "none" }, i * STEP + .15)
          .fromTo(w, { "--kick": 0 }, { "--kick": 1, duration: .9, ease: "none" }, i * STEP + .1);
      });
      tls.push(ta);
    }

    /* spice: the letters are tossed in like spice into a pan and land in place with the scroll (scrub, reversible).
       Once it is in, the word keeps sizzling, and the cursor makes the letters jump */
    if (outer.length) {
      var rnd = gsap.utils.random;
      var tg = gsap.timeline({ scrollTrigger: { trigger: ".breath", start: "top 85%", end: "center 52%", scrub: .8 } });
      tg.fromTo(outer, {
        xPercent: function () { return rnd(-140, 140); }, yPercent: function () { return rnd(-220, 160); },
        rotation: function () { return rnd(-90, 90); }, scale: function () { return rnd(.25, .6); }, opacity: 0
      }, { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 1, ease: "none", stagger: { each: .12, from: "random" } });
      tls.push(tg);
      var sizzle = gsap.timeline({ paused: true, repeat: -1 });
      inner.forEach(function (c, i) {
        sizzle.to(c, { rotation: rnd(-4, 4), skewX: rnd(-5, 5), duration: rnd(.18, .3), ease: "sine.inOut", yoyo: true, repeat: 1 }, i * .09);
      });
      sizzle.to({}, { duration: .6 });
      ScrollTrigger.create({ trigger: ".breath", start: "top 70%", end: "bottom top",
        onToggle: function (st) { if (st.isActive && !still) sizzle.play(); else sizzle.pause(); } });
      if (ctx.conditions.wide) {
        var burst = function () {
          if (still) return;
          gsap.to(inner, { keyframes: [{ y: "-0.22em", duration: .18, ease: "power2.out" }, { y: 0, duration: .5, ease: "bounce.out" }], stagger: .05, overwrite: "auto" });
        };
        giant.addEventListener("mouseenter", burst);
        cleanup = function () { giant.removeEventListener("mouseenter", burst); sizzle.kill(); };
      } else cleanup = function () { sizzle.kill(); };
    }
    if (still) freeze(true);
    return cleanup;
  });

  /* "stop animations" in the a11y toolbar: every scene jumps to its end state and stops following the scroll */
  function freeze(on) {
    tls.forEach(function (t) {
      if (on) { t.scrollTrigger.disable(false); t.progress(1); }
      else { t.scrollTrigger.enable(); t.scrollTrigger.refresh(); }
    });
  }
  document.addEventListener("a11y:still", function (e) { still = !!e.detail; freeze(still); });
})();
