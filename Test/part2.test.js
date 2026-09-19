// Part 2 — feed cards (solo/joint/legacy), belayer lines, split/merge, projects, logbook.
const { load, fixture, iso } = require('./load');
const results = [];
const check = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });
const ts = (d, h = 18) => new Date(d + `T${String(h).padStart(2, '0')}:00:00`).toISOString();

function data2() {
  const d = fixture();
  // Jack day 1: Out Rope send (Pål) + Out Rope attempt (Pål) + Trad send → multi-section, joint with Winnie
  d.logs.push({ LogId: 'L6', Timestamp: ts(iso(1), 19), ClimberName: 'Jack', Discipline: 'Trad', Where: 'Kolsås', Grade: '5c', Style: 'Send', Date: iso(1), RouteName: 'T1', Belayer: 'Tomas' });
  // Jack solo multi-discipline day 3: In Rope (L3) + In Boulder
  d.logs.push({ LogId: 'L7', Timestamp: ts(iso(3), 19), ClimberName: 'Jack', Discipline: 'In Boulder', Where: 'Torshov', Grade: '6A', Style: 'Send', Date: iso(3), RouteName: '', Belayer: '' });
  // case-variant belayer on day 5
  d.logs.push({ LogId: 'L8', Timestamp: ts(iso(5), 19), ClimberName: 'Jack', Discipline: 'Trad', Where: 'Hauktjern', Grade: '5b', Style: 'Send', Date: iso(5), RouteName: '', Belayer: 'tomas ' });
  // project with a Sheets-coerced 2–3 count, regraded later
  d.attempts.unshift({ AttemptId: 'A2', Timestamp: ts(iso(8)), ClimberName: 'Jack', Discipline: 'Out Rope', Where: 'Kolsås', Grade: '6a', Outcome: 'falls', CountBucket: '2026-02-03T00:00:00.000Z', Date: iso(8), RouteName: 'Proj', Belayer: '', Notes: 'first go' });
  return d;
}
const cardOf = (h, re) => h.$$('.session-card').find(c => re.test(c.querySelector('.s-name')?.textContent || ''));
const longPress = async (h, el) => { el.dispatchEvent(new h.w.MouseEvent('mousedown', { bubbles: true })); await h.tick(h.ev('LONG_PRESS_MS') + 60); el.dispatchEvent(new h.w.MouseEvent('mouseup', { bubbles: true })); };

