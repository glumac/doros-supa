# Doros Desktop: Agentic Build Plan

A macOS desktop version of Doros (Crush Quest). It runs the **same web app, against the same
Supabase database, with the same features**. On top of that, Electron adds:

1. A red tomato in the macOS menu bar with the countdown drawn inside it.
2. Blocking of distracting websites while a focus session runs.

This plan is meant for a coding agent (Claude Code) to carry out phase by phase. Each phase has
tasks, a definition of done, and how to check it. Do the phases in order and commit after each one.
**Stop and hand off to the user** at every step marked 🧑. Those steps need `sudo`, a macOS
permission dialog, or the Supabase dashboard.

---

## 0. Decisions (already made, don't revisit)

| Topic | Decision | Why |
|---|---|---|
| Repo | **Inside `doros-supa`**, in a new top-level `electron/` folder. No workspaces and no monorepo. | The desktop window *is* the web app. Keeping both in one repo means one codebase, one feature set, and one set of types and queries. |
| Electron's role | A thin shell. The main process owns the **tray, the site blocker, OAuth deep links, and window lifecycle**. All Doros features stay in the React app. | Nothing gets duplicated, and new web features show up in the desktop app automatically. |
| What the window loads | Dev: `http://localhost:5173` (Vite). Packaged: the **live site `https://crush.quest`**. Both are set by `DOROS_URL`. | Avoids `file://` and `BrowserRouter` routing problems. The desktop app stays in sync with web deploys. Doros needs Supabase anyway, so there's no offline case to support. |
| Timer source of truth | **Stays in the React app** (the existing `CreateDoro` timer). The renderer pushes `{ endTime, pausedTimeLeft, isPaused, task }` to the main process over IPC. The main process draws the tray from that. | Logging a doro (task, image upload, Supabase insert) already works there. The tray is a view of that timer plus remote controls for it. |
| Bridge | A `preload` script exposes a small typed `window.doros` API (`contextIsolation: true`, `nodeIntegration: false`). The web app checks `if (window.doros)`. In a normal browser it's `undefined` and nothing changes. | One build serves the web and the desktop app. |
| Login | Google OAuth opens in the **system browser**, then comes back to the app through the deep link `doros://auth-callback`. The renderer calls `supabase.auth.setSession(...)`. | Google blocks OAuth sign-in inside embedded Electron windows. |
| Tomato and countdown | Render an SVG (tomato plus `MM:SS`) to PNG with `@resvg/resvg-js`, then `tray.setImage()` | macOS template images are monochrome, and the tomato must be red. |
| Website blocking | Edit `/etc/hosts` through a root-owned helper script allowed by a `sudoers.d` rule | Works in every browser and needs no extension. Blocking by IP with `pf` fails because these sites sit behind CDNs. |
| When to block | Only while a **focus** timer is running, plus a manual "Block sites now" toggle in the tray | Default Pomodoro behavior. |
| Closing the window | **Hides** it, so the timer keeps running in the hidden renderer. Quit is in the tray menu. | The tray needs the renderer to stay alive. |
| Scope | **Personal use, one Mac.** No signing, notarization, auto-update, or Windows/Linux support. | That's what was asked for. |

### Block list

```ts
// electron/blocklist.ts
export const BLOCKED_DOMAINS = [
  "insideevs.com", "www.insideevs.com",
  "electrek.co", "www.electrek.co",
  "macrumors.com", "www.macrumors.com", "forums.macrumors.com",
  "reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com",
  "np.reddit.com", "i.reddit.com", "m.reddit.com",
  "news.ycombinator.com",
];
```

---

## Architecture

```
doros-supa/
  src/                          # existing React app (web + desktop renderer)
    types/desktop.d.ts          # NEW: `window.doros?: DorosBridge` type
    lib/desktopBridge.ts        # NEW: isDesktop(), thin wrappers around window.doros
    hooks/useDesktopTimerSync.ts# NEW: pushes timer state to main, handles tray commands
    components/CreateDoro.tsx   # CHANGED: calls useDesktopTimerSync(timerState, actions)
    components/Login.tsx        # CHANGED: desktop path uses the system browser + deep link
  electron/                     # NEW: main process, compiled with tsc to electron-dist/
    tsconfig.json               # module: commonjs (or ESM), target node, outDir ../electron-dist
    main.ts                     # app lifecycle, window, tray, IPC, deep links
    preload.ts                  # contextBridge.exposeInMainWorld("doros", …)
    ipc.ts                      # channel names + payload types (shared with src/types/desktop.d.ts)
    tray.ts                     # tray image + menu, rebuilt on every state change
    tomatoIcon.ts               # pure: buildSvg(text, variant) → string; render() → nativeImage
    countdown.ts                # pure: remainingMs(timerState, now), formatMMSS(ms)
    hostsFile.ts                # pure: addBlock(text, domains) / removeBlock(text)
    blocker.ts                  # sudo -n /usr/local/bin/doros-block on|off|status
    blocklist.ts
    __tests__/                  # vitest: countdown, hostsFile, tomatoIcon
  electron/helper/
    doros-block.sh              # generated from blocklist.ts at build time
    install-helper.sh           # 🧑 one-time sudo install
    uninstall-helper.sh
  electron-builder.yml          # mac target, appId com.doros.desktop, protocol "doros"
```

