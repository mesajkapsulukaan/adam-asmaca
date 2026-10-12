/* ===========================================================
   Adam Asmaca – çok oyunculu (en fazla 15 kişi)
   - Sunucu yok: PeerJS (WebRTC) ile lobi sahibi "sunucu" gibi çalışır.
   - Kelimeler: hazır liste + TDK (sozluk.gov.tr) anlam/ipucu ve rastgele TDK modu.
   =========================================================== */
'use strict';
(function () {

/* ---------------- Sabitler ---------------- */
const MAX_PLAYERS = 15;
const PREFIX = 'adamasmaca-v1-';
const TURN_MS = 25000;
const END_WAIT = 6500;
const ALPHABET = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];
const PALETTE = ['#e2572b','#2f8f9d','#7a5cc7','#d4a017','#3b8a4a','#c2417a','#3d6bd1','#e0803a',
                 '#6b8e23','#a0522d','#c0392b','#16a085','#8e44ad','#2c82c9','#d35400'];
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }];

const trUp = s => String(s).toLocaleUpperCase('tr');
const trLow = s => String(s).toLocaleLowerCase('tr');
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const rnd = n => Math.floor(Math.random() * n);

/* ---------------- Hazır kelime listesi ---------------- */
const WORDS = {
  'Hayvan': 'kedi köpek aslan kaplan zürafa maymun tavşan kaplumbağa penguen yunus balina kartal papağan kelebek karınca örümcek timsah geyik tilki kurt eşek koyun keçi tavuk horoz ördek kuğu baykuş leylek yılan kurbağa sincap kirpi zebra deve panda koala kanguru flamingo martı güvercin böcek',
  'Yiyecek': 'pilav makarna çorba kebap lahmacun baklava börek mantı pide köfte dondurma çikolata simit peynir yoğurt zeytin reçel kahvaltı salata turşu lokum gözleme menemen sucuk pastırma kurabiye pasta bisküvi',
  'Meyve / Sebze': 'elma armut portakal mandalina çilek kiraz karpuz kavun üzüm şeftali erik incir ayva limon domates salatalık biber patlıcan havuç soğan sarımsak patates ıspanak marul kabak mısır fasulye nohut mercimek',
  'Eşya': 'masa sandalye dolap yatak yastık battaniye halı perde lamba ayna saat telefon bilgisayar televizyon klavye kalem defter kitap çanta şemsiye gözlük anahtar bardak tabak kaşık çatal bıçak tencere tava fırın buzdolabı süpürge makas çekiç tornavida kulaklık fotoğraf bisiklet',
  'Meslek': 'doktor öğretmen mühendis avukat polis itfaiyeci pilot aşçı terzi berber marangoz çiftçi gazeteci sanatçı ressam şoför hemşire bahçıvan kasap fırıncı müzisyen yazar',
  'Doğa': 'ağaç çiçek deniz nehir orman yıldız güneş bulut yağmur şimşek gökkuşağı vadi şelale mağara volkan yaprak çimen toprak deprem sonbahar ilkbahar fırtına',
  'Ülke / Şehir': 'türkiye almanya fransa ispanya italya japonya brezilya kanada yunanistan ankara istanbul izmir antalya bursa trabzon erzurum konya adana mardin samsun eskişehir',
  'Spor': 'futbol basketbol voleybol tenis yüzme boks güreş okçuluk eskrim jimnastik kayak hentbol halter atletizm kaleci hakem stadyum şampiyon penaltı forma',
  'Ev': 'mutfak banyo salon balkon bahçe merdiven pencere duvar koltuk garaj asansör',
  'Vücut': 'kafa kulak burun boyun omuz bilek parmak tırnak göğüs karın bacak ayak topuk kalp beyin akciğer kemik',
  'Taşıt': 'araba otobüs uçak gemi vapur kamyon motosiklet helikopter tramvay metro taksi minibüs denizaltı roket',
  'Eğlence': 'gitar piyano keman davul flüt şarkı türkü orkestra tiyatro sinema heykel müze karnaval balon oyuncak bulmaca macera hazine korsan şato prenses ejderha büyücü robot uzay gezegen astronot teleskop',
  'Duygu / Kavram': 'mutluluk dostluk sevgi umut cesaret özgürlük barış kardeş arkadaş misafir bayram sürpriz hediye gülümseme merhaba teşekkür sabır'
};
const BUILTIN = (() => {
  const seen = new Set(), out = [];
  for (const [c, str] of Object.entries(WORDS)) {
    for (const w of str.split(/\s+/)) { if (w && !seen.has(w)) { seen.add(w); out.push({ w, c }); } }
  }
  return out;
})();

/* ---------------- Ses efektleri (WebAudio, dosya yok) ---------------- */
let ac = null, muted = false;
try { muted = localStorage.getItem('as-muted') === '1'; } catch (e) {}
function actx() {
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch (e) { return null; }
}
function tone(f, t = 0, d = .15, type = 'sine', v = .12, to) {
  if (muted) return;
  const a = actx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + .015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + d + .05);
}
const SFX = {
  click() { tone(620, 0, .06, 'triangle', .07); },
  key() { tone(480, 0, .05, 'triangle', .06); },
  correct() { tone(523, 0, .12, 'triangle', .13); tone(659, .09, .12, 'triangle', .13); tone(784, .18, .22, 'triangle', .13); },
  wrong() { tone(230, 0, .2, 'sawtooth', .1, 140); tone(150, .15, .32, 'sawtooth', .1, 80); },
  join() { tone(440, 0, .1, 'sine', .12); tone(660, .1, .16, 'sine', .12); },
  leave() { tone(520, 0, .1, 'sine', .1); tone(330, .1, .18, 'sine', .1); },
  turn() { tone(740, 0, .1, 'triangle', .12); tone(988, .1, .16, 'triangle', .12); },
  tick() { tone(950, 0, .04, 'square', .04); },
  start() { [392, 523, 659, 784].forEach((f, i) => tone(f, i * .1, .2, 'triangle', .13)); },
  win() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * .11, .22, 'triangle', .14)); },
  end() { [523, 659, 784, 1046, 1318, 1046, 1318, 1568].forEach((f, i) => tone(f, i * .12, .26, 'triangle', .14)); },
  lose() { [392, 349, 311, 262].forEach((f, i) => tone(f, i * .22, .3, 'sawtooth', .09)); }
};

