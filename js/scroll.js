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

  var mm = gsap.matchMedia();
  mm.add({
    wide: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    narrow: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)"
  }, function (ctx) {
    tls = [];
    /* process */
    if (steps.length) {
      if (ctx.conditions.wide) {
        // one rail across the row: step i lights up, then its rule fills toward step i + 1
        var tl = gsap.timeline({ scrollTrigger: { trigger: ".steps", start: "top 80%", end: "bottom 52%", scrub: .6 } });
        steps.forEach(function (s, i) {
          tl.fromTo(s.children, { opacity: .25, y: 14 }, { opacity: 1, y: 0, duration: .4, stagger: .06, ease: "none" }, i)
            .fromTo(s, { "--p": 0 }, { "--p": 1, duration: .9, ease: "none" }, i + .1);
        });
        tls.push(tl);
      } else {
        steps.forEach(function (s) {
          var t = gsap.timeline({ scrollTrigger: { trigger: s, start: "top 86%", end: "top 52%", scrub: .6 } });
          t.fromTo(s.children, { opacity: .25, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .08, ease: "none" }, 0)
           .fromTo(s, { "--p": 0 }, { "--p": 1, duration: 1, ease: "none" }, .1);
          tls.push(t);
        });
      }
    }
    /* about: stagger is a share of the scroll distance here, not milliseconds (moves.md G4) */
    if (words.length) {
      var ta = gsap.timeline({ scrollTrigger: { trigger: para, start: "top 82%", end: "bottom 58%", scrub: .5 } });
      ta.fromTo(words, { opacity: .28 }, { opacity: 1, duration: .5, stagger: .35, ease: "none" });
      tls.push(ta);
    }
    if (still) freeze(true);
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