### Bridge API (the contract between the two halves)

```ts
// src/types/desktop.d.ts  (and mirrored by electron/ipc.ts)
export interface DesktopTimerState {
  phase: "idle" | "focus" | "break";
  endTime?: number;            // epoch ms while running
  pausedTimeLeft?: number;     // ms while paused
  isPaused: boolean;
  task: string;
}
export type TrayCommand = "pause" | "resume" | "stop" | "show";

export interface DorosBridge {
  updateTimer(state: DesktopTimerState): void;              // renderer → main
  onTrayCommand(cb: (cmd: TrayCommand) => void): () => void; // main → renderer (returns unsubscribe)
  openExternal(url: string): void;                           // for the OAuth URL
  onAuthCallback(cb: (url: string) => void): () => void;     // deep link → renderer
}
declare global { interface Window { doros?: DorosBridge } }
```

### Data flow

```
React CreateDoro timer ──updateTimer()──▶ main
                                         ├─▶ every 1s: countdown → tomatoIcon → tray.setImage()
                                         ├─▶ phase focus & running → blocker.on()
                                         │   otherwise (and manual toggle off) → blocker.off()
                                         └─▶ Notification when endTime passes (if window hidden)
Tray menu click ──onTrayCommand()──▶ React (pause/resume/stop via existing timer handlers)
Logging the doro: unchanged. The existing React + React Query mutation inserts into Supabase.
```

---

## Phase 1: Electron shell that loads Doros

**Tasks**
1. Add dev dependencies: `electron`, `electron-builder`, `@resvg/resvg-js`, `concurrently`, `wait-on`.
2. Create `electron/main.ts`, `electron/preload.ts`, and `electron/tsconfig.json`, compiling to `electron-dist/`.
   Set `"main": "electron-dist/main.js"` in `package.json`.
3. `BrowserWindow` loads `process.env.DOROS_URL ?? "https://crush.quest"` with the preload script,
   `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
   Open any non-Doros link in the system browser (`setWindowOpenHandler` → `shell.openExternal`).
4. Hide the window on close instead of quitting. Keep **both** a Dock icon and the menu bar tray (decided). Do not call `app.dock.hide()` or set `LSUIElement`. Clicking the Dock icon (`app.on("activate")`) shows the window.
   Use `app.requestSingleInstanceLock()`.
5. Add a static tomato tray icon with a menu: **Show Doros**, **Quit**.
6. Add scripts:
   - `desktop:dev`: `concurrently "vite" "tsc -p electron -w" "wait-on http://localhost:5173 && DOROS_URL=http://localhost:5173 electron ."`
   - `desktop:build`: `tsc -p electron && electron-builder --mac`
7. **Keep the Netlify web build unaffected:** add `ELECTRON_SKIP_BINARY_DOWNLOAD = "1"` to `netlify.toml`
   build environment. Add `electron-dist/` and `release/` to `.gitignore`. Exclude `electron/` from
   the root `tsconfig.json` and give it its own.
8. Add an "Electron" section to `AGENTS.md`. `electron/` is Node main-process code, so the React
   Query and Tailwind rules don't apply there. Renderer-side desktop code in `src/` still follows them.

**Done when:** `npm run desktop:dev` opens a window running Doros from Vite (you may not be able
to log in yet), the tray shows a tomato, and `npm run build`, `npm test` and `npx tsc --noEmit` still pass.

---

## Phase 2: Login inside the desktop app

Google refuses OAuth inside an embedded Electron window, so desktop login goes through the system browser.

**Tasks**
1. Register the `doros` protocol: `app.setAsDefaultProtocolClient("doros")`, and declare it in
   `electron-builder.yml` (`protocols`). Handle `app.on("open-url")`: forward the URL to the renderer
   (`onAuthCallback`) and show the window.
2. In `Login.tsx`, if `isDesktop()`:
   ```ts
   const { data } = await supabase.auth.signInWithOAuth({
     provider: "google",
     options: { redirectTo: "doros://auth-callback", skipBrowserRedirect: true,
                queryParams: { access_type: "offline" } },
   });
   window.doros!.openExternal(data.url);
   ```
   Otherwise keep the current web flow untouched.
3. Add `src/hooks/useDesktopAuthCallback.ts`, mounted once near `AuthProvider`. On a callback URL,
   parse `access_token` and `refresh_token` from the hash, then call `supabase.auth.setSession(...)`.
   The existing `AuthContext` takes it from there.
   (The client uses the default implicit flow. Don't switch the shared client to PKCE, because that
   changes the live web login.)
4. 🧑 The user adds `doros://auth-callback` to **Supabase → Authentication → URL Configuration → Redirect URLs**.
5. Tests: `Login` renders the desktop branch when `window.doros` is mocked and calls `openExternal`
   with the OAuth URL. The web branch is unchanged. `useDesktopAuthCallback` calls `setSession` with
   the parsed tokens.