/* ---------------- Süsler: kıvılcım & konfeti ---------------- */
(function embers() {
  const box = $('embers');
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'ember';
    s.style.left = Math.random() * 100 + '%';
    s.style.setProperty('--s', (3 + Math.random() * 5) + 'px');
    s.style.setProperty('--d', (9 + Math.random() * 12) + 's');
    s.style.setProperty('--dl', (-Math.random() * 20) + 's');
    s.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
    box.appendChild(s);
  }
})();
function confetti(n = 90) {
  const box = $('confetti'), cols = ['#f2a33a', '#e2572b', '#5f9f62', '#ffcf73', '#2f8f9d', '#c2417a', '#fff4dc'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'conf';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = cols[rnd(cols.length)];
    c.style.setProperty('--d', (1.8 + Math.random() * 2.2) + 's');
    c.style.setProperty('--x', (Math.random() * 240 - 120) + 'px');
    c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    box.appendChild(c);
    setTimeout(() => c.remove(), 4300);
  }
}

/* ---------------- Küçük arayüz yardımcıları ---------------- */
let toastTm = null;
function toast(msg, ms = 2600) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTm); toastTm = setTimeout(() => t.classList.remove('show'), ms);
}
function showBusy(msg) { $('busyMsg').textContent = msg; $('busy').classList.remove('hidden'); }
function hideBusy() { $('busy').classList.add('hidden'); }
let modalKind = '';
function showModal(html, kind = '') { $('modalCard').innerHTML = html; $('modal').classList.remove('hidden'); modalKind = kind; }
function closeModal(kind) { if (kind && modalKind !== kind) return; $('modal').classList.add('hidden'); modalKind = ''; }
$('modal').addEventListener('click', e => { if (e.target === $('modal') && ['wg', 'confirm', 'info'].includes(modalKind)) closeModal(); });
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
}
function confirmDialog(title, text, okLabel, cb) {
  showModal(`<h3>${esc(title)}</h3><p>${esc(text)}</p>
    <div class="row"><button class="btn ghost" id="cfNo">Vazgeç</button><button class="btn" id="cfOk">${esc(okLabel)}</button></div>`, 'confirm');
  $('cfNo').onclick = () => closeModal();
  $('cfOk').onclick = () => { closeModal(); cb(); };
}
function infoDialog(title, text, cb) {
  showModal(`<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="row"><button class="btn" id="inOk">Tamam</button></div>`, 'info');
  $('inOk').onclick = () => { closeModal(); if (cb) cb(); };
}

/* ---------------- Durum değişkenleri ---------------- */
let peer = null, conn = null, isHost = false, code = '', me = { id: '', name: '' };
const conns = new Map();
let S = null;            // herkesin gördüğü ortak durum
let H = null;            // sadece lobi sahibinde: gerçek oyun durumu
let off = 0;             // lobi sahibi ile saat farkı
let pendingCode = '', gone = false, joinTimer = null;
let logs = [], floats = {}, lastTurn = null, lastTick = -1, prevMask = [], prevRound = 0, prevWrong = 0, shownEnd = 0;

/* ---------------- TDK ---------------- */
const TDK_GTS = 'https://sozluk.gov.tr/gts?ara=';
const TDK_LIST = 'https://sozluk.gov.tr/autocomplete.json';
// TDK doğrudan engellenirse (CORS) sırayla ücretsiz proxy'ler denenir.
const ROUTES = [
  u => u,
  u => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u)
];
let goodRoute = -1;
async function fetchJSON(url, perTry = 6000, total = 14000) {
  const start = Date.now();
  const order = goodRoute >= 0 ? [goodRoute] : [0, 1, 2];
  for (const i of order) {
    if (Date.now() - start > total) break;
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), perTry);
    try {
      const r = await fetch(ROUTES[i](url), { signal: ctl.signal });
      clearTimeout(tm);
      if (!r.ok) continue;
      const j = await r.json();
      goodRoute = i;
      return j;
    } catch (e) { clearTimeout(tm); }
  }
  goodRoute = -1;
  return null;
}
function maskMeaning(text, word) {
  const low = trLow(text), w = trLow(word);
  const stem = w.slice(0, Math.max(4, w.length - 2));
  const base = low.length === text.length ? text : low;
  const re = new RegExp(stem + '[a-zçğıöşü]*', 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(low))) { out += base.slice(last, m.index) + '___'; last = m.index + m[0].length; }
  return out + base.slice(last);
}
async function fetchMeaning(word) {
  const d = await fetchJSON(TDK_GTS + encodeURIComponent(trLow(word)), 4000, 9000);
  if (!Array.isArray(d) || !d[0]) return null;
  const l = d[0].anlamlarListe, a = l && l[0] && l[0].anlam;
  if (!a) return null;
  let full = String(a).replace(/\s+/g, ' ').trim();
  if (full.length > 180) full = full.slice(0, 177).trim() + '…';
  return { full, masked: maskMeaning(full, word) };
}
let tdkPoolP = null;
function loadTdkPool() {
  if (!tdkPoolP) {
    tdkPoolP = fetchJSON(TDK_LIST, 9000, 20000).then(d => {
      if (!Array.isArray(d)) return null;
      const out = [];
      for (const x of d) {
        const w = trLow(String((x && x.madde) || '').trim());
        if (/^[a-zçğıöşü]{5,9}$/.test(w)) out.push(w);
      }
      return out.length > 200 ? out : null;
    });
    tdkPoolP.then(r => { if (!r) tdkPoolP = null; });
  }
  return tdkPoolP;
}

