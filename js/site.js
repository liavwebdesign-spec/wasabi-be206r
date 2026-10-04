/* Wasabi Studio · site behaviour. No libraries: the site itself does not move, the work does (meeting 14:12). */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverable = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = false;   // the a11y toolbar's "stop animations"

  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // in view = fire. Measured directly, not only through IntersectionObserver: an observer does not update
  // while the tab is throttled, and an entrance that never fires leaves content invisible (h3, motion.md 2)
  function inView(el, f) {
    var ro;
    function chk() { var r = el.getBoundingClientRect(); if (r.top < innerHeight * .9 && r.bottom > 0) { off(); f(); } }
    function off() { removeEventListener("scroll", chk); removeEventListener("resize", chk); if (ro) ro.disconnect(); }
    addEventListener("scroll", chk, { passive: true }); addEventListener("resize", chk);
    if (window.ResizeObserver) { ro = new ResizeObserver(chk); ro.observe(document.body); }
    requestAnimationFrame(chk); setTimeout(chk, 300);
  }

  /* ---------- page opening: header, then the hero copy ---------- */
  if (doc.classList.contains("open-anim")) requestAnimationFrame(function () { doc.classList.add("is-open"); });

  /* ---------- header · hd9 headroom: gone on the way down, back on the first move up ---------- */
  var hd = document.querySelector(".hd");
  function headroom(el) {
    var tol = 6, last = 0, raf = 0;
    function upd() {
      raf = 0;
      var y = scrollY, d = y - last, top = el.offsetHeight + 24;
      el.classList.toggle("is-scrolled", y > 8);
      var hold = doc.classList.contains("menu-open") || !!el.querySelector(":focus-visible");
      if (y <= top || hold) { el.classList.remove("is-hidden"); last = y; return; }
      if (Math.abs(d) < tol) return;
      el.classList.toggle("is-hidden", d > 0);
      last = y;
    }
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    el.addEventListener("focusin", upd);
    last = scrollY; upd();
  }
  if (hd) headroom(hd);

  /* ---------- drawers: the mobile menu and the "Let's talk" panel ---------- */
  function drawer(root, opener) {
    var panel = root.querySelector(".dw-panel"), scrim = root.querySelector(".dw-scrim"), closeBtn = root.querySelector(".dw-close"), last = null;
    panel.inert = true;
    function set(open) {
      root.classList.toggle("open", open);
      panel.inert = !open;
      if (opener) opener.setAttribute("aria-expanded", String(open));
      // scroll lock on <html> with the scrollbar's space kept (headers.md): no jump
      doc.style.scrollbarGutter = open ? "stable" : "";
      doc.style.overflow = open ? "hidden" : "";
      doc.classList.toggle("menu-open", open);
      if (open) { last = document.activeElement; setTimeout(function () { if (!root.contains(document.activeElement)) (root.querySelector("input") || closeBtn).focus(); }, 200); }
      else { var to = (last && last !== document.body) ? last : opener; if (to) to.focus({ preventScroll: true }); }
    }
    if (opener) opener.addEventListener("click", function () { set(!root.classList.contains("open")); });
    closeBtn.addEventListener("click", function () { set(false); });
    scrim.addEventListener("click", function () { set(false); });
    root.querySelectorAll("a:not([data-talk])").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    addEventListener("keydown", function (e) {
      if (!root.classList.contains("open")) return;
      if (e.key === "Escape") { set(false); return; }
      if (e.key !== "Tab") return;
      var f = [].slice.call(panel.querySelectorAll("a,button,input,textarea")).filter(function (x) { return x.offsetParent !== null; });
      var i = f.indexOf(document.activeElement);
      var n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[n].focus();
    });
    return set;
  }
  var menuEl = document.getElementById("dw-menu"), talkEl = document.getElementById("dw-talk");
  var setMenu = menuEl ? drawer(menuEl, document.querySelector(".burger")) : null;
  var setTalk = talkEl ? drawer(talkEl, null) : null;
  // "Let's talk" opens the form at the top of the page (meeting 04:54: a form at the top and at the bottom).
  // Without JS it is a plain link to the form at the bottom.
  document.querySelectorAll("[data-talk]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (!setTalk) return;
      e.preventDefault();
      if (setMenu && menuEl.classList.contains("open")) setMenu(false);
      setTalk(true);
    });
  });

  /* ---------- hero · h3: the reel plays for everyone, with a visible pause (motion.md 2א) ---------- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var hv = hero.querySelector("video"), pp = hero.querySelector(".pp");
    inView(hero, function () {
      hv.src = hv.dataset.src; hv.muted = true; hv.setAttribute("autoplay", "");
      var p = hv.play(); if (p && p.then) p.then(on, function () {}); else on();
    });
    function on() { if (still) { hv.pause(); pp.setAttribute("aria-pressed", "true"); } hv.classList.add("on"); pp.hidden = false; }
    pp.addEventListener("click", function () {
      var stop = !hv.paused; if (stop) hv.pause(); else { var p = hv.play(); if (p && p.catch) p.catch(function () {}); }
      pp.setAttribute("aria-pressed", String(stop));
      pp.setAttribute("aria-label", stop ? "Play the background video" : "Pause the background video");
    });
  }

  /* ---------- reel modal · b60: the reel opens out of the hero, with sound ---------- */
  var rm = document.querySelector(".rm"), reelBtn = document.querySelector("[data-reel]");
  if (rm && reelBtn) {
    var frame = rm.querySelector(".rm-frame"), rv = frame.querySelector("video"), rclose = rm.querySelector(".rm-close"), E = "cubic-bezier(.2,.6,.2,1)";
    var box = function () { return hero.getBoundingClientRect(); };
    function openReel() {
      if (!rv.src) rv.src = rv.dataset.src;
      var a = box(); rm.classList.add("on"); var b = frame.getBoundingClientRect();
      if (!reduce) frame.animate([{ transform: "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + "," + (a.height / b.height) + ")" }, { transform: "none" }], { duration: 520, easing: E });
      // a frame later, so the backdrop fades in; the timeout covers a tab that is not painting frames
      var shown = function () { rm.classList.add("in"); }; requestAnimationFrame(shown); setTimeout(shown, 60);
      rv.muted = false; rv.play().catch(function () { rv.muted = true; rv.play().catch(function () {}); });
      rclose.focus();
      doc.style.overflow = "hidden"; doc.style.scrollbarGutter = "stable";
      document.addEventListener("keydown", onKey);
    }
    function shutReel() {
      rv.pause(); rm.classList.remove("in");
      var a = box(), b = frame.getBoundingClientRect();
      var anim = reduce ? null : frame.animate([{ transform: "none" }, { transform: "translate(" + (a.left - b.left) + "px," + (a.top - b.top) + "px) scale(" + (a.width / b.width) + "," + (a.height / b.height) + ")" }], { duration: 420, easing: E });
      // closes even if the animation never runs (a background tab freezes it)
      var done = false, fin = function () { if (done) return; done = true; rm.classList.remove("on"); doc.style.overflow = ""; doc.style.scrollbarGutter = ""; reelBtn.focus(); };
      if (anim) anim.finished.then(fin, fin); setTimeout(fin, 520);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") { shutReel(); return; }
      if (e.key === "Tab") { var f = [rv, rclose], i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
    }
    reelBtn.addEventListener("click", openReel); rclose.addEventListener("click", shutReel);
    rm.addEventListener("click", function (e) { if (e.target === rm) shutReel(); });
  }

  /* ---------- work tiles · b19: still like a frame, awake under the cursor. Touch · b22: awake while on screen ---------- */
  var tiles = [].slice.call(document.querySelectorAll(".tile"));
  function load(v) { if (!v.src) v.src = v.dataset.src; }
  function play(t) {
    if (reduce || still) return;
    var v = t.querySelector("video"); load(v);
    t.classList.add("playing"); var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  function stop(t, rewind) {
    var v = t.querySelector("video"); t.classList.remove("playing"); v.pause();
    if (rewind) try { v.currentTime = 0; } catch (e) {}
  }
  if (hoverable) {
    tiles.forEach(function (t) {
      t.addEventListener("mouseenter", function () { play(t); });
      t.addEventListener("mouseleave", function () { stop(t, true); });
      t.addEventListener("focus", function () { play(t); });
      t.addEventListener("blur", function () { stop(t, true); });
    });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.intersectionRatio >= .6) play(en.target); else stop(en.target, false); });
    }, { threshold: [0, .6] });
    tiles.forEach(function (t) { io.observe(t); });
  }

  /* ---------- "stop animations" from the a11y toolbar reaches the videos ---------- */
  document.addEventListener("a11y:still", function (e) {
    still = !!e.detail;
    if (still) {
      tiles.forEach(function (t) { stop(t, false); });
      if (hero) { var v = hero.querySelector("video"); v.pause(); var b = hero.querySelector(".pp"); b.setAttribute("aria-pressed", "true"); }
    }
  });

  /* ---------- clients band: clone the set until the rail is at least twice the screen (tokens marqueeMinRail) ---------- */
  var track = document.querySelector(".band-track");
  if (track) {
    var set = track.querySelector(".band-set");
    var one = set.innerHTML;
    while (set.scrollWidth < innerWidth * 1.05) set.insertAdjacentHTML("beforeend", one);
    var twin = set.cloneNode(true); twin.setAttribute("aria-hidden", "true"); track.appendChild(twin);
  }

  /* ---------- scroll-linked drift: brand pieces, the giant word, the work inside its frames. Transform only, no pin ---------- */
  var drifts = [].slice.call(document.querySelectorAll("[data-speed], img[data-par]"));
  if (!reduce && drifts.length) {
    var ticking = false;
    var drift = function () {
      ticking = false; if (still) return;
      var vh = innerHeight;
      drifts.forEach(function (el) {
        var box = (el.closest(".tile-media") || el.closest("section") || el).getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var p = (box.top + box.height / 2 - vh / 2) / vh;      // about -1 .. 1 while the block crosses the screen
        if (el.hasAttribute("data-par")) el.style.transform = "translateY(" + (p * -5).toFixed(2) + "%)";
        else el.style.translate = "0 " + (p * parseFloat(el.dataset.speed) * 240).toFixed(1) + "px";
      });
    };
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
    addEventListener("resize", drift); drift();
  }
  var mk = document.querySelector(".mk-big");
  if (mk) { if (reduce) mk.classList.add("on"); else inView(mk, function () { mk.classList.add("on"); }); }

  /* ---------- reveal: once, 16px, .5s (motion.md 2) ---------- */
  var rv2 = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); rio.unobserve(en.target); } });
    }, { threshold: .12 });
    rv2.forEach(function (el) { rio.observe(el); });
    // failsafe: anything still hidden after the tab wakes up is shown
    setTimeout(function () { rv2.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in"); }); }, 1500);
  } else rv2.forEach(function (el) { el.classList.add("is-in"); });

  /* ---------- forms: real validation, then the thank-you page. The sketch has no backend yet (pipeline stage 4) ---------- */
  var MSG = { name: "Please add your name.", email: "Please add an email we can reply to.", message: "A line or two about the project is enough.", consent: "Please agree to the privacy policy so we can reply." };
  document.querySelectorAll(".form").forEach(function (f) {
    var live = f.querySelector(".form-msg");
    function check(el) {
      var n = el.name, bad = false, err = document.getElementById(el.getAttribute("aria-describedby"));
      if (n === "consent") bad = !el.checked;
      else if (n === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      else bad = el.required && !el.value.trim();
      var field = el.closest(".field");
      if (field) { if (bad) field.setAttribute("data-err", ""); else field.removeAttribute("data-err"); }
      el.setAttribute("aria-invalid", String(bad));
      if (err) err.textContent = bad ? MSG[n] : "";
      return !bad;
    }
    f.querySelectorAll("[required]").forEach(function (el) { el.addEventListener("blur", function () { if (el.value || el.type === "checkbox") check(el); }); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var req = [].slice.call(f.querySelectorAll("[required]")), ok = req.map(check).every(Boolean);
      if (!ok) {
        live.classList.add("bad"); live.textContent = "A few fields need a look.";
        var first = req.filter(function (el) { return el.getAttribute("aria-invalid") === "true"; })[0];
        // a form in a closed panel is opened first, otherwise its fields cannot take the focus
        var dw = f.closest(".dw"); if (dw && !dw.classList.contains("open") && dw === talkEl && setTalk) setTalk(true);
        if (first) first.focus();
        return;
      }
      live.classList.remove("bad"); live.textContent = "Sending...";
      location.href = f.getAttribute("action");
    });
  });
})();
