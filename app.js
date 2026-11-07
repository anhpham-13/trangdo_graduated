(() => {
'use strict';
/* ====== CẤU HÌNH ======
   FORM_ENDPOINT: dán link Formspree / Google Apps Script / Netlify Forms... vào đây để lời chúc & xác nhận
   gửi thẳng về Trang. Để trống thì lời nhắn sẽ được chia sẻ/sao chép để gửi qua tin nhắn. */
const CONFIG = {
  FORM_ENDPOINT: '',
  // Chủ thiệp cài app ntfy (iOS/Android), subscribe đúng tên topic này để nhận thông báo ngay khi có lời chúc.
  NTFY_TOPIC: 'trang-tn-y817dh3uhrhw8xkk52omvt',
  ZALO_PHONE: '0373637300', // số Zalo của Trang, ví dụ '0901234567'
  EVENT: new Date('2026-11-14T15:00:00+07:00'),
  PHOTOS: [
    { src: 'assets/p3.jpg', ar: 3913/5870, alt: 'Áo cử nhân' },
    { src: 'assets/p2.jpg', ar: 6000/4000, alt: 'Bên chiếc xe cổ', land: 1 },
    { src: 'assets/p4.jpg', ar: 3937/5906, alt: 'Ban công' },
    { src: 'assets/p5.jpg', ar: 4000/6000, alt: 'Khoảnh khắc xoay váy' },
    { src: 'assets/p6.jpg', ar: 6000/4000, alt: 'Cầu thang cổ', land: 1 },
    { src: 'assets/p7.jpg', ar: 6000/4000, alt: 'Điệu nhảy trên cầu thang', land: 1 },
    { src: 'assets/main.jpg', ar: 1706/2560, alt: 'Chân dung' },
  ],
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

/* ====== PETAL ENGINE ====== */
const cv = $('#petals'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
const petals = [];
const COLORS = ['#c4455f', '#e58aa0', '#f4b7c4', '#9a2c47', '#fad3dc', '#ecc994'];
function size() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR;
}
addEventListener('resize', () => { size(); if (F.on) funnelGeom(); }); size();

/* --- sprite cánh hoa: đổ màu theo chiều dài, gân lá, viền sáng; mặt sau nhạt hơn; bản mờ cho cánh ở gần --- */
const SPR = new Map();
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const tone = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))));
function petalPath(g, s) {
  g.beginPath(); g.moveTo(0, -s);
  g.bezierCurveTo(s * .95, -s * .55, s * .75, s * .75, 0, s);
  g.bezierCurveTo(-s * .75, s * .75, -s * .95, -s * .55, 0, -s);
}
function sprite(color, back, blur) {
  const key = color + (back ? 'b' : 'f') + (blur ? 'x' : ''); let c = SPR.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  if (blur && 'filter' in g) g.filter = 'blur(2.4px)';
  g.translate(48, 48); const s = 32, base = rgb(color);
  const gr = g.createLinearGradient(0, s, 0, -s);
  gr.addColorStop(0, `rgb(${tone(base, back ? .2 : -.32)})`);
  gr.addColorStop(.55, `rgb(${tone(base, back ? .38 : 0)})`);
  gr.addColorStop(1, `rgb(${tone(base, back ? .5 : .34)})`);
  g.fillStyle = gr; petalPath(g, s); g.fill();
  if (!back) {
    g.globalAlpha = .3; g.strokeStyle = '#fff'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, s * .9); g.quadraticCurveTo(3, 0, 0, -s * .72); g.stroke();
    g.globalAlpha = .25; petalPath(g, s); g.stroke();
  } else { g.globalAlpha = .18; g.strokeStyle = '#fff'; g.lineWidth = 1; petalPath(g, s); g.stroke(); }
  SPR.set(key, c); return c;
}
function drawP(p, al, k = 1) {
  const c = Math.cos(p.f), ac = Math.abs(c), q = p.s * k / 32 * DPR;
  cx.save(); cx.translate(p.x * DPR, p.y * DPR); cx.rotate(p.r);
  cx.scale(ac + .04, .55 + Math.abs(Math.sin(p.f * .7)) * .45);
  cx.globalAlpha = Math.max(0, Math.min(1, al * (.7 + .3 * ac)));
  cx.drawImage(sprite(p.c, c < 0, p.blur), -48 * q, -48 * q, 96 * q, 96 * q);
  cx.restore();
}

