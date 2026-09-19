# Leaderboard test harness

Loads the real `index.html` + `shared.js` in jsdom with a fake Apps Script backend and a small
fake crew, then taps through flows like a user. Not served by GitHub Pages; nothing here ships.

    cd Test && npm install && npm test

Runs in Oslo time (TZ=Europe/Oslo) so date edges behave like the crew's phones.

- `load.js` — boots the app, fakes fetch (GET returns the fixture, POSTs are recorded and persisted).
- `part1.test.js` — logging: send/attempt loggers, edit mode, mode switching, quick-log, crag find/add.
- `part2.test.js` — feed: joint/solo day cards, belayer lines, split/merge, sync/failed states, projects, logbook.
- `part3.test.js` — boards, capacity, profiles, breakdown page (incl. heatmap), location + peak pages.
