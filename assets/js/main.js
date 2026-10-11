// Shared behaviour for every page of the portfolio
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  $$(".year-now").forEach(el => (el.textContent = new Date().getFullYear()));

  // "Download CV" buttons only show once a cv.pdf file exists in the repository
  const cvBtns = $$("[data-cv]");
  if (cvBtns.length) {
    fetch(cvBtns[0].getAttribute("href"), { method: "HEAD" })
      .then(r => { if (!r.ok) throw 0; cvBtns.forEach(b => (b.hidden = false)); })
      .catch(() => {});
  }

  // Mobile menu
  const menuBtn = $(".menu-btn"), links = $(".nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open);
    });
    $$("a", links).forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }

  // Reveal on scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  $$(".reveal").forEach(el => io.observe(el));

  // Highlight the current section in the navigation (home page)
  const navLinks = $$('.nav-links a[href^="#"]');
  if (navLinks.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("section[id]").forEach(s => spy.observe(s));
  }

  // Typed roles in the hero
  const typed = $(".typed");
  if (typed) {
    const roles = JSON.parse(typed.dataset.roles);
    if (reduced) { typed.textContent = roles[0]; }
    else {
      let r = 0, i = 0, del = false;
      const tick = () => {
        const word = roles[r];
        i += del ? -1 : 1;
        typed.textContent = word.slice(0, i);
        let wait = del ? 35 : 70;
        if (!del && i === word.length) { del = true; wait = 1700; }
        else if (del && i === 0) { del = false; r = (r + 1) % roles.length; wait = 350; }
        setTimeout(tick, wait);
      };
      tick();
    }
  }

  // Count-up numbers
  const counters = $$("[data-count]");
  const co = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
      co.unobserve(el);
      if (reduced) { el.textContent = prefix + end + suffix; return; }
      const t0 = performance.now(), dur = 1200;
      const step = t => {
        const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = prefix + v + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => co.observe(el));

  // Project filters
  const filters = $$(".filter");
  filters.forEach(btn => btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.toggle("on", b === btn));
    const f = btn.dataset.filter;
    $$(".project").forEach(p => p.classList.toggle("hide", f !== "all" && !p.dataset.cat.split(" ").includes(f)));
  }));
})();