/* ---------------- Ağ yardımcıları ---------------- */
function send(c, o) { try { c.send(o); } catch (e) {} }
function broadcast(o) { conns.forEach(c => send(c, o)); }
function peerOpts() { return { debug: 0, config: { iceServers: ICE } }; }
function randomCode() { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[rnd(CODE_CHARS.length)]; return s; }
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new Peer(id, peerOpts()) : new Peer(peerOpts());
    p.on('open', () => res(p));
    p.on('error', e => { try { p.destroy(); } catch (x) {} rej(e); });
  });
}
function teardown() {
  if (H) { clearTimeout(H.tt); clearTimeout(H.nt); H.alive = false; }
  const p = peer, cs = [...conns.values()], c = conn, wasHost = isHost;
  if (wasHost) broadcast({ t: 'closed' });
  peer = null; conn = null; H = null; S = null; isHost = false; code = ''; gone = false;
  conns.clear(); clearTimeout(joinTimer);
  logs = []; floats = {}; lastTurn = null; prevMask = []; prevRound = 0; prevWrong = 0; shownEnd = 0;
  closeModal(); hideBusy();
  setTimeout(() => {
    try { cs.forEach(x => x.close()); } catch (e) {}
    try { c && c.close(); } catch (e) {}
    try { p && p.destroy(); } catch (e) {}
  }, 250);
}
function goMenu(msg) {
  teardown();
  showScreen('scr-menu');
  const el = $('menuErr');
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); } else el.classList.add('hidden');
}

/* =====================================================================
   LOBİ SAHİBİ (sunucu mantığı)
   ===================================================================== */
