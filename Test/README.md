# Leaderboard test harness

Loads the real `index.html` + `shared.js` in jsdom with a fake Apps Script backend and a small
fake crew, then taps through flows like a user. Not served by GitHub Pages; nothing here ships.

    cd tests && npm install && npm test

- `load.js` — boots the app, fakes fetch (GET returns the fixture, POSTs are recorded and persisted).
- `part1.test.js` — logging: send/attempt loggers, edit mode, mode switching, quick-log, crag find/add.
