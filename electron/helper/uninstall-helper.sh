#!/bin/sh
# Removes Doros website blocking: unblocks the sites, then deletes the helper and its sudoers rule.
#   sudo sh electron/helper/uninstall-helper.sh
set -eu
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export PATH

DEST=/Library/PrivilegedHelperTools/doros-block
SUDOERS=/etc/sudoers.d/doros

if [ "$(id -u)" -ne 0 ]; then
  echo "uninstall-helper: run it with sudo: sudo sh $0" >&2
  exit 1
fi

if [ -x "$DEST" ]; then
  "$DEST" off >/dev/null || echo "uninstall-helper: couldn't remove the Doros section from /etc/hosts; check it by hand" >&2
fi
rm -f "$SUDOERS" "$DEST"
echo "Removed $DEST and $SUDOERS."
