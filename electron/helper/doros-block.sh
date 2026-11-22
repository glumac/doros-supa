#!/bin/sh
# doros-block: turns the Doros website block in /etc/hosts on or off.
# GENERATED from electron/blocklist.ts by `npm run helper:generate`; don't edit by hand.
# Installed to /Library/PrivilegedHelperTools/doros-block (root:wheel, 755) by electron/helper/install-helper.sh.
# The domains are hard-coded below, so the app can't send other hosts to root.
# Usage: doros-block on|off|status
set -eu
umask 022
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

HOSTS='/etc/hosts'
BEGIN_MARK='# BEGIN DOROS BLOCK'
END_MARK='# END DOROS BLOCK'

block_section() {
  cat <<'DOROS_EOF'
# BEGIN DOROS BLOCK
0.0.0.0 insideevs.com
:: insideevs.com
0.0.0.0 www.insideevs.com
:: www.insideevs.com
0.0.0.0 electrek.co
:: electrek.co
0.0.0.0 www.electrek.co
:: www.electrek.co
0.0.0.0 macrumors.com
:: macrumors.com
0.0.0.0 www.macrumors.com
:: www.macrumors.com
0.0.0.0 forums.macrumors.com
:: forums.macrumors.com
0.0.0.0 reddit.com
:: reddit.com
0.0.0.0 www.reddit.com
:: www.reddit.com
0.0.0.0 old.reddit.com
:: old.reddit.com
0.0.0.0 new.reddit.com
:: new.reddit.com
0.0.0.0 np.reddit.com
:: np.reddit.com
0.0.0.0 i.reddit.com
:: i.reddit.com
0.0.0.0 m.reddit.com
:: m.reddit.com
0.0.0.0 news.ycombinator.com
:: news.ycombinator.com
# END DOROS BLOCK
DOROS_EOF
}

usage() {
  echo "usage: doros-block on|off|status" >&2
  exit 2
}

# The hosts file without any Doros section, every other byte unchanged (same as
# removeBlock in electron/hostsFile.ts). Exits 3 if a section is never closed.
without_block() {
  if [ -s "$HOSTS" ] && [ -z "$(tail -c 1 "$HOSTS")" ]; then nl=1; else nl=0; fi
  awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v nl="$nl" '
    !skip && $0 == begin { skip = 1; next }
    skip { if ($0 == end) skip = 0; next }
    { if (n++) printf "\n"; printf "%s", $0 }
    END { if (n && nl) printf "\n"; if (skip) exit 3 }
  ' "$HOSTS"
}

# Builds the new file next to the old one, then swaps it in with one rename.
write_hosts() {
  tmp=$(mktemp "$HOSTS.doros.XXXXXX")
  trap 'rm -f "$tmp"' EXIT
  if ! without_block > "$tmp"; then
    echo "doros-block: $HOSTS has '$BEGIN_MARK' without '$END_MARK'; fix it by hand" >&2
    exit 1
  fi
  if [ "$1" = on ]; then
    if [ -s "$tmp" ] && [ -n "$(tail -c 1 "$tmp")" ]; then printf '\n' >> "$tmp"; fi
    block_section >> "$tmp"
  fi
  if cmp -s "$tmp" "$HOSTS"; then
    return 0 # already in that state
  fi
  chmod 644 "$tmp"
  chown root:wheel "$tmp"
  mv -f "$tmp" "$HOSTS"
  trap - EXIT
  dscacheutil -flushcache
  killall -HUP mDNSResponder 2>/dev/null || true
}

[ "$#" -eq 1 ] || usage
case "$1" in
  status)
    if grep -qxF "$BEGIN_MARK" "$HOSTS"; then echo on; else echo off; fi
    ;;
  on|off)
    if [ "$(id -u)" -ne 0 ]; then echo "doros-block: run it with sudo" >&2; exit 1; fi
    write_hosts "$1"
    echo "$1"
    ;;
  *)
    usage
    ;;
esac
