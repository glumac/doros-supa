// Pure: builds the root helper that turns the /etc/hosts block on and off.
// `npm run helper:generate` writes it to electron/helper/doros-block.sh (committed, so the user
// can read exactly what they install); install-helper.sh copies it to HELPER_INSTALL_PATH.
// The domains are baked in, so the app can only ask root for on, off or status.

import { BLOCK_BEGIN, BLOCK_END, blockSection } from "./hostsFile";

/** Root-owned folder (unlike /usr/local/bin, which Homebrew makes user-writable). A user-writable
 *  folder would let any process running as the user swap the helper and run it as root. */
export const HELPER_INSTALL_PATH = "/Library/PrivilegedHelperTools/doros-block";

export interface HelperScriptOptions {
  /** Default /etc/hosts. Tests point it at a temp file. */
  hostsPath?: string;
  /** Default true: require root, chown root:wheel and flush the DNS cache. Tests turn it off. */
  privileged?: boolean;
}

export function buildHelperScript(domains: readonly string[], options: HelperScriptOptions = {}): string {
  const hostsPath = options.hostsPath ?? "/etc/hosts";
  const privileged = options.privileged ?? true;
  if (!/^\/[A-Za-z0-9._/-]+$/.test(hostsPath)) throw new Error(`unsafe hosts path: ${hostsPath}`);
  const section = blockSection(domains);

  const lines = [
    "#!/bin/sh",
    "# doros-block: turns the Doros website block in /etc/hosts on or off.",
    "# GENERATED from electron/blocklist.ts by `npm run helper:generate`; don't edit by hand.",
    `# Installed to ${HELPER_INSTALL_PATH} (root:wheel, 755) by electron/helper/install-helper.sh.`,
    "# The domains are hard-coded below, so the app can't send other hosts to root.",
    "# Usage: doros-block on|off|status",
    "set -eu",
    "umask 022",
    "PATH=/usr/bin:/bin:/usr/sbin:/sbin",
    "export PATH",
    "",
    `HOSTS='${hostsPath}'`,
    `BEGIN_MARK='${BLOCK_BEGIN}'`,
    `END_MARK='${BLOCK_END}'`,
    "",
    "block_section() {",
    "  cat <<'DOROS_EOF'",
    section + "DOROS_EOF",
    "}",
    "",
    "usage() {",
    '  echo "usage: doros-block on|off|status" >&2',
    "  exit 2",
    "}",
    "",
    "# The hosts file without any Doros section, every other byte unchanged (same as",
    "# removeBlock in electron/hostsFile.ts). Exits 3 if a section is never closed.",
    "without_block() {",
    '  if [ -s "$HOSTS" ] && [ -z "$(tail -c 1 "$HOSTS")" ]; then nl=1; else nl=0; fi',
    '  awk -v begin="$BEGIN_MARK" -v end="$END_MARK" -v nl="$nl" \'',
    "    !skip && $0 == begin { skip = 1; next }",
    "    skip { if ($0 == end) skip = 0; next }",
    '    { if (n++) printf "\\n"; printf "%s", $0 }',
    '    END { if (n && nl) printf "\\n"; if (skip) exit 3 }',
    '  \' "$HOSTS"',
    "}",
    "",
    "# Builds the new file next to the old one, then swaps it in with one rename.",
    "write_hosts() {",
    '  tmp=$(mktemp "$HOSTS.doros.XXXXXX")',
    "  trap 'rm -f \"$tmp\"' EXIT",
    '  if ! without_block > "$tmp"; then',
    '    echo "doros-block: $HOSTS has \'$BEGIN_MARK\' without \'$END_MARK\'; fix it by hand" >&2',
    "    exit 1",
    "  fi",
    '  if [ "$1" = on ]; then',
    '    if [ -s "$tmp" ] && [ -n "$(tail -c 1 "$tmp")" ]; then printf \'\\n\' >> "$tmp"; fi',
    '    block_section >> "$tmp"',
    "  fi",
    '  if cmp -s "$tmp" "$HOSTS"; then',
    "    return 0 # already in that state",
    "  fi",
    '  chmod 644 "$tmp"',
    ...(privileged ? ['  chown root:wheel "$tmp"'] : []),
    '  mv -f "$tmp" "$HOSTS"',
    "  trap - EXIT",
    ...(privileged
      ? ["  dscacheutil -flushcache", "  killall -HUP mDNSResponder 2>/dev/null || true"]
      : []),
    "}",
    "",
    '[ "$#" -eq 1 ] || usage',
    'case "$1" in',
    "  status)",
    '    if grep -qxF "$BEGIN_MARK" "$HOSTS"; then echo on; else echo off; fi',
    "    ;;",
    "  on|off)",
    ...(privileged
      ? ['    if [ "$(id -u)" -ne 0 ]; then echo "doros-block: run it with sudo" >&2; exit 1; fi']
      : []),
    '    write_hosts "$1"',
    '    echo "$1"',
    "    ;;",
    "  *)",
    "    usage",
    "    ;;",
    "esac",
    "",
  ];
  return lines.join("\n");
}
