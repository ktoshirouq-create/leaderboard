// Part 3 — boards, capacity, profile stats, secret stats (breakdown), location + peak pages.
// Run with TZ=Europe/Oslo to match the crew's phones.
const { load, fixture, iso } = require('./load');
const results = [];
const check = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });
const ts = (d, h = 18) => new Date(d + `T${String(h).padStart(2, '0')}:00:00`).toISOString();

function data3() {
  const d = fixture();
  const add = (id, who, disc, where, grade, style, ago, extra = {}) =>
    d.logs.push({ LogId: id, Timestamp: ts(iso(ago)), ClimberName: who, Discipline: disc, Where: where, Grade: grade, Style: style, Date: iso(ago), RouteName: '', Belayer: '', ...extra });
  // Tomas: TR 7a (must not count on Hardest), lead 6c
  add('T1', 'Tomas', 'In Rope', 'OKS', '7a', 'Top-rope', 2);
  add('T2', 'Tomas', 'In Rope', 'OKS', '6c', 'Send', 4);
  // Capacity: Jack 5 In Rope lead sends in 90 days, Tomas 4
  ['6a', '6a+', '6b', '6b+', '6c'].forEach((g, i) => add('CJ' + i, 'Jack', 'In Rope', 'OKS', g, 'Send', 10 + i * 7));
  ['6a', '6a', '6b', '6b'].forEach((g, i) => add('CT' + i, 'Tomas', 'In Rope', 'OKS', g, 'Send', 12 + i * 7));
  // Window edges
  add('E30', 'Pål', 'Out Rope', 'Kolsås', '7b', 'Send', 30);   // exactly 30 days ago → still inside "last 30 days"
  add('E31', 'Pål', 'Out Rope', 'Kolsås', '7c', 'Send', 31);   // 31 days ago → outside
  // Attempt-only outdoor day for Winnie
  d.attempts.push({ AttemptId: 'AW', Timestamp: ts(iso(6)), ClimberName: 'Winnie', Discipline: 'Out Rope', Where: 'Kolsås', Grade: '6a', Outcome: 'falls', CountBucket: '1', Date: iso(6), RouteName: 'X', Belayer: 'Jack', Notes: '' });
  return d;
}

