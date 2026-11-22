#!/bin/sh
# One-time setup for Doros website blocking. You run it yourself; the app never asks for a password:
#   sudo sh electron/helper/install-helper.sh
# It installs doros-block (root:wheel, 755) and a sudoers rule that lets only you run exactly
# "doros-block on", "off" or "status" without a password. Re-run it after changing the block list
# (electron/blocklist.ts, then `npm run helper:generate`). Undo with uninstall-helper.sh.
set -eu
umask 022
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

DEST_DIR=/Library/PrivilegedHelperTools
DEST=$DEST_DIR/doros-block
SUDOERS=/etc/sudoers.d/doros
SRC=$(cd "$(dirname "$0")" && pwd)/doros-block.sh

fail() {
  echo "install-helper: $*" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || fail "run it with sudo: sudo sh $0"
USER_NAME=${SUDO_USER:-}
case "$USER_NAME" in
  "" | root | *[!A-Za-z0-9._-]*) fail "run it with sudo from your own account (SUDO_USER='$USER_NAME')" ;;
esac
id "$USER_NAME" >/dev/null 2>&1 || fail "no such user: $USER_NAME"

[ -f "$SRC" ] || fail "missing $SRC (run npm run helper:generate)"
grep -q '^# GENERATED from electron/blocklist.ts' "$SRC" || fail "$SRC isn't the generated helper"
sh -n "$SRC" || fail "$SRC has a syntax error"

grep -Eq '^[#@]includedir[[:space:]]+(/private)?/etc/sudoers\.d' /etc/sudoers ||
  fail "/etc/sudoers doesn't include /etc/sudoers.d"

# Root runs the helper without a password, so only root may be able to change it or the
# folders above it. (That's why it isn't in /usr/local/bin, which Homebrew makes yours.)
[ -d "$DEST_DIR" ] || install -d -o root -g wheel -m 755 "$DEST_DIR"
for dir in / /Library "$DEST_DIR"; do
  [ "$(stat -f %u "$dir")" = 0 ] || fail "$dir isn't owned by root"
  case $(stat -f %Sp "$dir") in # e.g. drwxr-xr-x: the 6th and 9th characters are group/other write
    ?????w* | ????????w*) fail "$dir is writable by group or others" ;;
  esac
done

rm -f "$DEST"
install -o root -g wheel -m 755 "$SRC" "$DEST"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
printf '# Doros website blocking (electron/helper/install-helper.sh)\n%s ALL=(root) NOPASSWD: %s on, %s off, %s status\n' \
  "$USER_NAME" "$DEST" "$DEST" "$DEST" > "$work/doros"
visudo -cf "$work/doros" >/dev/null || fail "the sudoers rule failed visudo -c; nothing installed in $SUDOERS"
install -o root -g wheel -m 440 "$work/doros" "$SUDOERS"
if ! visudo -c >/dev/null; then
  rm -f "$SUDOERS"
  fail "sudo's config didn't check out with $SUDOERS added, so it was removed again"
fi

echo "Installed $DEST and $SUDOERS for $USER_NAME."
echo "Blocking right now: $("$DEST" status)"
echo "Check it as yourself (no password): sudo -n $DEST status"