let gust = 0;                     // luồng gió toàn cục (0..1), giảm dần
function mk(x, y) {
  const z = Math.random();
  return {
    x: x ?? Math.random() * innerWidth, y: y ?? -20 - Math.random() * innerHeight * .3,
    s: (6 + Math.random() * 10) * (z > .88 ? 1.5 : 1), z, blur: z > .88, vx: (Math.random() - .5) * .6, vy: .5 + Math.random() * 1.1,
    r: Math.random() * 6.28, vr: (Math.random() - .5) * .05,
    f: Math.random() * 6.28, vf: .02 + Math.random() * .035,
    sw: Math.random() * 6.28, c: COLORS[(Math.random() * COLORS.length) | 0],
    a: .55 + Math.random() * .4, ws: .5 + Math.random() * .7, life: 0,
  };
}
const MAX = reduce ? 10 : (innerWidth < 700 ? 22 : 38);
for (let i = 0; i < MAX; i++) { const p = mk(); p.y = Math.random() * innerHeight; petals.push(p); }

/* Lốc nhỏ khi mở chương: cánh hoa quay vòng quanh (x,y), xoắn ốc rộng dần rồi tan. */
function sweep(x, y, n = 40) {
  if (reduce) n = Math.min(n, 8);
  gust = Math.max(gust, .8);
  if (body.classList.contains('revealed')) { body.classList.add('fx'); clearTimeout(sweep.t); sweep.t = setTimeout(() => body.classList.remove('fx'), 8000); }
  for (let i = 0; i < n; i++) {
    const p = mk(), r0 = 70 + Math.random() * 90;
    p.s = 9 + Math.random() * 11; p.a = .85 + Math.random() * .25; p.wait = i * 2.2; p.vf = .07 + Math.random() * .06; p.blur = false;
    p.orb = { cx: x, cy: y, th: Math.random() * 6.283, r0, r1: r0 + 110 + Math.random() * 230, w: .075 + Math.random() * .05,
      lift: 50 + Math.random() * 200, dur: 170 + Math.random() * 100, t: 0 };
    petals.push(p);
  }
}

/* --- Cột lốc ở màn mở thiệp: xoay chậm khi chờ, mạnh dần + hút thêm cánh từ mép màn hình khi chạm, rồi bùng ra --- */
const F = { on: false, phase: 0, t0: 0, cx: 0, cy: 0, H: 260, R: 200, m: 1, shrink: 1, hf: 1 };
function funnelGeom() {
  const el = $('#funnelSpace'); if (!el) return;
  const r = el.getBoundingClientRect();
  F.cx = r.left + r.width / 2; F.cy = r.top + r.height / 2; F.H = Math.max(r.height * 1.1, 180); F.R = Math.min(innerWidth * .38, 250);
}
function addFunnelPetal(incoming) {
  const p = mk(); p.s = (9 + Math.random() * 11) * (p.z > .88 ? 1.4 : 1); p.a = .85 + Math.random() * .2; p.vf = .04 + Math.random() * .06; p.x = -999;
  p.fun = { th: Math.random() * 6.283, u: Math.random(), w: .02 + Math.random() * .025, rr: .55 + Math.random() * .45, ext: incoming ? 450 + Math.random() * 600 : 0 };
  petals.push(p);
}
function funnelInit() {
  funnelGeom(); F.on = true;
  const n = reduce ? 16 : (innerWidth < 700 ? 66 : 110);
  for (let i = 0; i < n; i++) addFunnelPetal(false);
}
function funnelRelease() {
  F.phase = 2; gust = 1;
  for (const p of petals) {
    if (!p.fun) continue; const f = p.fun, R = p._R || 100;
    const tx = -Math.sin(f.th), ty = Math.cos(f.th) * .3, sp = R * f.w * F.m * .26;
    p.free = { vx: tx * sp + Math.cos(f.th) * (4 + Math.random() * 9), vy: ty * sp + Math.sin(f.th) * 2.5 - 2 - Math.random() * 7, life: 0 };
    p.fun = null;
  }
}
function funnelOpen() {
  funnelGeom(); F.phase = 1; F.t0 = performance.now();
  const n = reduce ? 16 : (innerWidth < 700 ? 80 : 150);
  for (let i = 0; i < n; i++) addFunnelPetal(true);
}