function newGame() {
  return {
    alive: true, phase: 'lobby', set: { rounds: 5, lives: 8, mode: 'free', source: 'list' },
    players: [], round: 0, word: '', cat: '', src: 'list', meaning: '', meaningFull: '',
    guessed: [], wrong: [], strikes: 0, res: null, turn: null, turnEnds: 0, tt: null, nt: null, used: []
  };
}
const getP = id => H.players.find(p => p.id === id);
function freeColor() {
  const used = new Set(H.players.map(p => p.ci));
  for (let i = 0; i < PALETTE.length; i++) if (!used.has(i)) return i;
  return rnd(PALETTE.length);
}
function sanitizeName(n) {
  n = String(n || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  return n || 'Oyuncu';
}
function uniqueName(n) {
  const taken = x => H.players.some(p => trLow(p.name) === trLow(x));
  let out = n, k = 2;
  while (taken(out)) out = n.slice(0, 12) + ' ' + (k++);
  return out;
}
function pub() {
  const end = H.phase === 'roundEnd' || H.phase === 'gameEnd';
  const w = [...H.word];
  const wrongN = H.wrong.length + H.strikes;
  const hintAt = Math.ceil(H.set.lives / 2);
  const showHint = H.meaning && (wrongN >= hintAt || end);
  return {
    now: Date.now(), phase: H.phase, set: H.set, round: H.round, code,
    players: H.players.map(p => ({ id: p.id, name: p.name, score: p.score, on: p.on, ci: p.ci })),
    len: w.length, mask: w.map(c => H.guessed.includes(c) ? c : ''),
    wrong: H.wrong, wrongN, cat: H.cat, src: H.src,
    hasHint: !!H.meaning, hint: showHint ? (end ? H.meaningFull : H.meaning) : '', hintAt,
    turnId: H.set.mode === 'turn' && H.phase === 'playing' ? H.turn : null, turnEnds: H.turnEnds, turnMs: TURN_MS,
    res: H.res, word: end ? H.word : ''
  };
}
function pushState() {
  if (!H || !H.alive) return;
  S = pub(); off = 0;
  broadcast({ t: 'state', s: S });
  render();
}
function emit(ev) {
  handleEv(ev);
  broadcast({ t: 'ev', ev });
}
function clearTimers() { clearTimeout(H.tt); clearTimeout(H.nt); }
const onlineIds = () => H.players.filter(p => p.on).map(p => p.id);

function startTurnTimer() {
  clearTimeout(H.tt);
  if (H.set.mode !== 'turn' || H.phase !== 'playing') { H.turnEnds = 0; return; }
  H.turnEnds = Date.now() + TURN_MS;
  H.tt = setTimeout(() => {
    const p = getP(H.turn);
    if (p) emit({ k: 'sys', m: `⏰ ${p.name} süreyi doldurdu, sıra geçti.` });
    advanceTurn();
    pushState();
  }, TURN_MS + 150);
}
function advanceTurn() {
  const ids = onlineIds();
  if (!ids.length) { H.turn = null; return; }
  const i = ids.indexOf(H.turn);
  H.turn = i < 0 ? ids[0] : ids[(i + 1) % ids.length];
  startTurnTimer();
}

function setSetting(k, v) {
  if (H.phase !== 'lobby') return;
  const ok = { rounds: [3, 5, 8], lives: [6, 8, 10], mode: ['free', 'turn'], source: ['list', 'tdk'] };
  if (!ok[k] || !ok[k].includes(v)) return;
  H.set = Object.assign({}, H.set, { [k]: v });
  pushState();
}
function startGame() {
  if (!H || H.phase !== 'lobby') return;
  H.players = H.players.filter(p => p.on);
  H.players.forEach(p => p.score = 0);
  H.round = 0; H.used = [];
  emit({ k: 'sys', m: '🎮 Oyun başladı! Bol şans.', reset: true, fx: 'start' });
  nextRound();
}
function pickBuiltin() {
  let pool = BUILTIN.filter(x => !H.used.includes(x.w));
  if (!pool.length) { H.used = []; pool = BUILTIN; }
  const x = pool[rnd(pool.length)];
  H.used.push(x.w);
  return { w: x.w, c: x.c, src: 'list' };
}
async function pickWord() {
  if (H.set.source === 'tdk') {
    const pool = await loadTdkPool();
    if (pool) {
      const fresh = pool.filter(w => !H.used.includes(w));
      const w = (fresh.length ? fresh : pool)[rnd((fresh.length ? fresh : pool).length)];
      H.used.push(w);
      return { w, c: '', src: 'tdk' };
    }
    emit({ k: 'sys', m: "TDK'ya ulaşılamadı, hazır listeden kelime seçildi." });
  }
  return pickBuiltin();
}
async function nextRound() {
  clearTimers();
  H.round++;
  const r = H.round;
  H.phase = 'picking'; H.res = null; H.word = ''; H.cat = ''; H.meaning = ''; H.meaningFull = '';
  H.guessed = []; H.wrong = []; H.strikes = 0; H.turn = null; H.turnEnds = 0;
  pushState();
  const pick = await pickWord();
  if (!H || !H.alive || H.round !== r || H.phase !== 'picking') return;
  H.word = trUp(pick.w); H.cat = pick.c; H.src = pick.src;
  H.phase = 'playing';
  if (H.set.mode === 'turn') {
    const ids = onlineIds();
    H.turn = ids[(r - 1) % Math.max(1, ids.length)] || null;
  }
  startTurnTimer();
  pushState();
  fetchMeaning(pick.w).then(m => {
    if (m && H && H.alive && H.round === r && H.word === trUp(pick.w)) {
      H.meaning = m.masked; H.meaningFull = m.full; pushState();
    }
  });
}
function allGuessed() { return [...H.word].every(c => H.guessed.includes(c)); }
function finishRound(res) {
  clearTimeout(H.tt); H.turnEnds = 0;
  H.phase = 'roundEnd'; H.res = res;
  if (res.won) emit({ k: 'good', m: `🎉 ${res.byName} kelimeyi buldu: ${H.word}`, fx: 'win' });
  else emit({ k: 'bad', m: `💀 Adam asıldı! Kelime: ${H.word}`, fx: 'lose' });
  H.nt = setTimeout(afterRound, END_WAIT);
}
function afterRound() {
  if (!H || !H.alive || H.phase !== 'roundEnd') return;
  clearTimeout(H.nt);
  if (H.round >= H.set.rounds) {
    H.phase = 'gameEnd'; H.res = null;
    emit({ fx: 'end' });
    pushState();
  } else nextRound();
}
function backToLobby() {
  if (!H || H.phase !== 'gameEnd') return;
  clearTimers();
  H.players = H.players.filter(p => p.on);
  H.players.forEach(p => p.score = 0);
  H.phase = 'lobby'; H.round = 0; H.word = ''; H.res = null;
  pushState();
}
function turnOk(pid) { return H.set.mode !== 'turn' || H.turn === pid; }

function guessLetter(pid, l) {
  if (H.phase !== 'playing' || !ALPHABET.includes(l)) return;
  if (H.guessed.includes(l) || H.wrong.includes(l)) return;
  const p = getP(pid); if (!p || !turnOk(pid)) return;
  const n = [...H.word].filter(c => c === l).length;
  if (n) {
    H.guessed.push(l);
    const pts = n * 10; p.score += pts;
    emit({ k: 'good', m: `${p.name}: ${l} harfi doğru (+${pts})`, fx: 'correct', id: pid, pts });
    if (allGuessed()) { p.score += 25; emit({ id: pid, pts: 25 }); finishRound({ won: true, by: pid, byName: p.name }); }
    else startTurnTimer();
  } else {
    H.wrong.push(l);
    emit({ k: 'bad', m: `${p.name}: ${l} yok ✖`, fx: 'wrong' });
    if (H.wrong.length + H.strikes >= H.set.lives) finishRound({ won: false });
    else if (H.set.mode === 'turn') advanceTurn();
  }
  pushState();
}
function guessWord(pid, w) {
  if (H.phase !== 'playing') return;
  const p = getP(pid); if (!p || !turnOk(pid)) return;
  w = trUp(String(w || '').trim());
  if (!w || [...w].some(c => !ALPHABET.includes(c)) || w.length > 20) return;
  if (w === H.word) {
    const hidden = [...H.word].filter(c => !H.guessed.includes(c)).length;
    const pts = hidden * 15 + 25;
    p.score += pts;
    [...H.word].forEach(c => { if (!H.guessed.includes(c)) H.guessed.push(c); });
    emit({ id: pid, pts });
    finishRound({ won: true, by: pid, byName: p.name });
  } else {
    H.strikes++;
    emit({ k: 'bad', m: `${p.name}: "${w}" yanlış tahmin ✖`, fx: 'wrong' });
    if (H.wrong.length + H.strikes >= H.set.lives) finishRound({ won: false });
    else if (H.set.mode === 'turn') advanceTurn();
  }
  pushState();
}
function onLeave(pid) {
  if (!H || !H.alive) return;
  conns.delete(pid);
  const p = getP(pid); if (!p) return;
  if (H.phase === 'lobby') H.players = H.players.filter(x => x.id !== pid);
  else p.on = false;
  emit({ k: 'sys', m: `${p.name} ayrıldı.`, fx: 'leave' });
  if (H.phase === 'playing' && H.set.mode === 'turn' && H.turn === pid) advanceTurn();
  pushState();
}
function kick(pid) {
  const c = conns.get(pid);
  if (c) { send(c, { t: 'kicked' }); setTimeout(() => { try { c.close(); } catch (e) {} }, 200); }
  onLeave(pid);
}
function hostConnection(c) {
  c.on('data', m => {
    if (!H || !H.alive || !m || typeof m.t !== 'string') return;
    if (m.t === 'join') {
      if (getP(c.peer)) return;
      if (H.phase !== 'lobby') { send(c, { t: 'deny', why: 'Oyun çoktan başlamış, sonraki oyunu bekle 🙂' }); setTimeout(() => c.close(), 300); return; }
      if (H.players.length >= MAX_PLAYERS) { send(c, { t: 'deny', why: `Lobi dolu (${MAX_PLAYERS}/${MAX_PLAYERS}).` }); setTimeout(() => c.close(), 300); return; }
      const name = uniqueName(sanitizeName(m.name));
      H.players.push({ id: c.peer, name, score: 0, on: true, ci: freeColor() });
      conns.set(c.peer, c);
      send(c, { t: 'welcome', you: c.peer, name });
      emit({ k: 'sys', m: `${name} katıldı 👋`, fx: 'join' });
      pushState();
    } else if (m.t === 'guess') guessLetter(c.peer, String(m.l || ''));
    else if (m.t === 'word') guessWord(c.peer, m.w);
  });
  c.on('close', () => onLeave(c.peer));
  c.on('error', () => {});
}

async function createLobby() {
  showBusy('Lobi kuruluyor…');
  teardown();
  let p = null;
  for (let i = 0; i < 6 && !p; i++) {
    const c = randomCode();
    try { p = await openPeer(PREFIX + c); code = c; }
    catch (e) {
      if (e && e.type === 'unavailable-id') continue;
      hideBusy(); goMenu('Lobi kurulamadı (' + ((e && e.type) || 'bağlantı') + '). İnternetini kontrol edip tekrar dene.'); return;
    }
  }
  if (!p) { hideBusy(); goMenu('Lobi kurulamadı, tekrar dene.'); return; }
  peer = p; isHost = true; gone = false;
  me.id = 'host';
  H = newGame();
  H.players.push({ id: 'host', name: me.name, score: 0, on: true, ci: 0 });
  peer.on('connection', hostConnection);
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  peer.on('error', e => { if (e && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type)) toast('Sinyal sunucusuyla bağlantı koptu, yeniden deneniyor…'); });
  hideBusy();
  logs = [];
  pushState();
}

