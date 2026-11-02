/* MR SUITS SA: on-site assistant
 *
 * Works fully offline: it answers from the facts below and from the suit cards on the page
 * (so changing a suit's name or price in index.html updates the bot automatically).
 * It never invents facts. When it doesn't know, it hands off to phone/email.
 *
 * To connect a real AI later, host a small backend and set, before this script loads:
 *   <script>window.MRSUITS_CHAT_API = 'https://your-server.example/chat'</script>
 * It will POST {message, history:[{role,text}]} and should answer {reply:"..."}.
 * If that request fails, the built-in answers are used.
 */
(function () {
  /* ---- business facts (edit these when the real owner confirms details) ---- */
  const BIZ = {
    name: 'MR SUITS SA',
    phoneDisplay: '+27 73 572 6119',
    phoneTel: '+27735726119',
    email: 'njabuloasande43@gmail.com',
    hours: 'Monday to Saturday, 9AM to 6PM',
    founded: 2018,
    deal: 'Get 2 Suits for R2499 (limited time)',
    services: ['Get 2 Suits (R2499)', 'Custom Tailoring', 'Virtual Consultation', 'Bulk Order / Events']
  };
  const API = window.MRSUITS_CHAT_API || '';

  const $ = (s, r = document) => r.querySelector(s);
  const products = () => [...document.querySelectorAll('.card')].map(c => ({
    name: c.dataset.name, fabric: c.dataset.fabric, fit: c.dataset.fit,
    was: c.dataset.was, price: c.dataset.price, n: parseInt((c.dataset.price || '').replace(/\D/g, ''), 10) || 0
  }));

  /* ---- UI ---- */
  const root = document.createElement('div');
  root.className = 'sbot';
  root.innerHTML = `
    <button class="bot-launch" aria-label="Open chat assistant" aria-expanded="false">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.7A8 8 0 1 1 21 12Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" stroke-width="2.2"/></svg>
    </button>
    <div class="bot-tease" hidden>Questions about our suits? <b>Ask me.</b><button aria-label="Dismiss">&times;</button></div>
    <section class="bot-panel" role="dialog" aria-label="MR SUITS SA assistant" aria-hidden="true">
      <header>
        <div class="bot-av">M<span>S</span></div>
        <div><strong>MR SUITS SA</strong><small><i></i>Assistant &middot; replies instantly</small></div>
        <button class="bot-x" aria-label="Close chat">&times;</button>
      </header>
      <div class="bot-log" aria-live="polite"></div>
      <div class="bot-chips"></div>
      <form class="bot-form" autocomplete="off">
        <input type="text" placeholder="Ask about suits, prices, delivery..." aria-label="Your question" maxlength="300">
        <button type="submit" aria-label="Send">&rarr;</button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const launch = $('.bot-launch', root), panel = $('.bot-panel', root), log = $('.bot-log', root),
        chipsEl = $('.bot-chips', root), form = $('.bot-form', root), input = $('input', form), tease = $('.bot-tease', root);
  const history = [];
  let started = false, busy = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  function bubble(text, who, extra) {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    if (extra && extra.links) {
      const row = document.createElement('div'); row.className = 'msg-links';
      extra.links.forEach(l => {
        const a = document.createElement('a'); a.textContent = l.label; a.href = l.href;
        if (l.go) a.addEventListener('click', e => { e.preventDefault(); setOpen(false); document.querySelector(l.go).scrollIntoView({ behavior: 'smooth' }); });
        row.appendChild(a);
      });
      el.appendChild(row);
    }
    log.appendChild(el); scroll(); return el;
  }
  function setChips(list) {
    chipsEl.innerHTML = '';
    (list || []).forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.addEventListener('click', () => ask(t)); chipsEl.appendChild(b);
    });
  }
  function setOpen(open) {
    root.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', !open); launch.setAttribute('aria-expanded', open);
    tease.hidden = true;
    if (open) {
      if (!started) { started = true; greet(); }
      setTimeout(() => input.focus(), 250);
    }
  }
  launch.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  $('.bot-x', root).addEventListener('click', () => setOpen(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) setOpen(false); });
  $('button', tease).addEventListener('click', () => { tease.hidden = true; try { sessionStorage.setItem('bot-tease', '1'); } catch (e) {} });

  /* anything on the page with data-ask opens the chat and asks that question */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ask]'); if (!t) return;
    e.preventDefault();
    const lb = document.getElementById('lightbox'); if (lb && lb.classList.contains('open')) $('.lb-close').click();
    setOpen(true);
    if (t.dataset.ask) ask(t.dataset.ask);
  });

  /* teaser bubble, once per visit */
  setTimeout(() => {
    let seen = false; try { seen = sessionStorage.getItem('bot-tease'); } catch (e) {}
    if (!seen && !root.classList.contains('open')) { tease.hidden = false; try { sessionStorage.setItem('bot-tease', '1'); } catch (e) {} }
  }, 7000);

  /* ---- knowledge ---- */
  const norm = s => ' ' + s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const has = (t, words) => words.some(w => t.includes(' ' + w + ' ') || (w.length > 4 && t.includes(w)));

  const contactLinks = [
    { label: 'Call ' + BIZ.phoneDisplay, href: 'tel:' + BIZ.phoneTel },
    { label: 'Email us', href: 'mailto:' + BIZ.email }
  ];
  const bookLink = { label: 'Book a fitting', href: '#booking', go: '#booking' };
  const MAIN_CHIPS = ['Prices', 'Get 2 Suits deal', 'Delivery', 'Opening hours', 'Custom tailoring', 'Book a fitting'];

  function openNow() {
    try {
      const parts = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      const day = parts.find(p => p.type === 'weekday').value.toLowerCase();
      const hr = parseInt(parts.find(p => p.type === 'hour').value, 10) % 24;
      if (day.startsWith('sun')) return 'We are closed on Sundays right now, and open again Monday at 9AM.';
      if (hr >= 9 && hr < 18) return 'Yes, we are open now (until 6PM).';
      return hr < 9 ? 'Not yet, we open at 9AM today.' : 'We have closed for today' + (day.startsWith('sat') ? ', and reopen Monday at 9AM.' : ', and reopen tomorrow at 9AM.');
    } catch (e) { return ''; }
  }

  function productReply(p) {
    return {
      text: `${p.name}: ${p.fit}, ${p.fabric}. Now ${p.price} (was ${p.was}).\nWant to see it? Tap the suit in the Collection to view it larger.`,
      chips: ['Prices', 'Get 2 Suits deal', 'Book a fitting'], links: [{ label: 'View collection', href: '#collection', go: '#collection' }]
    };
  }

  function answer(raw) {
    const t = norm(raw), P = products();
    const R = (text, chips, links) => ({ text, chips: chips || MAIN_CHIPS, links });

    /* specific suit mentioned? */
    const find = fn => P.filter(fn);
    let hit = find(p => t.includes(norm(p.name).trim()));
    if (!hit.length) {
      if (has(t, ['tuxedo', 'tux', 'black tie', 'midnight'])) hit = find(p => /tuxedo/i.test(p.name));
      else if (has(t, ['burgundy', 'three piece', '3 piece', 'velvet', 'waistcoat'])) hit = find(p => /three/i.test(p.name));
      else if (has(t, ['double breasted', 'doublebreasted', 'double', 'cashmere'])) hit = find(p => /double/i.test(p.name));
      else if (has(t, ['charcoal', 'slim fit', 'slim'])) hit = find(p => /charcoal/i.test(p.name));
      else if (has(t, ['light gray', 'light grey', 'gray', 'grey', 'linen'])) hit = find(p => /gr[ae]y/i.test(p.name));
      else if (has(t, ['navy', 'blue'])) hit = find(p => /navy/i.test(p.name));
    }
    if (hit.length === 1) return productReply(hit[0]);
    if (hit.length > 1) return R('We have ' + hit.length + ' like that:\n' + hit.map(p => `• ${p.name}: ${p.price} (${p.fit}, ${p.fabric})`).join('\n'), ['Prices', 'Book a fitting']);

    if (has(t, ['hi', 'hello', 'hey', 'howzit', 'sawubona', 'good morning', 'good afternoon', 'good evening', 'yo', 'molo']) && t.split(' ').length < 6)
      return R(`Hi, welcome to ${BIZ.name}. I can help with our suits, prices, delivery, tailoring and booking. What would you like to know?`);
    if (has(t, ['thanks', 'thank you', 'thx', 'cheers', 'ngiyabonga', 'enkosi', 'appreciate']))
      return R('You are welcome. Anything else I can help with?', ['Prices', 'Book a fitting', 'Delivery']);
    if (has(t, ['bye', 'goodbye', 'see you', 'later'])) return R('Thanks for visiting. Come back any time, and we would love to dress you.', []);
    if (has(t, ['are you a bot', 'are you human', 'are you real', 'robot', 'who are you', 'your name', 'chatbot']))
      return R(`I am the ${BIZ.name} virtual assistant. I answer questions about the business. For anything personal, like measurements or an order, the team will help you directly.`, ['Book a fitting', 'Contact']);

    if (has(t, ['2 suits', 'two suits', 'deal', 'special', 'offer', 'promo', 'discount', 'sale', 'r2499', '2499', 'limited time', 'bundle']))
      return R(`${BIZ.deal}. It is available for a limited time, so book soon to secure it. Choose "Get 2 Suits (R2499)" in the booking form and the team will confirm your picks.`, ['Prices', 'Book a fitting'], [bookLink]);

    if (has(t, ['book', 'booking', 'appointment', 'fitting', 'consultation', 'reserve', 'schedule']))
      return R('You can book a fitting in under a minute. Tell us your name, number and the service you want, and the team will confirm your appointment. Virtual consultations are available too.', ['Virtual consultation', 'Opening hours'], [bookLink]);

    if (has(t, ['virtual', 'online consult', 'video', 'remote', 'zoom']))
      return R('Yes, we offer virtual consultations, handy if you cannot visit in person. Choose "Virtual Consultation" in the booking form and we will confirm the details with you.', ['Book a fitting', 'Delivery'], [bookLink]);

    if (has(t, ['price', 'prices', 'cost', 'how much', 'pricing', 'cheap', 'cheapest', 'expensive', 'afford', 'rand', 'budget', 'rates'])) {
      const sorted = [...P].sort((a, b) => a.n - b.n);
      const lines = P.map(p => `• ${p.name}: ${p.price} (was ${p.was})`).join('\n');
      let extra = '';
      if (has(t, ['cheap', 'cheapest', 'lowest', 'budget'])) extra = `\nMost affordable: ${sorted[0].name} at ${sorted[0].price}.`;
      if (has(t, ['expensive', 'highest', 'premium', 'top'])) extra = `\nTop of the range: ${sorted[sorted.length - 1].name} at ${sorted[sorted.length - 1].price}.`;
      return R('Our current prices:\n' + lines + extra + '\n\nAlso: ' + BIZ.deal + '.', ['Get 2 Suits deal', 'Delivery', 'Book a fitting']);
    }

    if (has(t, ['deliver', 'delivery', 'shipping', 'ship', 'courier', 'nationwide', 'track', 'post', 'send to']))
      return R('We deliver nationwide across South Africa, with secure packaging and tracking. For delivery fees and timing to your area, please contact the team and they will confirm.', ['Prices', 'Book a fitting'], contactLinks);

    if (has(t, ['hours', 'open', 'opening', 'close', 'closing', 'what time', 'when are you', 'weekend', 'saturday', 'sunday', 'monday'])) {
      const now = has(t, ['now', 'today', 'right now', 'open now', 'currently', 'tonight', 'is it open', 'are you open']) ? openNow() : '';
      return R(`We are open ${BIZ.hours}.` + (now ? '\n' + now : ''), ['Book a fitting', 'Contact']);
    }

    if (has(t, ['phone', 'call', 'email', 'contact', 'number', 'reach', 'speak to', 'talk to', 'human', 'person', 'owner', 'manager', 'whatsapp', 'message']))
      return R(`You can reach the team on ${BIZ.phoneDisplay} or ${BIZ.email} (${BIZ.hours}). Or leave your details in the booking form and we will get back to you.`, ['Book a fitting', 'Opening hours'], contactLinks);

    if (has(t, ['where', 'location', 'address', 'shop', 'store', 'showroom', 'visit', 'branch', 'directions', 'find you', 'come to']))
      return R('I do not have our street address in front of me. Please call or email the team and they will give you directions and confirm where to meet for your fitting.', ['Virtual consultation', 'Delivery'], contactLinks);

    if (has(t, ['pay', 'payment', 'eft', 'card', 'cash', 'deposit', 'instalment', 'installment', 'layby', 'lay by']))
      return R('I do not have our payment options listed, so I do not want to guess. The team can confirm accepted payment methods and any deposit when you book.', ['Book a fitting'], contactLinks);

    if (has(t, ['return', 'refund', 'exchange', 'warranty', 'guarantee', 'wrong size', 'doesnt fit']))
      return R('I do not have our returns or exchange policy, so I would rather not guess. Please ask the team before you order and they will explain exactly how it works.', ['Book a fitting'], contactLinks);

    if (has(t, ['alter', 'alteration', 'tailor', 'tailoring', 'custom', 'bespoke', 'made to measure', 'measure', 'measurement', 'adjust', 'hem']))
      return R('We offer Custom Tailoring: suits made with precision, elegance and durability, cut to your measure by a master tailor. Pricing and turnaround depend on the garment, so book a fitting and the team will quote you.', ['Book a fitting', 'Virtual consultation', 'Prices'], [bookLink]);

    if (has(t, ['bulk', 'group', 'groomsmen', 'groom', 'wedding', 'matric', 'farewell', 'graduation', 'gala', 'event', 'conference', 'award', 'ceremony', 'occasion', 'party', 'team']))
      return R('Yes, we dress weddings, graduations, galas, award ceremonies and business events. For groups and events, choose "Bulk Order / Events" in the booking form so the team can plan sizes and delivery with you.', ['Delivery', 'Prices', 'Book a fitting'], [bookLink]);

    if (has(t, ['fabric', 'material', 'wool', 'cotton', 'silk', 'velvet', 'cashmere', 'linen', 'blend']))
      return R('Our fabrics vary by suit:\n' + P.map(p => `• ${p.name}: ${p.fabric}`).join('\n'), ['Prices', 'Book a fitting']);

    if (has(t, ['fit', 'fits', 'size', 'sizes', 'sizing', 'slim', 'tailored fit', 'classic fit', 'what size', 'big', 'tall'])) {
      const fits = [...new Set(P.map(p => p.fit))].filter(f => /fit/i.test(f));
      return R('Our cuts are ' + fits.join(', ') + '. Each suit page lists its fit. For the right size, the best step is a fitting (in person or virtual), where the team measures you properly.', ['Book a fitting', 'Virtual consultation'], [bookLink]);
    }

    if (has(t, ['collection', 'suits', 'styles', 'range', 'what do you sell', 'what do you have', 'catalogue', 'catalog', 'show me', 'options', 'products', 'gallery', 'browse', 'colours', 'colors']))
      return R('Our collection:\n' + P.map(p => `• ${p.name} (${p.fit}) ${p.price}`).join('\n') + '\n\nTap any suit in the gallery to see it larger.', ['Prices', 'Get 2 Suits deal', 'Fabrics'], [{ label: 'Open collection', href: '#collection', go: '#collection' }]);

    if (has(t, ['about', 'story', 'history', 'founded', 'founder', 'since', 'who started', 'how long', 'experience', 'years', 'clients', 'master tailor', 'why choose', 'why you']))
      return R(`${BIZ.name} was founded in ${BIZ.founded} with one mission: premium formalwear for South African men at prices that do not break the bank. Our founder is a master tailor with over 15 years in luxury menswear, and we have dressed 2000+ clients.`, ['Prices', 'Book a fitting']);

    if (has(t, ['quality', 'durable', 'last', 'well made', 'good quality', 'premium', 'luxury']))
      return R('Every suit is made with precision, elegance and durability. We use premium blends like wool, cashmere, silk and velvet, finished with attention to detail, at accessible prices.', ['Fabrics', 'Prices']);

    if (has(t, ['service', 'services', 'what do you do', 'help with', 'offer you']))
      return R('We offer:\n' + BIZ.services.map(s => '• ' + s).join('\n'), ['Book a fitting', 'Prices']);

    return R(`I am not sure I have that one. I can help with our suits, prices, the 2-for-R2499 deal, delivery, hours and booking. For anything else, the team will gladly help directly.`, MAIN_CHIPS, contactLinks);
  }

  /* ---- conversation ---- */
  function greet() {
    bubble(`Hi, I am the ${BIZ.name} assistant. Ask me anything about our suits, prices, delivery or booking.`, 'bot');
    setChips(MAIN_CHIPS);
  }

  async function reply(text) {
    if (API) {
      try {
        const c = new AbortController(); const to = setTimeout(() => c.abort(), 8000);
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: c.signal, body: JSON.stringify({ message: text, history: history.slice(-8) }) });
        clearTimeout(to);
        if (r.ok) { const j = await r.json(); if (j && j.reply) return { text: String(j.reply), chips: MAIN_CHIPS }; }
      } catch (e) { /* fall back to local answers */ }
    }
    return answer(text);
  }

  async function ask(text) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; setChips([]);
    bubble(text, 'user'); history.push({ role: 'user', text });
    const typing = bubble('', 'bot typing'); typing.innerHTML = '<i></i><i></i><i></i>';
    const [r] = await Promise.all([reply(text), new Promise(res => setTimeout(res, 450 + Math.random() * 350))]);
    typing.remove();
    bubble(r.text, 'bot', { links: r.links }); history.push({ role: 'bot', text: r.text });
    setChips(r.chips); busy = false;
  }

  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
  window.MRSuitsBot = { open: () => setOpen(true), ask };
})();