let last = 0, nextBreeze = 9000;
function loop(t) {
  const dt = Math.min((t - last) / 16.67 || 1, 3); last = t;
  cx.clearRect(0, 0, W, H);
  gust *= Math.pow(.992, dt);
  if (body.classList.contains('revealed') && t > nextBreeze) { gust = Math.max(gust, .3); nextBreeze = t + 9000 + Math.random() * 7000; }
  if (F.phase === 1) {
    const e = Math.min((t - F.t0) / 1500, 1), s = e * e * (3 - 2 * e);
    F.m = 1 + 5 * s; F.shrink = 1 - .5 * s; F.hf = 1 + .35 * s;
    if (e >= 1) funnelRelease();
  }
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    if (p.fun) {
      const f = p.fun;
      f.th += f.w * F.m * dt; f.u += (.0007 + f.w * .018) * F.m * dt; if (f.u > 1) f.u -= 1;
      if (F.phase === 1) f.ext *= Math.pow(.972, dt);
      const R = F.R * F.shrink * f.rr * (.16 + .84 * Math.pow(f.u, 1.25)) + f.ext; p._R = R;
      const dep = Math.sin(f.th);
      p.x = F.cx + Math.cos(f.th) * R; p.y = F.cy + (.5 - f.u) * F.H * F.hf + dep * R * .28;
      p.r += (.03 + .02 * F.m) * dt; p.f += p.vf * (1 + .4 * F.m) * dt;
      const edge = Math.min(f.u / .1, 1) * Math.min((1 - f.u) / .14, 1);
      drawP(p, p.a * edge * (.78 + .22 * dep), (.72 + .36 * dep) * (.8 + .5 * p.z));
      continue;
    }
    if (p.free) {
      const q = p.free; q.life += dt; const d = Math.pow(.985, dt);
      q.vx *= d; q.vy = q.vy * d + .035 * dt; p.x += q.vx * dt; p.y += q.vy * dt; p.r += .08 * dt; p.f += .11 * dt;
      if (q.life > 230 || p.x < -200 || p.x > innerWidth + 200 || p.y < -200 || p.y > innerHeight + 200) { petals.splice(i, 1); continue; }
      drawP(p, p.a * (q.life < 110 ? 1 : 1 - (q.life - 110) / 120), .9 + .4 * p.z);
      continue;
    }
    if (p.orb) {
      const o = p.orb;
      if (p.wait > 0) { p.wait -= dt; continue; }
      o.t += dt; const u = o.t / o.dur;
      if (u >= 1) { petals.splice(i, 1); continue; }
      o.th += o.w * (1.25 - .65 * u) * dt;
      const r = o.r0 + (o.r1 - o.r0) * Math.pow(u, .9), dep = Math.sin(o.th);
      p.x = o.cx + Math.cos(o.th) * r;
      p.y = o.cy - o.lift * Math.pow(u, 1.15) + dep * r * .38;
      p.r += (.05 + .05 * (1 - u)) * dt; p.f += p.vf * dt;
      const fade = Math.min(o.t / 14, 1) * (u > .72 ? 1 - (u - .72) / .28 : 1);
      drawP(p, p.a * fade * (.75 + .25 * dep), .7 + .4 * dep);
      continue;
    }
    p.sw += .018 * dt;
    p.x += (p.vx + Math.sin(p.sw) * .7 + gust * 7 * p.ws) * dt; p.y += (p.vy - gust * 1.2 * p.ws) * dt;
    p.r += (p.vr + gust * .04) * dt; p.f += (p.vf + gust * .03) * dt;
    if (p.y > innerHeight + 30 || p.x < -60 || p.x > innerWidth + 60) Object.assign(p, mk(), { y: -30 });
    drawP(p, p.a, .85 + .4 * p.z);
  }
  cx.globalAlpha = 1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ====== MUSIC ====== */