/* =====================================================================
   OYUNCU (istemci mantığı)
   ===================================================================== */
async function joinLobby(raw) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const err = $('menuErr');
  if (c.length !== 5) { err.textContent = 'Lobi kodu 5 haneli olmalı.'; err.classList.remove('hidden'); return; }
  err.classList.add('hidden');
  showBusy('Lobiye bağlanılıyor…');
  teardown();
  showBusy('Lobiye bağlanılıyor…');
  let p;
  try { p = await openPeer(); }
  catch (e) { goMenu('Bağlantı kurulamadı (' + ((e && e.type) || 'ağ') + ').'); return; }
  peer = p; isHost = false; gone = false; code = c;
  const fail = m => goMenu(m);
  peer.on('error', e => {
    if (e && e.type === 'peer-unavailable') fail('Bu kodla bir lobi bulunamadı 😕');
    else if (!gone) fail('Bağlantı hatası: ' + ((e && e.type) || 'bilinmiyor'));
  });
  joinTimer = setTimeout(() => fail('Lobiye ulaşılamadı. Kod doğru mu? Ev sahibi hâlâ sayfada mı?'), 15000);
  conn = peer.connect(PREFIX + c, { reliable: true });
  conn.on('open', () => send(conn, { t: 'join', name: me.name }));
  conn.on('data', onClientMsg);
  conn.on('close', () => { if (!gone && peer) { gone = true; infoDialog('Bağlantı koptu', 'Lobi ile bağlantı kesildi.', () => goMenu()); } });
}
function onClientMsg(m) {
  if (!m || typeof m.t !== 'string') return;
  switch (m.t) {
    case 'welcome': clearTimeout(joinTimer); me.id = m.you; hideBusy(); logs = []; break;
    case 'deny': gone = true; goMenu(String(m.why || 'Katılamadın.')); break;
    case 'state': S = m.s; off = (S.now || Date.now()) - Date.now(); render(); break;
    case 'ev': handleEv(m.ev || {}); break;
    case 'kicked': gone = true; goMenu('Lobi sahibi seni lobiden çıkardı.'); break;
    case 'closed': if (!gone) { gone = true; infoDialog('Lobi kapandı', 'Lobi sahibi oyundan ayrıldı.', () => goMenu()); } break;
  }
}
function act(msg) {
  if (!S) return;
  if (isHost) {
    if (msg.t === 'guess') guessLetter('host', msg.l);
    else if (msg.t === 'word') guessWord('host', msg.w);
  } else if (conn) send(conn, msg);
}

