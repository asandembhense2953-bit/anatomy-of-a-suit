/* The Anatomy of a Suit: scroll-driven image stage (GSAP + ScrollTrigger) */
gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/*  Chapters I-V: crossfading scenes with a slow push-in               */
/* ------------------------------------------------------------------ */
function initStory() {
  const scenes = gsap.utils.toArray('.scene');
  const imgs = gsap.utils.toArray('.scene img');

  // cinematic fade-up on load
  gsap.from('.scenes', { opacity: 0, duration: 2.4, ease: 'power2.out' });
  gsap.from('.scene:first-child img', { scale: 1.12, duration: 3.2, ease: 'power3.out' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 1.2 }
  });

  // dissolve from scene i to i+1 between the section centres
  for (let i = 0; i < scenes.length - 1; i++) {
    tl.to(scenes[i], { opacity: 0, duration: 0.4 }, i + 0.3);
    tl.to(scenes[i + 1], { opacity: 1, duration: 0.4 }, i + 0.3);
  }
  // slow push-in across the whole story
  tl.fromTo(imgs, { scale: 1 }, { scale: 1.1, duration: 4 }, 0);
}

/* ------------------------------------------------------------------ */
/*  Drifting dust motes over the story                                 */
/* ------------------------------------------------------------------ */
function initDust() {
  if (reduceMotion) return;
  const c = document.getElementById('dust');
  const ctx = c.getContext('2d');
  let w, h, dpr;
  const motes = [];
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
  };
  resize(); addEventListener('resize', resize);
  for (let i = 0; i < 70; i++) motes.push({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4,
    s: Math.random() * .00012 + .00004, a: Math.random() * .5 + .15, p: Math.random() * 6.28
  });
  let active = true;
  ScrollTrigger.create({ trigger: '#fit', start: 'top top', onEnter: () => { active = false; c.style.opacity = 0; }, onLeaveBack: () => { active = true; c.style.opacity = 1; } });
  let last = performance.now();
  (function loop(t) {
    requestAnimationFrame(loop);
    if (!active) return;
    const dt = t - last; last = t;
    ctx.clearRect(0, 0, w, h);
    motes.forEach(m => {
      m.y -= m.s * dt; m.x += Math.sin(t * .0003 + m.p) * .00006 * dt;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      ctx.beginPath();
      ctx.fillStyle = `rgba(226,214,170,${m.a})`;
      ctx.arc(m.x * w, m.y * h, m.r * dpr, 0, 6.283);
      ctx.fill();
    });
  })(last);
}

/* ------------------------------------------------------------------ */
/*  Chapter nav + smooth anchors                                       */
/* ------------------------------------------------------------------ */
function initNav() {
  const links = [...document.querySelectorAll('.chapters a')];
  ['hero', 'shirt', 'waistcoat', 'canvas', 'silhouette'].forEach((id, i) => {
    ScrollTrigger.create({
      trigger: '#' + id, start: 'top 55%', end: 'bottom 55%',
      onToggle: s => { if (s.isActive) links.forEach((l, k) => l.classList.toggle('active', k === i)); }
    });
  });
  const nav = document.querySelector('.chapters');
  ScrollTrigger.create({ trigger: '#fit', start: 'top 60%', onEnter: () => nav.classList.add('hide'), onLeaveBack: () => nav.classList.remove('hide') });
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
  }));
}

/* ------------------------------------------------------------------ */
/*  Text reveals                                                       */
/* ------------------------------------------------------------------ */
function initReveals() {
  gsap.from('#hero .copy > *', { y: 50, opacity: 0, duration: 1.4, ease: 'power3.out', stagger: 0.18, delay: 0.5 });
  document.querySelectorAll('.panel:not(.hero) .copy').forEach(copy => {
    gsap.from(copy.children, {
      y: 46, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: copy, start: 'top 78%', toggleActions: 'play none none reverse' }
    });
  });
  [['#fit .fit-copy', '#fit', 'top 45%'], ['.colour-head', '#colour', 'top 20%'], ['.details-head', '#details', 'top 20%'], ['.glass', '#cta', 'top 60%']].forEach(([sel, trig, start]) => {
    const el = document.querySelector(sel);
    gsap.from(el.children, {
      y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: trig, start, toggleActions: 'play none none reverse' }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  5. Made to Be Worn: push out from a close crop of the street       */
/* ------------------------------------------------------------------ */
function initFit() {
  gsap.fromTo('#fit .bg', { scale: 2.1 }, {
    scale: 1.3, ease: 'none',
    scrollTrigger: { trigger: '#fit', start: 'top top', end: 'bottom bottom', scrub: 1 }
  });
}

/* ------------------------------------------------------------------ */
/*  6. Language of Colour: same street, full frame, pinned             */
/* ------------------------------------------------------------------ */
function initColour() {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#colour', start: 'top top', end: '+=110%', pin: '#colour .pin', scrub: 1 }
  });
  tl.fromTo('#colour .bgwrap', { scale: 1 }, { scale: 1.1, duration: 1 }, 0);
  tl.from('.swatches li', { opacity: 0, y: 12, stagger: 0.12, duration: 0.2 }, 0.15);
}

/* ------------------------------------------------------------------ */
/*  7. The Last Quarter-Inch: slow macro pan                           */
/* ------------------------------------------------------------------ */
function initDetails() {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#details', start: 'top top', end: '+=120%', pin: '#details .pin', scrub: 1 }
  });
  tl.fromTo('#details .pan', { scale: 1.02, xPercent: 3 }, { scale: 1.2, xPercent: -6, duration: 1 }, 0);
  tl.from('#details .tag', { opacity: 0, x: -20, stagger: 0.25, duration: 0.2 }, 0.3);
}

