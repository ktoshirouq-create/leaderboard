const { load, iso } = require('./load');
const results = [];
const check = (name, cond, detail = '') => results.push({ name, ok: !!cond, detail });

const grey = h => h.$('#submit-log').classList.contains('not-ready');
const agrey = h => h.$('#attempt-submit').classList.contains('not-ready');
const openSend = async h => { h.ev('openLogger()'); await h.tick(10); };
const pick = async (h, sel) => { h.click(h.$(sel)); await h.tick(5); };
const fillSend = async (h, disc = 'Out Rope', where = 'Kolsås', grade = '6a') => {
  await pick(h, `#logger-discipline [data-disc="${disc}"]`);
  if (!h.$(`[data-where="${where}"]`)) throw new Error('where pill missing: ' + where);
  await pick(h, `[data-where="${where}"]`);
  await pick(h, `#logger-grade [data-grade="${grade}"]`);
};
const openAttempt = async h => { h.ev("lastLogMode='attempt'"); h.click(h.$('#fab')); await h.tick(10); };
const fillAttempt = async (h) => {
  await pick(h, '[data-adisc="Out Rope"]');
  await pick(h, '[data-awhere="Kolsås"]');
  await pick(h, '[data-agrade="6a"]');
  await pick(h, '[data-outcome="rests"]');
  await pick(h, '[data-bucket="1"]');
};