/* =====================================================================
   ORTAK: olaylar ve ekran çizimi
   ===================================================================== */
function handleEv(ev) {
  if (ev.reset) logs = [];
  if (ev.m) { logs.push({ k: ev.k || 'sys', m: ev.m }); if (logs.length > 40) logs.shift(); renderLog(); }
  if (ev.id && ev.pts) { floats[ev.id] = { t: '+' + ev.pts, u: Date.now() + 1600 }; setTimeout(() => S && renderBoard(), 1700); }
  if (ev.fx) {
    if (SFX[ev.fx]) SFX[ev.fx]();
    if (ev.fx === 'win' || ev.fx === 'end') confetti(ev.fx === 'end' ? 160 : 90);
  }
}
function render() {
  if (!S) return;
  const want = S.phase === 'lobby' ? 'scr-lobby' : S.phase === 'gameEnd' ? 'scr-end' : 'scr-game';
  showScreen(want);
  if (S.phase === 'lobby') renderLobby();
  else if (S.phase === 'gameEnd') renderEnd();
  else renderGame();

  if (S.phase === 'roundEnd') {
    if (shownEnd !== S.round) { shownEnd = S.round; showEndModal(); }
    else { const el = $('endMeaning'); if (el) el.textContent = S.hint ? '💡 ' + S.hint : ''; }
  } else closeModal('end');
  if (S.phase !== 'playing') closeModal('wg');
}