(async () => {
  // F1 joint card forms, header keeps outside belayers, excludes members, attempt belayers count
  { const h = await load({ data: data2() });
    const jc = cardOf(h, /Jack.*Winnie|Winnie.*Jack/);
    check('F1 Jack & Winnie joint card forms', !!jc);
    const t = jc ? jc.querySelector('.s-time').textContent : '';
    check('F1 joint header says with Pål (and Tomas)', /with/.test(t) && /Pål/.test(t) && /Tomas/.test(t), t);
    check('F1 joint header does not name Winnie (on the card)', !/Winnie/.test(t), t);
    check('F1 no runtime errors', h.errors.length === 0, h.errors.join(' | ')); }

  // F2 long-press on each of Jack's rows in the joint card opens the right climb
  { const h = await load({ data: data2() });
    h.ev("window.__sheet=[]; openActionSheet = log => window.__sheet.push(log.LogId); openAttemptActionSheet = a => window.__sheet.push(a.AttemptId);");
    const jc = cardOf(h, /Winnie/);
    const jack = jc.querySelector('.jc-climber[data-climber="Jack"]');
    const rows = [...jack.querySelectorAll('.jc-sends .send-row')];
    for (const r of rows) await longPress(h, r);
    const shown = rows.map(r => r.dataset.attemptId || (r.querySelector('.send-grade')?.textContent.trim()));
    const got = h.ev('window.__sheet');
    const expectIds = rows.map(r => r.dataset.attemptId || null);
    const logsById = h.ev("Object.fromEntries(State.logs.map(l=>[l.LogId,l.Grade]))");
    const ok = got.length === rows.length && got.every((id, i) => expectIds[i] ? id === expectIds[i] : logsById[id] === shown[i]);
    check('F2 joint card: every own row long-presses to its own climb', ok, `rows=${JSON.stringify(shown)} opened=${JSON.stringify(got)}`);
    const wRows = [...jc.querySelectorAll('.jc-climber[data-climber="Winnie"] .send-row')];
    h.ev('window.__sheet=[]'); for (const r of wRows) await longPress(h, r);
    check("F2 Winnie's rows are not editable by Jack", h.ev('window.__sheet').length === 0); }

  // F3 solo multi-discipline day: long-press maps rows → climbs
  { const h = await load({ data: data2() });
    h.ev("window.__sheet=[]; openActionSheet = log => window.__sheet.push(log.LogId);");
    const day3 = h.$$('.session-card.day-card').find(c => c.querySelector('[data-disc="In Boulder"]') && c.querySelector('[data-disc="In Rope"]'));
    check('F3 multi-discipline solo day renders as one day card', !!day3);
    if (day3) {
      const rows = [...day3.querySelectorAll('.session-children .send-row:not(.attempt-row)')];
      for (const r of rows) await longPress(h, r);
      const got = h.ev('window.__sheet'); const gradeOf = h.ev("Object.fromEntries(State.logs.map(l=>[l.LogId,l.Grade]))");
      check('F3 each row opens its own climb', got.length === rows.length && got.every((id, i) => gradeOf[id] === rows[i].querySelector('.send-grade').textContent.trim()), JSON.stringify(got)); } }

  // F4 belayer names de-duplicate across case/whitespace
  { const d = data2(); d.logs.push({ LogId: 'L9', Timestamp: ts(iso(5), 20), ClimberName: 'Jack', Discipline: 'Trad', Where: 'Hauktjern', Grade: '5a', Style: 'Send', Date: iso(5), RouteName: '', Belayer: 'Tomas' });
    const h = await load({ data: d });
    const c = h.$$('.session-card').find(x => /with/.test(x.querySelector('.s-time')?.textContent || '') && /Hauktjern/.test(x.textContent));
    const t = c ? c.querySelector('.s-time').textContent : '';
    check('F4 "Tomas" and "tomas " count as one belayer', c && !/&/.test(t), t); }

  // F5 split a joint day → solo cards with merge-back → merge restores it
  { const h = await load({ data: data2() });
    const g = h.ev("buildJointDays(buildDays(State.logs, State.attempts)).joint[0]");
    h.ev("openJointDaySplit(buildJointDays(buildDays(State.logs, State.attempts)).joint[0])"); await h.tick(10);
    h.click(h.$('#action-edit')); await h.tick(50);
    check('F5 split → no joint card for that day', !cardOf(h, /Winnie.*Jack|Jack.*Winnie/));
    const mb = h.$('.merge-back'); check('F5 split cards carry merge-back', !!mb);
    if (mb) { h.click(mb); await h.tick(20); }
    check('F5 merge-back restores the joint card', !!cardOf(h, /Winnie.*Jack|Jack.*Winnie/)); }

  // F6 logging a send on a day with attempts keeps the attempts visible while it syncs
  { let release; const gate = new Promise(r => (release = r));
    const h = await load({ data: data2(), postReply: null });
    h.w.fetch = (orig => async (url, init) => { if (init && init.method === 'POST') await gate; return orig(url, init); })(h.w.fetch);
    h.ev('openLogger()'); await h.tick(10);
    const p = async s => { h.click(h.$(s)); await h.tick(5); };
    await p('#logger-discipline [data-disc="Out Rope"]'); await p('[data-where="Kolsås"]'); await p('#logger-grade [data-grade="6b"]');
    // log it for yesterday so it lands on the joint day
    await p('#logger-date [data-date="yesterday"]');
    h.click(h.$('#submit-log')); await h.tick(30);
    const hasA1 = !!h.$('[data-attempt-id="A1"]');
    check('F6 while syncing, the day still shows the worked route', hasA1);
    check('F6 while syncing, Jack & Winnie stay one card', !!cardOf(h, /Winnie/) && /Jack/.test(cardOf(h, /Winnie/).querySelector('.s-name').textContent));
    release(); await h.tick(100); }

  // F7 a failed send doesn't hide the rest of that day
  { const h = await load({ data: data2(), postReply: b => b.action === 'logSend' ? { ok: false, error: 'x' } : null });
    h.ev('openLogger()'); await h.tick(10);
    const p = async s => { h.click(h.$(s)); await h.tick(5); };
    await p('#logger-discipline [data-disc="Out Rope"]'); await p('[data-where="Kolsås"]'); await p('#logger-grade [data-grade="6b"]');
    await p('#logger-date [data-date="yesterday"]');
    h.click(h.$('#submit-log')); await h.tick(100);
    check('F7 failed send: worked route still visible', !!h.$('[data-attempt-id="A1"]'));
    check('F7 failed send: Trad send still visible', h.$$('.send-row').some(r => /T1/.test(r.textContent)));
    check('F7 failed send: a retry affordance exists', h.$$('.session-card.failed').length >= 1); }

  // F8 projects page shows readable counts and latest grade
  { const d = data2(); d.attempts.find(a => a.AttemptId === 'A1').Grade = '6a+';  // later attempt regraded
    const h = await load({ data: d });
    h.ev("showProjects('Jack')"); await h.tick(20);
    const txt = h.$('#projects-list').textContent;
    check('F8 coerced 2–3 shows as 2–3, not a date', /2–3/.test(txt) && !/2026-02-03/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 200));
    const g = h.$('#projects-list .pj-g')?.textContent.trim();
    check('F8 project grade = latest attempt', g === '6a+', `shown ${g}`); }

  // F9 profile section and page agree on dismissed projects
  { const h = await load({ data: data2(), ls: { 'leaderboard.projHidden': '' } });
    const key = h.ev('PROJ_HIDE_KEY');
    h.ev(`localStorage.setItem(PROJ_HIDE_KEY, JSON.stringify({ 'proj|Kolsås': '${iso(0)}' }))`);
    h.ev("showProfile('Jack')"); await h.tick(20);
    const onProfile = /Proj/.test(h.$('#profile-projects').textContent.replace(/Show \d+ removed/, ''));
    h.ev("showProjects('Jack')"); await h.tick(20);
    const onPage = /Proj/.test(h.$('#projects-list').textContent);
    check('F9 a removed project is treated the same on profile and page', onProfile === onPage, `profile=${onProfile} page=${onPage}`); }

  // F10 logbook count resets for a climber with no logs
  { const h = await load({ data: data2() });
    h.ev("showProfile('Jack')"); await h.tick(20);
    h.ev("showProfile('Pål')"); await h.tick(20);
    const c = h.$('#logbook-count')?.textContent || '';
    check('F10 empty logbook does not keep the previous count', !/\d/.test(c), `count text "${c}"`); }

  // F11 load more pages without duplicates
  { const d = data2();
    for (let i = 10; i < 60; i++) d.logs.push({ LogId: 'X' + i, Timestamp: ts(iso(i)), ClimberName: 'Tomas', Discipline: 'In Rope', Where: 'OKS', Grade: '6a', Style: 'Send', Date: iso(i), RouteName: '', Belayer: '' });
    const h = await load({ data: d });
    const before = h.$$('.session-card').length;
    const lm = h.$('#feed-load-more'); if (lm) { h.click(lm); await h.tick(20); }
    const keys = h.$$('.session-card').map(c => c.dataset.dayKey || c.dataset.jointKey || c.dataset.idx);
    check('F11 load more adds cards, no duplicates', !!lm && keys.length > before && new Set(keys).size === keys.length, `${before} → ${keys.length}`); }

  const pad = s => s.padEnd(62);
  results.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + pad(r.name) + (r.ok ? '' : r.detail)));
  console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`);
  process.exit(0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(1); });