const bgm = $('#bgm'), vinyl = $('#music');
let wantMusic = false;
function setMusic(on) {
  vinyl.classList.toggle('on', on); vinyl.setAttribute('aria-pressed', on);
  if (on) {
    bgm.volume = 0; bgm.play().then(() => {
      wantMusic = true;
      const t0 = performance.now();
      (function f(n) { const k = Math.max(0, Math.min((n - t0) / 3000, 1)); bgm.volume = k * .8; if (k < 1) requestAnimationFrame(f); })(t0);
    }).catch(() => { vinyl.classList.remove('on'); vinyl.setAttribute('aria-pressed', false); });
  } else { bgm.pause(); wantMusic = false; }
}
vinyl.addEventListener('click', () => setMusic(!vinyl.classList.contains('on')));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) bgm.pause(); else if (wantMusic) bgm.play().catch(() => {});
});

/* ====== INTRO → REVEAL ====== */
const intro = $('#intro');
let opened = false;
function openCard() {
  if (opened) return; opened = true;
  setMusic(true);
  // iOS gyroscope permission (needs user gesture)
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') initGyro(); }).catch(() => {});
  } else if ('ondeviceorientation' in window && !fine) initGyro();
  intro.classList.add('opening');
  funnelOpen();
  setTimeout(() => intro.classList.add('flash'), 1450);
  setTimeout(() => intro.classList.add('zoom'), 2300);
  setTimeout(() => { intro.classList.add('gone'); body.classList.remove('locked'); body.classList.add('revealed'); scrollTo(0, 0); }, 3300);
  setTimeout(() => intro.remove(), 5500);
}
const fsEl = $('#funnelSpace');
funnelInit();
$('#openBtn').addEventListener('click', openCard);
fsEl.addEventListener('click', openCard);
fsEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(); } });

/* ====== HERO: split title, tilt, parallax ====== */
$$('[data-split]').forEach((el, li) => {
  const txt = el.textContent; el.textContent = ''; let c = li * 8;
  [...txt].forEach(ch => {
    const s = document.createElement('span');
    if (ch === ' ') { s.innerHTML = '&nbsp;'; s.className = 'ch'; s.style.width = '.28em'; }
    else s.className = 'ch';
    if (ch !== ' ') s.textContent = ch;
    s.style.setProperty('--c', c++); s.setAttribute('aria-hidden', 'true'); el.appendChild(s);
  });
});
function attachTilt(el, max = 12, scope = el) {
  let raf = 0;
  const set = (rx, ry, mx, my) => { el.style.setProperty('--rx', rx + 'deg'); el.style.setProperty('--ry', ry + 'deg'); el.style.setProperty('--mx', mx + '%'); el.style.setProperty('--my', my + '%'); };
  const cl = v => Math.max(-1, Math.min(1, v));
  scope.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = scope.getBoundingClientRect();
      const nx = cl(((e.clientX - r.left) / r.width - .5) * 2), ny = cl(((e.clientY - r.top) / r.height - .5) * 2);
      set((-ny * max).toFixed(2), (nx * max).toFixed(2), (50 + nx * 50).toFixed(0), (50 + ny * 50).toFixed(0));
    });
  });
  scope.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); set(0, 0, 50, 30); });
}
const photo3d = $('#photo3d');
attachTilt(photo3d, 11, $('.hero'));
$$('.door').forEach(d => attachTilt(d, 9));
function initGyro() {
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    const g = Math.max(-25, Math.min(25, e.gamma)), b = Math.max(-25, Math.min(25, (e.beta || 45) - 45));
    photo3d.style.setProperty('--ry', (g * .5) + 'deg'); photo3d.style.setProperty('--rx', (-b * .4) + 'deg');
    photo3d.style.setProperty('--mx', (50 + g * 2) + '%'); photo3d.style.setProperty('--my', (30 + b * 2) + '%');
  }, { passive: true });
}
const heroBg = $('#heroBg');
let sy = 0, ticking = false;
addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    sy = scrollY;
    if (sy < innerHeight * 1.2) {
      heroBg.style.transform = `translateY(${sy * .25}px) scale(1.15)`;
      photo3d.style.setProperty('--py', (sy * .08) + 'px');
    }
    ticking = false;
  });
}, { passive: true });