initStory();
initDust();
initNav();
initReveals();
initFit();
initColour();
initDetails();
window.addEventListener('load', () => ScrollTrigger.refresh());

/* ================================================================== */
/*  MR SUITS SA: site behaviour                                        */
/* ================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = '27735726119';

  /* sticky header + mobile menu */
  const bar = $('#topbar'), nav = $('#topnav'), btn = $('.menu-btn');
  const onScroll = () => bar.classList.toggle('solid', scrollY > 80);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  const setMenu = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
  btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* scroll reveals for the new sections */
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%', once: true,
    onEnter: els => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .1, overwrite: true })
  });
  gsap.set('.reveal', { opacity: 0 });
  $$('.card').forEach((c, i) => c.dataset.i = i);
  ScrollTrigger.batch('.card, .wild figure', {
    start: 'top 92%', once: true,
    onEnter: els => gsap.fromTo(els, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .09 })
  });
  gsap.set('.card, .wild figure', { opacity: 0 });

  /* gallery filter */
  const cards = $$('.card');
  $$('.chip').forEach(chip => chip.addEventListener('click', () => {
    $$('.chip').forEach(c => c.classList.toggle('active', c === chip));
    const f = chip.dataset.filter;
    cards.forEach(c => c.classList.toggle('hide', f !== 'all' && c.dataset.cat !== f));
    const vis = cards.filter(c => !c.classList.contains('hide'));
    gsap.fromTo(vis, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .07, ease: 'power2.out', overwrite: true });
    ScrollTrigger.refresh();
  }));

  /* lightbox */
  const lb = $('#lightbox'); let cur = 0;
  const list = () => cards.filter(c => !c.classList.contains('hide'));
  function show(i) {
    const l = list(); cur = (i + l.length) % l.length; const c = l[cur], d = c.dataset;
    $('#lb-img').src = $('img', c).src; $('#lb-img').alt = d.name;
    $('#lb-fit').textContent = d.fit; $('#lb-name').textContent = d.name; $('#lb-fabric').textContent = d.fabric;
    $('#lb-was').textContent = d.was; $('#lb-price').textContent = d.price; $('#lb-wa').dataset.ask = 'Tell me about the ' + d.name;
  }
  const open = i => { show(i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  cards.forEach(c => $('.card-img', c).addEventListener('click', () => open(list().indexOf(c))));
  $('.lb-close').addEventListener('click', close);
  $('.lb-prev').addEventListener('click', () => show(cur - 1));
  $('.lb-next').addEventListener('click', () => show(cur + 1));
  $('#lb-book').addEventListener('click', e => { e.preventDefault(); close(); scrollTo({ top: $('#booking').getBoundingClientRect().top + scrollY, behavior: 'smooth' }); });
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1);
  });

  /* testimonials */
  const qs = $$('.quote'), dots = $('.q-dots'); let qi = 0, timer;
  qs.forEach(() => dots.appendChild(document.createElement('i')));
  const qshow = i => { qi = (i + qs.length) % qs.length; qs.forEach((q, k) => q.classList.toggle('active', k === qi)); $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === qi)); };
  const auto = () => { clearInterval(timer); timer = setInterval(() => qshow(qi + 1), 7000); };
  $('.q-prev').addEventListener('click', () => { qshow(qi - 1); auto(); });
  $('.q-next').addEventListener('click', () => { qshow(qi + 1); auto(); });
  qshow(0); auto();

  /* booking form -> WhatsApp (no backend needed) */
  const bf = $('#booking-form'), note = $('#booking-note');
  const check = f => { let ok = true; $$('[required]', f).forEach(el => { const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value)); el.classList.toggle('invalid', bad); if (bad) ok = false; }); return ok; };
  bf.addEventListener('submit', e => {
    e.preventDefault();
    if (!check(bf)) { note.textContent = 'Please complete the highlighted fields.'; return; }
    const d = Object.fromEntries(new FormData(bf));
    const msg = `Hi MR SUITS SA, I'd like to book a fitting.\nName: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nService: ${d.service}` + (d.message ? `\nMessage: ${d.message}` : '');
    const url = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
    note.innerHTML = `Thank you, ${d.name.split(' ')[0]}. WhatsApp is opening to send your request. If it doesn't, <a href="${url}" target="_blank" rel="noopener">tap here</a>.`;
    window.open(url, '_blank', 'noopener');
    bf.reset();
  });

  /* contact form -> email */
  const cf = $('#contact-form');
  cf.addEventListener('submit', e => {
    e.preventDefault();
    if (!check(cf)) return;
    const d = Object.fromEntries(new FormData(cf));
    location.href = `mailto:njabuloasande43@gmail.com?subject=${encodeURIComponent(d.subject || 'Website enquiry')}&body=${encodeURIComponent(`${d.message}\n\n${d.name}\n${d.email}`)}`;
    cf.reset();
  });
})();
