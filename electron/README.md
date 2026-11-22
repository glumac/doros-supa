# Doros desktop (macOS)

A thin Electron shell around the Doros web app. It adds a tomato countdown in the menu bar and
blocks distracting websites during a focus session. The design and its history are in
[`docs/DESKTOP_APP_PLAN.md`](../docs/DESKTOP_APP_PLAN.md).

## Run and build

| | |
|---|---|
| `npm run desktop:dev` | Vite + `tsc -w` + Electron, window on `http://localhost:5173` |
| `npm run desktop:build` | unsigned `release/mac-arm64/Doros.app`, which loads https://crush.quest |
| `DOROS_URL=…` | points the window at another origin (e.g. the packaged app at local Vite) |

## Website blocking

While a focus session runs (not while it's paused), or while **Block Sites Now** is ticked in the
tray menu, Doros adds a `# BEGIN DOROS BLOCK` … `# END DOROS BLOCK` section to `/etc/hosts`.
The section points the sites in [`blocklist.ts`](blocklist.ts) at `0.0.0.0` and `::`. The
section is removed a few seconds after the session ends, is paused, or is cancelled. It's also
removed when Doros quits, and on the next launch after a crash.

**One-time setup.** Doros never asks for your password. It runs a small root helper through
`sudo -n`, and you install that helper yourself once:

```sh
sudo sh electron/helper/install-helper.sh
sudo -n /Library/PrivilegedHelperTools/doros-block status   # prints "off", no password prompt
```

The installer copies [`helper/doros-block.sh`](helper/doros-block.sh) to
`/Library/PrivilegedHelperTools/doros-block` (root:wheel, 755). It also adds
`/etc/sudoers.d/doros`, which lets only you run exactly `doros-block on`, `off` and `status`
without a password. The block list is baked into the helper, so the app can't ask root to block
anything else. The tray menu shows **Set Up Site Blocking…** while the helper is missing (with a
Copy Command button), and **Update Site Blocking…** when the block list has changed since you
installed it.

**Changing the block list:** edit `blocklist.ts`, run `npm run helper:generate`, commit the
regenerated `helper/doros-block.sh`, then run the installer again.

**Removing it:** `sudo sh electron/helper/uninstall-helper.sh` (unblocks first, then deletes the
helper and the sudoers rule).

### Known limitations

- **Sites you already have open keep working, even after a reload.** Chrome reuses its open
  connection to the site without looking up the name again, and an open tab keeps that connection
  alive. Close those tabs and, in Chrome, go to `chrome://net-internals/#sockets` → **Flush socket
  pools** (or quit and reopen Chrome). Chrome also caches DNS for about a minute.
- A VPN, or a custom DNS-over-HTTPS profile or browser setting, can bypass `/etc/hosts`.
- Blocking only happens while the desktop app is running. The web app alone can't block sites.
- It's a speed bump, not a lock: you can untick Block Sites Now, cancel the doro, or edit
  `/etc/hosts` yourself.