/* ====== COUNTDOWN ====== */
const pad = n => String(n).padStart(2, '0');
function tick() {
  let d = Math.max(0, CONFIG.EVENT - Date.now()) / 1000;
  const v = [Math.floor(d / 86400), Math.floor(d % 86400 / 3600), Math.floor(d % 3600 / 60), Math.floor(d % 60)].map(pad);
  ['d', 'h', 'm', 's'].forEach((k, i) => {
    const a = $('#cd-' + k); if (a && a.textContent !== v[i]) a.textContent = v[i];
    $$('[data-cd] [data-' + k + ']').forEach(el => el.textContent = v[i]);
  });
}
tick(); setInterval(tick, 1000);

/* ====== SCROLL REVEAL ====== */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach(el => io.observe(el));

/* ====== MODAL ====== */
const modal = $('#modal'), sheetBody = $('#sheetBody');
let lastFocus = null, cleanup = null;
function openModal(key) {
  const tpl = $('#tpl-' + key); if (!tpl) return;
  lastFocus = document.activeElement;
  sheetBody.innerHTML = ''; sheetBody.appendChild(tpl.content.cloneNode(true));
  modal.classList.remove('closing'); modal.hidden = false; body.classList.add('locked');
  sheetBody.scrollTop = 0;
  $$('.rv', sheetBody).forEach((el, i) => { el.style.setProperty('--n', i); el.classList.add('rv-in'); });
  if (key === 'memories') cleanup = initFlow();
  if (key === 'date') initDate();
  if (key === 'wish' || key === 'rsvp') initForm($('form', sheetBody));
  tick();
  sweep(innerWidth / 2, innerHeight * .62, 14);
  setTimeout(() => $('.x', modal).focus({ preventScroll: true }), 50);
}
function closeModal() {
  if (modal.hidden) return;
  modal.classList.add('closing');
  setTimeout(() => { modal.hidden = true; modal.classList.remove('closing'); sheetBody.innerHTML = ''; body.classList.remove('locked'); cleanup && cleanup(); cleanup = null; lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); }, 380);
}
$$('[data-open]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.open)));
modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#lightbox').hidden) $('#lightbox').hidden = true; else closeModal(); } });

/* ----- date: ics ----- */
function initDate() {
  const title = 'Lễ tốt nghiệp của Thuỳ Trang', loc = 'HUTECH Thủ Đức Campus',
    desc = '15h00 - Thứ Bảy 14/11/2026. Đến chung vui và chụp ảnh kỷ niệm với Trang nha!';
  const g = $('[data-gcal]', sheetBody);
  if (g) g.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
    '&dates=20261114T080000Z/20261114T110000Z&details=' + encodeURIComponent(desc) + '&location=' + encodeURIComponent(loc) + '&ctz=Asia/Ho_Chi_Minh';
  $('[data-ics]', sheetBody).addEventListener('click', () => {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Thiep Tot Nghiep//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:graduation-thuytrang-20261114@thiep', 'DTSTAMP:20261107T000000Z', 'DTSTART:20261114T080000Z', 'DTEND:20261114T110000Z',
      'SUMMARY:' + title, 'LOCATION:' + loc, 'DESCRIPTION:' + desc,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Ngày mai là lễ tốt nghiệp của Trang!', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:2 tiếng nữa là đến giờ hẹn với Trang!', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'le-tot-nghiep-thuy-trang.ics'; document.body.appendChild(a); a.click(); a.remove();
  });
}

/* ----- coverflow ----- */
function initFlow() {
  const flow = $('#flow', sheetBody), track = $('.flow-track', flow), dots = $('.dots', sheetBody);
  const n = CONFIG.PHOTOS.length; let idx = 0, vw = 0;
  const items = CONFIG.PHOTOS.map((p, i) => {
    const f = document.createElement('figure'); f.className = 'fi' + (p.land ? ' land' : ''); f.style.setProperty('--ar', p.ar.toFixed(4));
    const im = new Image(); im.src = p.src; im.alt = p.alt; im.draggable = false; f.appendChild(im);
    track.appendChild(f);
    const d = document.createElement('i'); dots.appendChild(d);
    return f;
  });
  function layout(drag = 0) {
    vw = flow.clientWidth;
    const step = Math.min(vw * .30, 150);
    items.forEach((f, i) => {
      let d = i - idx; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      const dd = d + drag, a = Math.abs(dd), vis = a < 3.2;
      f.style.transform = `translate(-50%,-50%) translateX(${dd * step * (a > 1 ? 1 : 1.35) + Math.sign(dd) * Math.min(a, 1) * 40}px) translateZ(${-a * 150}px) rotateY(${Math.max(-60, Math.min(60, -dd * 42))}deg) scale(${1 - Math.min(a, 2) * .04})`;
      f.style.opacity = vis ? Math.max(0, 1 - a * .28) : 0; f.style.zIndex = 100 - Math.round(a * 10);
      f.style.filter = a < .5 ? 'none' : `brightness(${Math.max(.35, 1 - a * .3)})`; f.style.pointerEvents = vis ? 'auto' : 'none';
    });
    $$('i', dots).forEach((d, i) => d.classList.toggle('on', i === idx));
  }
  const go = k => { idx = (k + n) % n; layout(); };
  let sx = 0, dragging = false, moved = 0, tid;
  flow.addEventListener('pointerdown', e => { dragging = true; sx = e.clientX; moved = 0; flow.setPointerCapture(e.pointerId); flow.style.setProperty('cursor', 'grabbing'); items.forEach(f => f.style.transition = 'none'); });
  flow.addEventListener('pointermove', e => { if (!dragging) return; moved = e.clientX - sx; layout(-moved / 170); });
  const end = e => {
    if (!dragging) return; dragging = false; flow.style.cursor = '';
    items.forEach(f => f.style.transition = '');
    if (Math.abs(moved) > 40) go(idx + (moved < 0 ? 1 : -1));
    else {
      layout();
      if (Math.abs(moved) < 6) {
        const t = e.target.closest && document.elementFromPoint(e.clientX, e.clientY)?.closest('.fi');
        if (t) { const i = items.indexOf(t); if (i === idx) openLightbox(CONFIG.PHOTOS[i]); else go(i); }
      }
    }
  };
  flow.addEventListener('pointerup', end); flow.addEventListener('pointercancel', end);
  $('[data-prev]', sheetBody).onclick = () => go(idx - 1);
  $('[data-next]', sheetBody).onclick = () => go(idx + 1);
  flow.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); });
  const auto = () => { tid = setInterval(() => { if (!dragging) go(idx + 1); }, 3600); };
  if (!reduce) auto();
  flow.addEventListener('pointerdown', () => clearInterval(tid));
  addEventListener('resize', layout);
  layout();
  return () => { clearInterval(tid); removeEventListener('resize', layout); };
}
const lb = $('#lightbox');
function openLightbox(p) { $('img', lb).src = p.src; $('img', lb).alt = p.alt; lb.hidden = false; }
lb.addEventListener('click', () => lb.hidden = true);