(async () => {
  // T1 basic send gate
  { const h = await load(); await openSend(h);
    check('T1 fresh send logger is grey', grey(h));
    await fillSend(h);
    check('T1 filled send logger is green', !grey(h));
    check('T1 no runtime errors', h.errors.length === 0, h.errors.join(' | ')); }

  // T2 grade via conversion table
  { const h = await load(); await openSend(h);
    await pick(h, '#logger-discipline [data-disc="Out Rope"]'); await pick(h, '[data-where="Kolsås"]');
    h.ev("openGradeConversionModal()"); await h.tick(10);
    const cell = h.$$('.grade-conv-pick').find(b => b.dataset.rung === '6a'); h.click(cell); await h.tick(10);
    check('T2 grade picked in conversion table → green', !grey(h) && h.ev('LoggerState.grade') === '6a'); }

  // T3 new crag via Find/add → Save
  { const h = await load(); await openSend(h);
    await pick(h, '#logger-discipline [data-disc="Out Rope"]'); await pick(h, '#logger-grade [data-grade="6a"]');
    await pick(h, '[data-where-find]');
    const inp = h.$('#where-add-input'); inp.value = 'Brand New Crag'; inp.dispatchEvent(new h.w.Event('input', { bubbles: true }));
    const save = h.$('#where-add-save'); save.disabled = false; h.click(save); await h.tick(900);
    check('T3 new crag saved + selected → green', h.ev('LoggerState.where') === 'Brand New Crag' && !grey(h), `where=${h.ev('LoggerState.where')} grey=${grey(h)}`); }

  // T4 edit mode
  { const h = await load(); h.ev("openLoggerInEditMode(State.logs.find(l=>l.LogId==='L1'))"); await h.tick(10);
    check('T4 edit mode button not grey', !grey(h));
    await pick(h, '#logger-grade [data-grade="6a+"]');
    h.click(h.$('#submit-log')); await h.tick(50);
    const p = h.posts.find(x => x.action === 'editLog');
    check('T4 editLog posted with new grade + original crag', p && p.grade === '6a+' && p.where === 'Kolsås' && p.logId === 'L1', JSON.stringify(p));
    await openSend(h);
    check('T4 next open is create mode, grey', !h.ev('editingLogId') && grey(h) && h.$('#submit-log').textContent === 'Log it'); }

  // T5 double tap Log it
  { const h = await load(); await openSend(h); await fillSend(h);
    h.click(h.$('#submit-log')); h.click(h.$('#submit-log')); await h.tick(80);
    const n = h.posts.filter(x => x.action === 'logSend').length;
    check('T5 double tap logs once', n === 1, `logSend posts: ${n}`); }

  // T6 send → attempt carry, incl. date
  { const h = await load(); await openSend(h); await fillSend(h);
    await pick(h, '#logger-date [data-date="yesterday"]');
    h.ev("switchLogMode('attempt')"); await h.tick(20);
    check('T6 carry disc/where/grade into attempt', h.ev('AttemptState.discipline') === 'Out Rope' && h.ev('AttemptState.where') === 'Kolsås' && h.ev('AttemptState.grade') === '6a');
    const shownDate = (h.$('#attempt-date .pill.active') || {}).dataset?.adate;
    check('T6 carried date matches the date pill shown', shownDate === h.ev('AttemptState.date'), `state=${h.ev('AttemptState.date')} pill=${shownDate}`);
    check('T6 attempt grey until outcome/count', agrey(h)); }

  // T6b custom date carry
  { const h = await load(); await openSend(h); await fillSend(h);
    await pick(h, '#logger-date [data-date="custom"]'); h.$('#logger-date-custom').value = iso(10);
    h.ev("switchLogMode('attempt')"); await h.tick(20);
    await pick(h, '[data-outcome="rests"]'); await pick(h, '[data-bucket="1"]');
    h.click(h.$('#attempt-submit')); await h.tick(50);
    const p = h.posts.find(x => x.action === 'logAttempt');
    check('T6b custom date survives the switch to attempt', p && p.date === iso(10), `posted date ${p && p.date}, expected ${iso(10)}`); }

  // T7 attempt full + double tap
  { const h = await load(); await openAttempt(h);
    check('T7 fresh attempt grey', agrey(h));
    await fillAttempt(h);
    check('T7 filled attempt green', !agrey(h));
    h.click(h.$('#attempt-submit')); h.click(h.$('#attempt-submit')); await h.tick(80);
    const ps = h.posts.filter(x => x.action === 'logAttempt');
    check('T7 attempt double tap logs once', ps.length === 1, `posts ${ps.length}`);
    check('T7 attempt payload fields', ps[0] && ps[0].climber === 'Jack' && ps[0].where === 'Kolsås' && ps[0].grade === '6a', JSON.stringify(ps[0])); }

  // T8 switcher from attempt logger
  { const h = await load(); await openAttempt(h); await fillAttempt(h);
    check('T8 attempt label shows user', h.$('#attempt-active-user-label').textContent === 'Jack');
    h.click(h.$('#attempt-switcher-trigger')); await h.tick(10);
    const winnie = h.$$('#switcher-pills .pill').find(b => b.textContent.trim() === 'Winnie'); h.click(winnie); await h.tick(30);
    check('T8 label updates to Winnie', h.$('#attempt-active-user-label').textContent === 'Winnie');
    check('T8 attempt sheet still open after switch', h.$('#session-modal').classList.contains('active'));
    const g = agrey(h), ready = h.ev('canLogAttempt()');
    check('T8 button state matches gate after switch', g === !ready, `grey=${g} ready=${ready}`); }

  // T9 project Sent it
  { const h = await load(); h.ev("openLoggerForProject('Out Rope','Kolsås','6a','Proj')"); await h.tick(10);
    check('T9 project → send logger green', !grey(h)); }

  // T10 continuation open after logging today
  { const h = await load(); await openSend(h); await fillSend(h); h.click(h.$('#submit-log')); await h.tick(400);
    await openSend(h);
    const ready = h.ev('canLogSend()');
    check('T10 reopen mid-session: button matches gate', grey(h) === !ready, `grey=${grey(h)} ready=${ready} disc=${h.ev('LoggerState.discipline')} where=${h.ev('LoggerState.where')} grade=${h.ev('LoggerState.grade')}`); }

  // T11 discipline change drops invalid grade
  { const h = await load(); await openSend(h); await fillSend(h, 'Out Rope', 'Kolsås', '5-');
    await pick(h, '#logger-discipline [data-disc="In Rope"]');
    check('T11 switching to a ladder without that grade → grey', grey(h) === !h.ev('canLogSend()') && grey(h)); }

  // T12 search-picked crag not tagged for discipline
  { const h = await load(); await openSend(h); await pick(h, '#logger-discipline [data-disc="Out Rope"]');
    await pick(h, '[data-where-find]'); await h.tick(150);
    const inp = h.$('#where-add-input'); inp.focus(); inp.value = 'hauk'; inp.dispatchEvent(new h.w.Event('input', { bubbles: true })); await h.tick(5);
    const sug = h.$$('#loc-suggest-logger [data-lname]').find(b => /Hauktjern/.test(b.textContent));
    if (sug) sug.dispatchEvent(new h.w.Event('pointerdown', { bubbles: true, cancelable: true }));
    await h.tick(20);
    check('T12 searched crag (other discipline) stays selected', !!sug && h.ev('LoggerState.where') === 'Hauktjern' && !!h.$('[data-where="Hauktjern"].active'), `sug=${!!sug} where=${h.ev('LoggerState.where')}`); }

  // T13 close + reopen
  { const h = await load(); await openSend(h); await fillSend(h);
    h.ev("closeModal('logger-modal')"); await h.tick(50); await openSend(h);
    check('T13 reopen without logging → blank + grey', !h.ev('LoggerState.grade') && grey(h), `grade=${h.ev('LoggerState.grade')}`); }

  // T14 attempt → send carry
  { const h = await load(); await openAttempt(h); await fillAttempt(h);
    h.ev("switchLogMode('send')"); await h.tick(20);
    check('T14 attempt → send carries and is green', h.ev('LoggerState.where') === 'Kolsås' && !grey(h)); }

  // T15 edit then cancel leaves no edit residue
  { const h = await load(); h.ev("openLoggerInEditMode(State.logs.find(l=>l.LogId==='L1'))"); await h.tick(10);
    h.ev("closeModal('logger-modal')"); await h.tick(50); await openSend(h);
    check('T15 cancel edit → next open is blank create', !h.ev('editingLogId') && !h.ev('LoggerState.grade') && h.$('#submit-log').textContent === 'Log it', `grade=${h.ev('LoggerState.grade')}`); }

  // T16 failed save keeps retry
  { const h = await load({ postReply: b => b.action === 'logSend' ? { ok: false, error: 'boom' } : null });
    await openSend(h); await fillSend(h); h.click(h.$('#submit-log')); await h.tick(80);
    check('T16 failed send marked for retry', h.ev("State.logs.some(l => l._failed)")); }


  // T17 edit: discipline change must not save a blank grade (climb would vanish)
  { const { fixture } = require('./load'); const d = fixture(); d.logs[0].Grade = '5-';
    const h = await load({ data: d }); h.ev("openLoggerInEditMode(State.logs.find(l=>l.LogId==='L1'))"); await h.tick(10);
    await pick(h, '#logger-discipline [data-disc="In Rope"]');
    h.click(h.$('#submit-log')); await h.tick(50);
    const p = h.posts.find(x => x.action === 'editLog');
    check('T17 edit never posts a blank grade/crag', !p || (p.grade && p.where), JSON.stringify(p)); }

  // T18 edit: switching outdoor → indoor must not keep the crag
  { const h = await load(); h.ev("openLoggerInEditMode(State.logs.find(l=>l.LogId==='L1'))"); await h.tick(10);
    await pick(h, '#logger-discipline [data-disc="In Rope"]');
    check('T18 edit: crag not carried into a gym discipline', h.ev('LoggerState.where') !== 'Kolsås', `where=${h.ev('LoggerState.where')}`); }

  // T19 boulder send must not carry a rope belayer
  { const h = await load(); await openSend(h);
    await pick(h, '#logger-discipline [data-disc="Out Rope"]');
    h.ev("LoggerState.belayer = 'Pål'");
    await pick(h, '#logger-discipline [data-disc="In Boulder"]'); await pick(h, '[data-where="Torshov"]');
    h.click(h.$('#logger-grade [data-grade]')); await h.tick(5);
    h.click(h.$('#submit-log')); await h.tick(50);
    const p = h.posts.find(x => x.action === 'logSend');
    check('T19 boulder send posts no belayer', p && p.belayer === '', JSON.stringify(p && p.belayer)); }

  // T20 editing an attempt keeps its belayer
  { const h = await load(); h.ev("openModal('session-modal'); openAttemptPaneInEditMode(State.attempts[0])"); await h.tick(10);
    h.click(h.$('#attempt-submit')); await h.tick(50);
    const p = h.posts.find(x => x.action === 'editAttempt');
    check('T20 attempt edit keeps belayer Pål', p && p.belayer === 'Pål', JSON.stringify(p && p.belayer)); }

  // T21 quick-log multi: one failure must not hide the ones that saved
  { let n = 0; const h = await load({ postReply: b => b.action === 'logSend' ? (++n === 2 ? { ok: false, error: 'x' } : { ok: true, logId: 'q' + n }) : null });
    h.ev("qkWrite([qkRowFrom(State.logs[1],'Send'), qkRowFrom(State.logs[4],'Send'), qkRowFrom(State.logs[3],'Send')])"); await h.tick(150);
    const mine = h.ev("State.logs.filter(l => l.ClimberName==='Jack' && (String(l.LogId).startsWith('q'))).length");
    check('T21 quick-log partial failure keeps the 2 saved climbs visible', mine >= 2, `visible new rows: ${mine}`); }

  // T22 failed attempt comes back filled in
  { const h = await load({ postReply: b => b.action === 'logAttempt' ? { ok: false, error: 'boom' } : null });
    await openAttempt(h); await fillAttempt(h); h.$('#attempt-note').value = 'fell at crux';
    h.click(h.$('#attempt-submit')); await h.tick(120);
    check('T22 failed attempt reopens with everything filled', h.$('#session-modal').classList.contains('active')
      && h.ev('AttemptState.where') === 'Kolsås' && h.ev('AttemptState.countBucket') === '1' && h.$('#attempt-note').value === 'fell at crux' && !agrey(h),
      `open=${h.$('#session-modal').classList.contains('active')} where=${h.ev('AttemptState.where')}`); }

  // T23 discipline row: one scrolling line, all disciplines, no Other; selected first on open, no jump on tap
  { const h = await load(); await openSend(h);
    const row = h.$('#logger-discipline');
    const pills = () => [...row.querySelectorAll('[data-disc]')].map(b => b.dataset.disc);
    check('T23 discipline row scrolls on one line with all 5', row.classList.contains('scroll') && pills().length === 5 && !row.querySelector('.disc-other'), JSON.stringify(pills()));
    const before = pills(); const last = before[before.length - 1];
    await pick(h, `#logger-discipline [data-disc="${last}"]`);
    check('T23 tapping highlights in place (no reorder)', JSON.stringify(pills()) === JSON.stringify(before) && h.$(`#logger-discipline [data-disc="${last}"]`).classList.contains('active'));
    h.ev('renderDisciplinePills()');
    check('T23 re-render puts the selected discipline first', pills()[0] === last);
    await openAttempt(h);
    const arow = h.$('#attempt-discipline');
    check('T23 attempt discipline row matches', arow.classList.contains('scroll') && arow.querySelectorAll('[data-adisc]').length === 5); }

  const pad = s => s.padEnd(62);
  results.forEach(r => console.log((r.ok ? 'PASS ' : 'FAIL ') + pad(r.name) + (r.ok ? '' : r.detail)));
  console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`);
  process.exit(0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(1); });