/* ----- Lobi ----- */
function renderLobby() {
  $('lobCode').textContent = S.code;
  $('lobCount').textContent = `${S.players.length}/${MAX_PLAYERS}`;
  $('plist').innerHTML = S.players.map(p => `
    <li>
      <span class="av" style="--c:${PALETTE[p.ci % PALETTE.length]}">${esc(trUp([...p.name][0] || '?'))}</span>
      <span class="nm">${esc(p.name)}</span>
      ${p.id === 'host' ? '<span class="tag">👑 sahip</span>' : ''}
      ${p.id === me.id ? '<span class="tag you">sen</span>' : ''}
      ${isHost && p.id !== 'host' ? `<button class="kick" data-kick="${esc(p.id)}" title="Çıkar">✕</button>` : ''}
    </li>`).join('');
  const rows = [
    ['rounds', 'Tur sayısı', '', [[3, '3'], [5, '5'], [8, '8']]],
    ['lives', 'Can (yanlış hakkı)', 'Takım olarak', [[6, '6'], [8, '8'], [10, '10']]],
    ['mode', 'Oyun şekli', S.set.mode === 'turn' ? 'Sırayla, 25 sn süre' : 'Herkes aynı anda tahmin eder', [['free', '⚡ Serbest'], ['turn', '🔄 Sıralı']]],
    ['source', 'Kelimeler', S.set.source === 'tdk' ? "TDK sözlüğünden rastgele (zor!)" : 'Seçme kelimeler + TDK ipucu', [['list', '📖 Hazır'], ['tdk', '🇹🇷 TDK']]]
  ];
  $('settings').classList.toggle('locked', !isHost);
  $('settings').innerHTML = rows.map(([k, label, why, opts]) => `
    <div class="set-row">
      <label>${label}${why ? `<span class="why">${why}</span>` : ''}</label>
      <div class="seg">${opts.map(([v, t]) => `<button data-k="${k}" data-v="${v}" class="${S.set[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div>
    </div>`).join('');
  $('settingNote').textContent = isHost ? 'Ayarlar herkese anında yansır.' : 'Ayarları sadece lobi sahibi değiştirebilir.';
  $('startBtn').classList.toggle('hidden', !isHost);
  $('waitNote').classList.toggle('hidden', isHost);
}

/* ----- Oyun ----- */
const kbEl = $('kb');
ALPHABET.forEach(l => {
  const b = document.createElement('button');
  b.className = 'key'; b.textContent = l; b.dataset.l = l; b.type = 'button';
  kbEl.appendChild(b);
});
function wrongStages(w, n) {
  if (!w) return 0;
  if (w >= n) return 7;
  return Math.min(7, Math.ceil(w * 7 / n));
}
function renderGame() {
  const playing = S.phase === 'playing';
  const myTurn = S.turnId === me.id;
  $('gRound').textContent = `Tur ${S.round}/${S.set.rounds}`;
  const src = S.src || S.set.source;
  $('gChips').innerHTML =
    `<span class="chip">${S.set.mode === 'turn' ? '🔄 Sıralı' : '⚡ Serbest'}</span>` +
    `<span class="chip">${src === 'tdk' ? '🇹🇷 TDK sözlüğü' : '📖 Hazır kelime'}</span>` +
    `<span class="chip">👥 ${S.players.filter(p => p.on).length}</span>`;
  let hearts = '';
  for (let i = 0; i < S.set.lives; i++) hearts += `<span class="${i < S.set.lives - S.wrongN ? '' : 'gone'}">❤️</span>`;
  $('gLives').innerHTML = hearts;

  // darağacı
  const g = $('gallows'), stages = wrongStages(S.wrongN, S.set.lives);
  g.querySelectorAll('.part').forEach(el => {
    const i = +el.dataset.i;
    el.classList.toggle('on', i < 3 || i - 3 < stages);
  });
  const ended = S.phase === 'roundEnd';
  g.classList.toggle('dead', ended && S.res && !S.res.won);
  g.classList.toggle('won', ended && S.res && S.res.won);
  if (S.round === prevRound && S.wrongN > prevWrong && playing) { g.classList.remove('hit'); void g.getBoundingClientRect(); g.classList.add('hit'); setTimeout(() => g.classList.remove('hit'), 520); }
  prevWrong = S.wrongN;
  $('wrongLetters').textContent = S.wrong.join(' ');

  // kelime
  const same = S.round === prevRound && prevMask.length === S.mask.length;
  const wordEl = $('word');
  if (S.phase === 'picking') wordEl.innerHTML = '<span class="hint">Kelime seçiliyor…</span>';
  else {
    wordEl.innerHTML = S.mask.map((c, i) => {
      if (c) return `<span class="slot filled" ${same && prevMask[i] ? 'style="animation:none"' : ''}>${esc(c)}</span>`;
      if (ended && S.word) return `<span class="slot miss">${esc(S.word[i] || '')}</span>`;
      return '<span class="slot"></span>';
    }).join('');
  }
  prevMask = S.mask.slice(); prevRound = S.round;

  // ipucu
  let h = '';
  if (S.phase !== 'picking') {
    h = (S.cat ? `Kategori: <b>${esc(S.cat)}</b> · ` : '') + `<b>${S.len}</b> harf`;
    if (S.hint) h += `<br>💡 <b>TDK:</b> ${esc(S.hint)}`;
    else if (S.hasHint) h += `<br>💡 TDK ipucu ${Math.max(1, S.hintAt - S.wrongN)} yanlıştan sonra açılır`;
  }
  $('hint').innerHTML = h;

  // sıra bilgisi
  const tb = $('turnBanner');
  if (playing && S.set.mode === 'turn') {
    const tp = S.players.find(p => p.id === S.turnId);
    tb.textContent = myTurn ? '🎯 Sıra sende!' : `Sıra: ${tp ? tp.name : '…'}`;
    tb.classList.toggle('mine', myTurn);
  } else if (playing) { tb.textContent = '⚡ Herkes aynı anda tahmin edebilir'; tb.classList.remove('mine'); }
  else { tb.textContent = ''; tb.classList.remove('mine'); }
  if (myTurn && lastTurn !== me.id) SFX.turn();
  lastTurn = S.turnId;

  // klavye
  const canPlay = playing && (S.set.mode !== 'turn' || myTurn);
  kbEl.querySelectorAll('.key').forEach(b => {
    const l = b.dataset.l, isRight = S.mask.includes(l), isWrong = S.wrong.includes(l);
    b.classList.toggle('correct', isRight);
    b.classList.toggle('wrong', isWrong);
    b.classList.toggle('wait', playing && !canPlay);
    b.disabled = !canPlay || isRight || isWrong;
  });
  $('wordBtn').disabled = !canPlay;
  renderBoard();
  renderLog();
}
function renderBoard() {
  if (!S) return;
  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  $('board').innerHTML = sorted.map(p => {
    const f = floats[p.id], pm = f && f.u > Date.now() ? `<span class="pm">${esc(f.t)}</span>` : '';
    return `<li class="${p.id === me.id ? 'me' : ''} ${p.id === S.turnId ? 'turn' : ''} ${p.on ? '' : 'off'}">
      <span class="av" style="--c:${PALETTE[p.ci % PALETTE.length]}">${esc(trUp([...p.name][0] || '?'))}</span>
      <span class="nm">${esc(p.name)}</span>${pm}<span class="sc">${p.score}</span></li>`;
  }).join('');
}
function renderLog() {
  $('log').innerHTML = logs.map(l => `<li class="${l.k}">${esc(l.m)}</li>`).join('');
}
function showEndModal() {
  const won = S.res && S.res.won;
  const last = S.round >= S.set.rounds;
  showModal(`
    <h3>${won ? '🎉 Kelime bulundu!' : '💀 Adam asıldı…'}</h3>
    <p>${won ? esc(S.res.byName) + ' kelimeyi tamamladı.' : 'Canlar tükendi. Kelime:'}</p>
    <div class="big-word">${esc(S.word)}</div>
    <p class="tiny" id="endMeaning">${S.hint ? '💡 ' + esc(S.hint) : ''}</p>
    <p class="tiny">${last ? 'Final sonuçları birazdan…' : 'Sonraki tur birazdan başlıyor…'}</p>
    ${isHost ? '<div class="row"><button class="btn" id="skipBtn">Devam ▶</button></div>' : ''}`, 'end');
  const sk = $('skipBtn'); if (sk) sk.onclick = () => afterRound();
}

/* ----- Sonuç ----- */
function renderEnd() {
  const sorted = [...S.players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  const pods = sorted.slice(0, 3).map((p, i) => ({ p, i }));
  const order = [pods[1], pods[0], pods[2]].filter(Boolean);
  $('podium').innerHTML = order.map(({ p, i }) => `
    <div class="pod p${i + 1}">
      <div class="medal">${medals[i]}</div>
      <div class="nm">${esc(p.name)}</div>
      <div class="sc">${p.score} puan</div>
      <div class="step">${i + 1}</div>
    </div>`).join('');
  $('rest').innerHTML = sorted.slice(3).map(p => `<li><span class="nm">${esc(p.name)}</span><span class="sc">${p.score}</span></li>`).join('');
  $('againBtn').classList.toggle('hidden', !isHost);
  $('againWait').classList.toggle('hidden', isHost);
}

/* ---------------- Süre çubuğu ---------------- */
setInterval(() => {
  const wrap = $('turnBarWrap');
  if (!S || S.phase !== 'playing' || S.set.mode !== 'turn' || !S.turnEnds) { wrap.classList.add('hidden'); return; }
  const left = S.turnEnds - (Date.now() + off);
  const frac = clamp(left / S.turnMs, 0, 1);
  wrap.classList.remove('hidden');
  $('turnBar').style.transform = `scaleX(${frac})`;
  const sec = Math.ceil(left / 1000);
  if (S.turnId === me.id && sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; SFX.tick(); }
}, 150);

/* =====================================================================
   OLAYLAR (tıklamalar, klavye)
   ===================================================================== */
function sanitizeInputName(v) {
  return String(v || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
}
function submitName() {
  actx();
  const n = sanitizeInputName($('nameInput').value);
  if (!n) { toast('Önce bir takma ad yaz 🙂'); $('nameInput').focus(); return; }
  me.name = n;
  $('hello').textContent = n;
  if (pendingCode) { const c = pendingCode; pendingCode = ''; $('pendingNote').classList.add('hidden'); joinLobby(c); }
  else { showScreen('scr-menu'); $('menuErr').classList.add('hidden'); }
}
$('nameBtn').onclick = submitName;
$('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });
$('changeName').onclick = () => { $('nameInput').value = ''; showScreen('scr-name'); $('nameInput').focus(); };
$('createBtn').onclick = createLobby;
$('joinBtn').onclick = () => joinLobby($('codeInput').value);
$('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinLobby($('codeInput').value); });
$('codeInput').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

async function copyText(t, okMsg) {
  try { await navigator.clipboard.writeText(t); toast(okMsg); }
  catch (e) { window.prompt('Kopyala:', t); }
}
$('copyCode').onclick = () => copyText(code, 'Lobi kodu kopyalandı 📋');
$('copyLink').onclick = () => copyText(location.href.split('?')[0].split('#')[0] + '?lobi=' + code, 'Davet linki kopyalandı 🔗');
$('startBtn').onclick = () => { if (isHost) startGame(); };
$('againBtn').onclick = () => { if (isHost) backToLobby(); };

$('plist').addEventListener('click', e => {
  const b = e.target.closest('[data-kick]'); if (b && isHost) kick(b.dataset.kick);
});
$('settings').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]'); if (!b || !isHost) return;
  const v = b.dataset.v, k = b.dataset.k;
  setSetting(k, ['rounds', 'lives'].includes(k) ? +v : v);
});

function leaveFlow() {
  confirmDialog(isHost ? 'Lobiyi kapat?' : 'Ayrılmak istiyor musun?',
    isHost ? 'Sen ayrılırsan lobi herkes için kapanır.' : 'Lobiden ayrılacaksın.', 'Ayrıl', () => goMenu());
}
$('leaveLobby').onclick = leaveFlow;
$('leaveGame').onclick = leaveFlow;
$('leaveEnd').onclick = leaveFlow;

kbEl.addEventListener('click', e => {
  const b = e.target.closest('.key'); if (!b || b.disabled) return;
  SFX.key(); act({ t: 'guess', l: b.dataset.l });
});
document.addEventListener('keydown', e => {
  if (!S || S.phase !== 'playing' || modalKind || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''))) return;
  if (e.key.length !== 1) return;
  const l = e.key === 'I' ? 'I' : trUp(e.key);
  if (!ALPHABET.includes(l)) return;
  const b = kbEl.querySelector(`[data-l="${l}"]`);
  if (b && !b.disabled) { SFX.key(); act({ t: 'guess', l }); }
});

$('wordBtn').onclick = () => {
  showModal(`<h3>🎯 Kelimeyi tahmin et</h3>
    <p class="tiny">Yanlışsa bir can kaybedersin, doğruysa bol puan!</p>
    <input id="wgInput" type="text" maxlength="20" autocomplete="off" spellcheck="false" style="text-align:center;text-transform:uppercase;margin-top:.6rem">
    <div class="row"><button class="btn ghost" id="wgNo">Vazgeç</button><button class="btn alt" id="wgOk">Gönder</button></div>`, 'wg');
  const inp = $('wgInput'); inp.focus();
  const go = () => { const w = inp.value.trim(); if (!w) return; closeModal('wg'); act({ t: 'word', w }); };
  $('wgOk').onclick = go;
  $('wgNo').onclick = () => closeModal('wg');
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); if (e.key === 'Escape') closeModal('wg'); });
};

document.addEventListener('click', e => {
  if (e.target.closest('.btn,.link,.seg button')) SFX.click();
});

/* ses aç/kapat */
const muteBtn = $('muteBtn');
function paintMute() { muteBtn.textContent = muted ? '🔇' : '🔊'; }
paintMute();
muteBtn.onclick = () => {
  muted = !muted; paintMute();
  try { localStorage.setItem('as-muted', muted ? '1' : '0'); } catch (e) {}
  if (!muted) { actx(); SFX.click(); }
};

window.addEventListener('beforeunload', () => { if (isHost) broadcast({ t: 'closed' }); });

/* ---------------- Başlangıç: davet linki ---------------- */
(function init() {
  try {
    const c = (new URLSearchParams(location.search).get('lobi') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length === 5) {
      pendingCode = c;
      const n = $('pendingNote');
      n.textContent = `🔑 ${c} kodlu lobiye katılacaksın. Önce takma adını yaz!`;
      n.classList.remove('hidden');
    }
  } catch (e) {}
  $('nameInput').focus();
})();

})();
