// Interactive distribution explorer: density + CDF driven by parameter sliders,
// with an optional Monte-Carlo simulation (inverse-transform sampling).
//
// Usage: Explorer(rootElement, {
//   cdf(x, p), quantile?(u, p), params: [{ key, label, min, max, step, value }],
//   color, color2, simulate?: { n }
// })
window.Explorer = function (root, cfg) {
  const NS = "http://www.w3.org/2000/svg";
  const W = 720, H = 380, M = { l: 52, r: 52, t: 18, b: 42 };
  const iw = W - M.l - M.r, ih = H - M.t - M.b;
  const p = {};
  cfg.params.forEach(q => (p[q.key] = q.value));

  // ---------- Controls ----------
  const controls = root.querySelector(".controls");
  cfg.params.forEach(q => {
    const d = document.createElement("div");
    d.className = "ctrl";
    d.innerHTML = `<label for="${root.id}-${q.key}">${q.label}<output>${q.value}</output></label>
      <input type="range" id="${root.id}-${q.key}" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.value}">`;
    const input = d.querySelector("input"), out = d.querySelector("output");
    input.addEventListener("input", () => { p[q.key] = +input.value; out.textContent = input.value; samples = null; draw(); });
    controls.appendChild(d);
  });
  const reset = document.createElement("button");
  reset.className = "btn btn-sm full";
  reset.type = "button";
  reset.textContent = "Reset parameters";
  reset.addEventListener("click", () => {
    cfg.params.forEach(q => {
      p[q.key] = q.value;
      const input = root.querySelector(`#${root.id}-${q.key}`);
      input.value = q.value;
      input.previousElementSibling.querySelector("output").textContent = q.value;
    });
    samples = null; draw();
  });
  let samples = null;
  if (cfg.simulate) {
    const sim = document.createElement("button");
    sim.className = "btn btn-primary btn-sm full";
    sim.type = "button";
    sim.textContent = `▶ Simulate ${cfg.simulate.n} draws`;
    sim.addEventListener("click", () => {
      samples = Array.from({ length: cfg.simulate.n }, () => quantile(Math.random()));
      draw();
    });
    controls.appendChild(sim);
  }
  controls.appendChild(reset);

  // ---------- SVG ----------
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Density and distribution function of the selected distribution");
  root.querySelector(".plot").prepend(svg);
  const readout = root.querySelector(".readout");
  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  // ---------- Maths ----------
  const F = x => {
    if (x <= 0) return 0;
    const v = cfg.cdf(x, p);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : (x > 1 ? 1 : 0);
  };
  function quantile(u) {
    if (cfg.quantile) {
      const v = cfg.quantile(u, p);
      if (Number.isFinite(v)) return v;
    }
    let lo = 0, hi = 1;
    while (F(hi) < u && hi < 1e7) hi *= 2;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; F(mid) < u ? (lo = mid) : (hi = mid); }
    return (lo + hi) / 2;
  }
  const niceStep = span => {
    const raw = span / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  };
  const fmt = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));

  function draw() {
    svg.innerHTML = "";
    const defs = el("defs", {});
    const g = el("linearGradient", { id: root.id + "-fill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0%", "stop-color": cfg.color, "stop-opacity": .45 }, g);
    el("stop", { offset: "100%", "stop-color": cfg.color, "stop-opacity": 0 }, g);

    // Range and curves
    const xmax = Math.max(quantile(0.995), 1e-6) * 1.05;
    // Start the axis where the mass starts, unless it is close to 0 anyway
    let xmin = quantile(0.001) * 0.95;
    if (!(xmin > 0.3 * xmax)) xmin = 0;
    const span = xmax - xmin;
    const N = 400, h = span / 4000;
    const xs = [], fs = [], Fs = [];
    for (let i = 0; i <= N; i++) {
      const x = xmin + (span * i) / N || span / 4000;
      const d = (F(x + h) - F(Math.max(x - h, 0))) / (x - h > 0 ? 2 * h : h + x);
      xs.push(x); fs.push(Number.isFinite(d) && d > 0 ? d : 0); Fs.push(F(x));
    }
    let ymax = Math.max(...fs);
    if (samples) {
      var bins = 30, bw = span / bins, counts = new Array(bins).fill(0);
      samples.forEach(s => { const b = Math.floor((s - xmin) / bw); if (b >= 0 && b < bins) counts[b]++; });
      var dens = counts.map(c => c / (samples.length * bw));
      ymax = Math.max(ymax, ...dens);
    }
    ymax = ymax * 1.12 || 1;
    const X = x => M.l + ((x - xmin) / span) * iw;
    const Y = y => M.t + ih - (y / ymax) * ih;
    const Y2 = y => M.t + ih - y * ih;

    // Grid and axes
    const xs_ = niceStep(span);
    for (let t = Math.ceil(xmin / xs_) * xs_; t <= xmax + 1e-9; t += xs_) {
      el("line", { x1: X(t), x2: X(t), y1: M.t, y2: M.t + ih, stroke: "rgba(255,255,255,.06)" });
      const tx = el("text", { x: X(t), y: H - 16, fill: "#6b7389", "font-size": 12, "text-anchor": "middle", "font-family": "JetBrains Mono, monospace" });
      tx.textContent = +t.toFixed(4);
    }
    const ys_ = niceStep(ymax);
    for (let t = 0; t <= ymax + 1e-9; t += ys_) {
      el("line", { x1: M.l, x2: M.l + iw, y1: Y(t), y2: Y(t), stroke: "rgba(255,255,255,.06)" });
      const ty = el("text", { x: M.l - 8, y: Y(t) + 4, fill: "#6b7389", "font-size": 12, "text-anchor": "end", "font-family": "JetBrains Mono, monospace" });
      ty.textContent = +t.toFixed(4);
    }
    [0, .5, 1].forEach(t => {
      const ty = el("text", { x: M.l + iw + 8, y: Y2(t) + 4, fill: "#6b7389", "font-size": 12, "font-family": "JetBrains Mono, monospace" });
      ty.textContent = t;
    });
    el("line", { x1: M.l, x2: M.l + iw, y1: M.t + ih, y2: M.t + ih, stroke: "rgba(255,255,255,.25)" });
    const lx = el("text", { x: M.l + iw / 2, y: H - 1, fill: "#a3acc0", "font-size": 12, "text-anchor": "middle" });
    lx.textContent = "x";

    // Histogram of simulated draws
    if (samples) {
      dens.forEach((d, i) => {
        el("rect", { x: X(xmin + i * bw) + 1, y: Y(d), width: Math.max(0, X(xmin + bw) - X(xmin) - 2), height: M.t + ih - Y(d), fill: cfg.color2, opacity: .35, rx: 2 });
      });
    }

    // Density area + line, CDF dashed
    let path = `M${X(xs[0])},${Y(fs[0])}`;
    for (let i = 1; i <= N; i++) path += `L${X(xs[i]).toFixed(1)},${Y(fs[i]).toFixed(1)}`;
    el("path", { d: `${path}L${X(xs[N])},${Y(0)}L${X(xs[0])},${Y(0)}Z`, fill: `url(#${root.id}-fill)` });
    el("path", { d: path, fill: "none", stroke: cfg.color, "stroke-width": 2.6, "stroke-linejoin": "round" });
    let cpath = `M${X(xs[0])},${Y2(Fs[0])}`;
    for (let i = 1; i <= N; i++) cpath += `L${X(xs[i]).toFixed(1)},${Y2(Fs[i]).toFixed(1)}`;
    el("path", { d: cpath, fill: "none", stroke: cfg.color2, "stroke-width": 2, "stroke-dasharray": "6 5", opacity: .9 });

    // Median and mode markers
    const med = quantile(0.5);
    let im = 0; fs.forEach((v, i) => { if (v > fs[im]) im = i; });
    const mode = xs[im];
    el("line", { x1: X(med), x2: X(med), y1: M.t, y2: M.t + ih, stroke: "#f59e0b", "stroke-width": 1.5, "stroke-dasharray": "3 4" });
    el("circle", { cx: X(mode), cy: Y(fs[im]), r: 5, fill: "#06070b", stroke: "#10b981", "stroke-width": 2.5 });

    // Mean = ∫ (1 - F) dx
    let mean = 0; const steps = 2000, dx = (xmax * 3) / steps;
    for (let i = 0; i < steps; i++) mean += (1 - F((i + .5) * dx)) * dx;

    readout.innerHTML =
      `<span class="kpi">median <b style="--kc:#f59e0b">${fmt(med)}</b></span>` +
      `<span class="kpi">mode <b style="--kc:#10b981">${fmt(mode)}</b></span>` +
      `<span class="kpi">mean <b style="--kc:${cfg.color}">${fmt(mean)}</b></span>` +
      `<span class="kpi">95th pct <b style="--kc:${cfg.color2}">${fmt(quantile(0.95))}</b></span>` +
      (samples ? `<span class="kpi">sample mean <b style="--kc:#ec4899">${fmt(samples.reduce((a, b) => a + b, 0) / samples.length)}</b></span>` : "");
  }
  draw();
};