(async () => {
  // B1 Hardest
  { const h = await load({ data: data3() });
    const rows = h.ev('computeHardest()');
    const tomas = rows.find(r => r.climber === 'Tomas');
    check('B1 Hardest ignores top-rope (Tomas = 6c, not TR 7a)', tomas && tomas.grade === '6c', JSON.stringify(tomas));
    const pal = rows.find(r => r.climber === 'Pål');
    check('B1 a send exactly 30 days ago counts in "last 30 days"', pal && pal.grade === '7b', JSON.stringify(pal));
    check('B1 a send 31 days ago does not', !(pal && pal.grade === '7c'));
    h.ev("activeSpecialBoard='hardest'; renderSpecialBoard()");
    check('B1 Hardest board renders rows', h.$$('#special-board .lb-row, #special-board [data-climber]').length >= 3, h.$('#special-board').innerHTML.slice(0, 120));
    check('B1 no runtime errors', h.errors.length === 0, h.errors.join(' | ')); }

  // B2 count boards + hot spots render for every tab
  { const h = await load({ data: data3() });
    for (const b of ['hardest', 'hotspots', 'addicted', 'outdoor']) {
      h.ev(`activeSpecialBoard='${b}'; renderSpecialBoard()`);
      check(`B2 ${b} board renders without errors`, h.errors.length === 0 && h.$('#special-board').innerHTML.length > 50, h.errors.join(' | '));
    } }

  // B3 capacity board
  { const h = await load({ data: data3() });
    const cap = h.ev("computeCapacity('In Rope','lead')");
    const jack = cap.ranked.find(r => r.climber === 'Jack'), tomas = cap.ranked.find(r => r.climber === 'Tomas');
    check('B3 capacity ranks climbers with ≥4 lead sends', !!jack && !!tomas, JSON.stringify(cap.ranked.map(r => r.climber)));
    check('B3 capacity: Jack above Tomas', jack && tomas && jack.rank < tomas.rank);
    const tr = h.ev("computeCapacity('In Rope','tr')");
    check('B3 TR capacity only counts top-ropes', !tr.ranked.length && tr.warming.some(w => w.climber === 'Tomas')); }

  // B4 every profile + breakdown renders for every climber, including one with nothing logged
  { const d = data3(); d.roster.push({ Name: 'Newbie' });
    const h = await load({ data: d });
    for (const c of ['Jack', 'Winnie', 'Tomas', 'Pål', 'Newbie']) {
      h.errors.length = 0;
      h.ev(`showProfile('${c}')`); await h.tick(20);
      check(`B4 profile renders: ${c}`, h.errors.length === 0, h.errors.join(' | '));
      h.errors.length = 0;
      h.ev(`showSecretStats('${c}')`); await h.tick(20);
      for (const w of ['30', '90', '365', 'all']) { h.ev(`secretWindow='${w}'; renderSecretStats()`); }
      for (const env of [...h.$$('#secret-env .seg-item')]) { h.click(env); await h.tick(5); }
      check(`B4 breakdown renders (all windows/envs): ${c}`, h.errors.length === 0, h.errors.join(' | '));
    } }

  // B5 Activity (days per week): bars per week, numbers said, attempt days count, tap names the week
  { const h = await load({ data: data3() });
    h.ev("showSecretStats('Winnie')"); await h.tick(20);
    h.ev("secretEnv='all'; renderSecretStats()");
    const cols = h.$$('#secret-heatmap .aw-col');
    const blocks = h.$$('#secret-heatmap .aw-col i:not(.aw-none)').length;
    const days = new Set(h.ev("[...State.logs, ...State.attempts].filter(l=>l.ClimberName==='Winnie').map(l=>getCleanDate(l.Date))")).size;
    check('B5 one block per day out (projecting days included)', blocks === days, `${blocks} blocks vs ${days} days`);
    check('B5 at least 16 weeks, at most a year', cols.length >= 16 && cols.length <= 53, `${cols.length} weeks`);
    const sum = h.$('#secret-heatmap .aw-sum').textContent.replace(/\s+/g, ' ');
    check('B5 summary line says the numbers', new RegExp(`${days} days out`).test(sum) && /a week/.test(sum) && /best week/.test(sum) && /longest gap/.test(sum), sum);
    h.click(cols[cols.length - 1]); await h.tick(5);
    check('B5 tapping a week names it', /^Week of/.test(h.$('#aw-week').textContent), h.$('#aw-week').textContent);
    check('B5 no runtime errors', h.errors.length === 0, h.errors.join(' | ')); }

  // B8 breakdown header: TR said as TR, flash rates agree, window matches the charts
  { const h = await load({ data: data3() });
    h.ev("showSecretStats('Tomas')"); await h.tick(20);
    h.ev("secretEnv='all'; secretWindow='30'; renderSecretStats()");
    const head = h.$('#secret-deltas .sd-head').textContent.replace(/\s+/g, ' ');
    check('B8 header counts TR separately', /4 sends · 1 TR/.test(head), head);
    const hdrFlash = (head.match(/(\d+)% flash/) || [])[1];
    const secFlash = h.$$('#secret-flash .histo-count').map(e => e.textContent.replace('%', '').trim());
    check('B8 one flash rate (header = discipline section when one discipline)', secFlash.length === 1 && secFlash[0] === hdrFlash, `header ${hdrFlash} vs section ${secFlash}`); }

  // B6 location pages + peak page
  { const h = await load({ data: data3() });
    for (const loc of ['Kolsås', 'OKS', 'Torshov', 'Hauktjern']) {
      h.errors.length = 0; h.ev(`showLocation('${loc}','feed')`); await h.tick(20);
      check(`B6 location page renders: ${loc}`, h.errors.length === 0, h.errors.join(' | '));
    }
    h.errors.length = 0; h.ev('showPeak()'); await h.tick(30);
    check('B6 peak page renders', h.errors.length === 0, h.errors.join(' | ')); }

  // B7 Most Addicted / Outdoor Days: a day you only worked a route still counts as a day out
  { const h = await load({ data: data3() });
    const add = h.ev("computeAddicted()").find(r => r.climber === 'Winnie');
    const out = h.ev("computeOutdoor()").find(r => r.climber === 'Winnie');
    const sendDays = new Set(h.ev("State.logs.filter(l=>l.ClimberName==='Winnie').map(l=>getCleanDate(l.Date))")).size;
    check('B7 Most Addicted counts attempt-only days', add && add.count === sendDays + 1, `${add && add.count} vs ${sendDays + 1}`);
    check('B7 Outdoor Days counts attempt-only outdoor days', out && out.count === 2, `${out && out.count}`); }

  const pad = s => s.padEnd(62);
  results.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + pad(r.name) + (r.ok ? '' : r.detail)));
  console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`);
  process.exit(0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(1); });