/* ----- forms ----- */
function initForm(form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const kind = form.dataset.kind, fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim(), msg = (fd.get('msg') || '').toString().trim();
    let bad = false;
    $$('input[name=name],textarea[name=msg]', form).forEach(el => { const need = el.required && !el.value.trim(); el.classList.toggle('err', need); bad = bad || need; });
    if (bad) { $('.err', form).focus(); return; }
    const att = fd.get('att');
    const text = kind === 'wish'
      ? `💌 Lời chúc cho Thuỳ Trang từ ${name}:\n${msg}`
      : `🎓 Xác nhận tham dự lễ tốt nghiệp (15:00, 14/11/2026)\nTên: ${name}\nTrả lời: ${att}${msg ? '\nLời nhắn: ' + msg : ''}`;
    let result = '', auto = false;
    // 1) Đẩy thông báo thẳng vào điện thoại của Trang (ntfy.sh)
    if (CONFIG.NTFY_TOPIC) {
      try {
        const r = await fetch('https://ntfy.sh/', { method: 'POST', body: JSON.stringify({
          topic: CONFIG.NTFY_TOPIC, priority: 4, tags: [kind === 'wish' ? 'love_letter' : 'mortar_board'],
          title: kind === 'wish' ? `💌 Lời chúc từ ${name}` : `🎓 ${name}: ${att}`,
          message: kind === 'wish' ? msg : (msg || '(không có lời nhắn)') }) });
        if (!r.ok) throw 0; auto = true;
      } catch { }
    }
    // 2) Hoặc form endpoint (Formspree...) nếu có cấu hình
    if (!auto && CONFIG.FORM_ENDPOINT) {
      try {
        const r = await fetch(CONFIG.FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ kind, name, attendance: att || '', message: msg, text }) });
        if (!r.ok) throw 0; auto = true;
      } catch { }
    }
    if (auto) {
      result = kind === 'wish' ? 'Lời chúc của bạn đã được đóng dấu và gửi tới Trang. Cảm ơn bạn nhiều!' : 'Trang đã nhận được xác nhận của bạn. Hẹn gặp bạn nhé!';
    } else {
      // 3) Dự phòng: sao chép nội dung để dán vào Zalo
      let shared = false;
      if (!CONFIG.ZALO_PHONE && navigator.share && !fine) { try { await navigator.share({ text }); shared = true; } catch (err) { if (err && err.name === 'AbortError') return; } }
      if (!shared) { try { await navigator.clipboard.writeText(text); shared = 'copied'; } catch { } }
      result = shared === true ? 'Đã đóng dấu! Cảm ơn bạn nhiều nha.'
        : shared === 'copied' ? 'Đã đóng dấu và sao chép nội dung. Hãy dán gửi cho Trang qua Messenger/Zalo nhé!'
        : 'Bạn hãy chụp màn hình hoặc nhắn trực tiếp cho Trang nhé!';
    }
    const z = $('[data-zalo]', form);
    if (z && CONFIG.ZALO_PHONE) {
      z.href = 'https://zalo.me/' + CONFIG.ZALO_PHONE.replace(/\D/g, ''); z.hidden = false;
      if (auto) z.textContent = 'Nhắn thêm cho Trang qua Zalo ↗';
      else {
        z.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); };
        if (result.startsWith('Đã đóng dấu và sao chép')) result = 'Đã đóng dấu và sao chép nội dung! Bấm nút bên dưới, dán vào khung chat Zalo của Trang rồi gửi nhé.';
      }
    }
    form.classList.add('done'); const s = $('.sealed', form); s.hidden = false; $('[data-result]', s).textContent = result;
    sweep(innerWidth / 2, innerHeight / 2, 26, true); s.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $$('input,textarea', form).forEach(el => el.addEventListener('input', () => el.classList.remove('err')));
}
})();