**Note:** macOS deep links only work reliably from a packaged `.app`. Test this phase with
`npm run desktop:build` and open `release/mac*/Doros.app`. In dev, a fallback is acceptable:
paste the callback URL into a hidden menu item.

**Done when:** in the packaged app, you click Sign in with Google, the system browser opens, you
return to the app logged in as the same user as on the web, and the feed and leaderboard load from Supabase.

---

## Phase 3: Timer sync (renderer → tray)

**Tasks**
1. Read `CreateDoro.tsx` first. Find where `TimerState` (`endTime`, `pausedTimeLeft`, `isPaused`,
   `task`) lives, and the existing pause, resume and stop handlers. Don't restructure the timer.
2. Write `src/lib/desktopBridge.ts` and `src/hooks/useDesktopTimerSync.ts` (TDD):
   - On every timer state change, call `window.doros?.updateTimer(mapped)`.
   - Subscribe to `onTrayCommand` and call the existing handlers. Unsubscribe on unmount.
   - In a browser (`window.doros` undefined) it does nothing.
3. Also send break state if the web app has a break timer. If it doesn't, desktop phases are
   `idle` and `focus` only. Don't invent a break feature in this plan.
4. In `electron/countdown.ts` (pure, TDD), write `remainingMs(state, now)` and `formatMMSS(ms)`.
   Tests: a running session, a paused session, a session past its end (clamp to 0), and a large
   time jump (Mac asleep). It computes from `endTime`, never from counting ticks.
5. The main process stores the last state and re-renders the tray every second while running.
   On `powerMonitor` `resume`, it renders right away.

**Done when:** starting a doro in the window shows the countdown in the tray. Pause, resume and stop
from the tray change the timer in the window. The browser web app behaves exactly as before.

---

## Phase 4: Tomato with the countdown inside it

**Tasks**
1. Write `tomatoIcon.ts → buildSvg(text, variant)`. Draw a wide red tomato (`#E53935` body,
   green `#43A047` leaf) about **44×22 pt**, with bold white centered text (about 11 pt, thin dark stroke).
   Variants: `focus` (red), `paused` (dimmed, `⏸`), `idle` (plain tomato, no text).
2. Write `render(text, variant) → nativeImage`. Rasterize at 2× (88×44 px) with resvg
   (`font: { loadSystemFonts: true }`), then `nativeImage.createFromBuffer(png, { scaleFactor: 2 })`.
   Do **not** use template images. Cache the results by `text + variant`.
3. Fallback setting: a small tomato plus `tray.setTitle("24:13")` if text inside the tomato is
   unreadable on non-Retina screens.
4. Tests: the SVG contains the text and the correct fills for each variant. Add snapshot tests.

**Done when:** 🧑 the user confirms the tomato countdown looks crisp in light and dark menu bars.

---

## Phase 5: Tray menu

```
🍅 Focus: "write chapter 3", 24:13 left   (disabled label)
───────────────
Pause / Resume                (→ renderer)
Stop                          (→ renderer)
Show Doros                    (shows and focuses the window)
───────────────
Block sites now        ☐/☑    (manual override)
Sites blocked: yes/no         (disabled status)
Set up site blocking…         (only shown if the helper is missing)
───────────────
Launch at login        ☐      (app.setLoginItemSettings)
Quit Doros
```

Starting a new doro needs a task name, so the start action is **Show Doros**. The React UI stays
the only place you create a doro. Optionally add a global shortcut `⌥⌘D` for Show Doros.

