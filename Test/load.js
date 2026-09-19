// Loads the real index.html + shared.js into jsdom with a fake Apps Script backend.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

function iso(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10); }

function fixture() {
  const ts = (d) => new Date(d + 'T18:00:00').toISOString();
  const logs = [
    { LogId: 'L1', Timestamp: ts(iso(1)), ClimberName: 'Jack', Discipline: 'Out Rope', Where: 'Kolsås', Grade: '6a', Style: 'Send', Date: iso(1), RouteName: 'R1', Belayer: 'Pål' },
    { LogId: 'L2', Timestamp: ts(iso(1)), ClimberName: 'Winnie', Discipline: 'Out Rope', Where: 'Kolsås', Grade: '5a', Style: 'Top-rope', Date: iso(1), RouteName: '', Belayer: 'Jack' },
    { LogId: 'L3', Timestamp: ts(iso(3)), ClimberName: 'Jack', Discipline: 'In Rope', Where: 'OKS', Grade: '6b+', Style: 'Send', Date: iso(3), RouteName: '', Belayer: '' },
    { LogId: 'L4', Timestamp: ts(iso(5)), ClimberName: 'Jack', Discipline: 'Trad', Where: 'Hauktjern', Grade: '5c', Style: 'Send', Date: iso(5), RouteName: '', Belayer: 'Tomas' },
    { LogId: 'L5', Timestamp: ts(iso(2)), ClimberName: 'Winnie', Discipline: 'In Boulder', Where: 'Torshov', Grade: '5', Style: 'Flash', Date: iso(2), RouteName: '', Belayer: '' },
  ];
  const attempts = [
    { AttemptId: 'A1', Timestamp: ts(iso(1)), ClimberName: 'Jack', Discipline: 'Out Rope', Where: 'Kolsås', Grade: '6a', Outcome: 'rests', CountBucket: '4+', Date: iso(1), RouteName: 'Proj', Belayer: 'Pål', Notes: '' },
  ];
  const roster = ['Jack', 'Winnie', 'Pål', 'Tomas'].map(Name => ({ Name }));
  const locations = [
    { Name: 'Kolsås', Type: 'crag', Disciplines: 'Out Rope,Trad' },
    { Name: 'Hauktjern', Type: 'crag', Disciplines: 'Trad' },
    { Name: 'Hyggen Vest', Type: 'crag', Disciplines: 'Out Rope' },
    { Name: 'OKS', Type: 'gym', Disciplines: 'In Rope' },
    { Name: 'Torshov', Type: 'gym', Disciplines: 'In Boulder,In Rope' },
  ];
  return { logs, attempts, roster, locations };
}

async function load(opts = {}) {
  const dir = opts.dir || process.env.APP_DIR || require('path').join(__dirname, '..');
  let html = fs.readFileSync(dir + '/index.html', 'utf8');
  const shared = fs.readFileSync(dir + '/shared.js', 'utf8');
  html = html.replace('<script src="shared.js"></script>', '<script>' + shared + '\n;window.AppConfig = AppConfig;</script>');
  const errors = [], posts = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const data = opts.data || fixture();
  const dom = new JSDOM(html, {
    url: 'https://example.github.io/leaderboard/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem('leaderboard.user', opts.user || 'Jack');
      Object.entries(opts.ls || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));
      w.navigator.vibrate = () => true;
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      w.Element.prototype.scrollIntoView = function () {}; w.scrollTo = () => {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.CSS = w.CSS || { escape: s => String(s).replace(/["\\]/g, '\\$&') };
      w.fetch = async (url, init) => {
        if (init && init.method === 'POST') {
          const body = JSON.parse(init.body); posts.push(body);
          const r = (opts.postReply && opts.postReply(body)) || { ok: true, logId: 'srv-' + posts.length, attemptId: 'srva-' + posts.length };
          // persist successful writes so a follow-up fetchData() sees them, like the real sheet
          if (r.ok && body.action === 'logSend') data.logs.push({ LogId: r.logId || ('srv-' + posts.length), Timestamp: new Date().toISOString(),
              ClimberName: body.climber, Discipline: body.discipline, Where: body.where, Grade: body.grade, Style: body.style,
              Date: body.date, RouteName: body.routeName || '', Belayer: body.belayer || '' });
          return { json: async () => r };
        }
        return { json: async () => ({ ok: true, data: JSON.parse(JSON.stringify(data)) }) };
      };
    }
  });
  const w = dom.window;
  await new Promise(r => setTimeout(r, 300));
  const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
  const $ = (sel) => w.document.querySelector(sel);
  const $$ = (sel) => [...w.document.querySelectorAll(sel)];
  const click = (el) => { if (!el) throw new Error('click: element missing'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const ev = (code) => w.eval(code);   // reach script-scope bindings (const/let)
  return { dom, w, $, $$, click, tick, ev, errors, posts };
}
module.exports = { load, fixture, iso };