**Done when:** every menu item works by hand.

---

## Phase 6: Website blocking

### 6a. Pure hosts-file transform (TDD)
`electron/hostsFile.ts`:
- `addBlock(text, domains)`: removes any existing Doros section, then appends
  `# BEGIN DOROS BLOCK` … `0.0.0.0 d` and `:: d` for each domain … `# END DOROS BLOCK`.
- `removeBlock(text)`: removes only that section and leaves every other line byte-for-byte unchanged.
- Tests: idempotent, preserves existing entries, handles trailing newlines.

### 6b. Privileged helper
`electron/helper/doros-block.sh` is generated from `blocklist.ts`. It's installed to
`/usr/local/bin/doros-block`, owned by `root:wheel`, mode `755`.
- `on` / `off` / `status`. The domains are **hard-coded in the script**, so the app can't pass arbitrary hosts to root.
- Writes atomically (temp file, then `mv`), then runs `dscacheutil -flushcache; killall -HUP mDNSResponder`.

`install-helper.sh` 🧑 (the **user** runs it once with `sudo`; the agent never does):
copies the helper, sets ownership and permissions, writes
`/etc/sudoers.d/doros` → `<username> ALL=(root) NOPASSWD: /usr/local/bin/doros-block`, and checks it with `visudo -cf` first.

### 6c. Blocker in the main process
- `execFile("sudo", ["-n", "/usr/local/bin/doros-block", "on"])`. Never prompt for or store a password.
- Block while `phase === "focus" && !isPaused`, or while the manual toggle is on. Otherwise unblock.
  Only call the helper when the desired state actually changes.
- On launch, call `off` unless a focus session is running (this cleans up after a crash).
  On `before-quit`, call `off`.

### 6d. Known limitations (put these in the README)
- Tabs already open on a blocked site may keep working until reload. Chrome caches DNS for about a minute.
- A VPN or custom DNS-over-HTTPS profile can bypass `/etc/hosts`.
- Blocking only happens while the desktop app is running. The web app alone can't block sites.

**Done when:** you start a doro, and `https://www.reddit.com` in a fresh tab fails to load.
Stop or finish the doro and it loads again. `cat /etc/hosts` shows the section only during focus.

---

## Phase 7: Notifications and packaging

1. When the countdown hits 0 and the window is hidden, show a `Notification` ("Doro done 🍅,
   log it?"). Clicking it shows the window, where the existing completion flow (log, upload image) runs.
   🧑 The user allows notifications.
2. `electron-builder.yml`: `mac.identity: null` (unsigned), Dock icon stays visible (no `LSUIElement`),
   tomato `.icns`, the `doros` protocol.
3. `npm run desktop:build` produces `release/mac-arm64/Doros.app`. 🧑 The user drags it to
   `/Applications` and right-clicks → Open the first time.

**Done when:** in the installed app you can log in, do a full doro with sites blocked, see it logged
to Supabase, and find it in the feed on the **website** too.

---

## Stretch ideas
- Start a doro from the tray with the last-used task name.
- Edit the block list from the menu (regenerates the helper, 🧑 needs sudo).
- Close or reload open tabs on blocked sites when focus starts (AppleScript for Safari and Chrome).
- Load the bundled `dist/` through a custom `app://` protocol instead of the live URL, if offline startup ever matters.

---

## Agent checklist per phase
- [ ] Tests first for pure modules and new hooks (`countdown`, `hostsFile`, `tomatoIcon`, `useDesktopTimerSync`, `useDesktopAuthCallback`, the `Login` desktop branch)
- [ ] `npm test`, `npx tsc --noEmit`, `npx tsc -p electron --noEmit`, and `npm run build` (web) all pass
- [ ] Web behavior unchanged when `window.doros` is undefined
- [ ] Run `npm run desktop:dev` (or the packaged app for Phases 2 and 7) and describe what you saw
- [ ] Work on a branch (`desktop-app`), one commit per phase
- [ ] Stop at 🧑 steps and give the user the exact command or dashboard step

## Agent guardrails
- Never edit `/etc/hosts` or `/etc/sudoers.d` directly. Only the user does, through `install-helper.sh`.
- Never `sudo` without `-n`, and never store or ask for a password.
- Never change Supabase schema, RLS, or auth settings. Dashboard changes are 🧑 steps.
- Don't change the shared Supabase client's auth flow (stay on implicit). The web login must keep working.
- Renderer code in `src/` follows `AGENTS.md` (React Query, Tailwind, `cq-` classnames). No Supabase calls from `electron/`.
