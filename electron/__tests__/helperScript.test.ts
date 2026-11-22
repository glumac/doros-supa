// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { BLOCKED_DOMAINS } from "../blocklist";
import { HELPER_INSTALL_PATH, buildHelperScript } from "../helperScript";
import { addBlock, blockSection, removeBlock } from "../hostsFile";

const COMMITTED = path.join(__dirname, "..", "helper", "doros-block.sh");
const DOMAINS = ["reddit.com", "www.reddit.com"];

describe("buildHelperScript (the script root runs)", () => {
  const script = buildHelperScript(BLOCKED_DOMAINS);

  it("installs to a root-owned folder, not the user-writable /usr/local/bin", () => {
    expect(HELPER_INSTALL_PATH).toBe("/Library/PrivilegedHelperTools/doros-block");
  });

  it("hard-codes the block list section and edits /etc/hosts", () => {
    expect(script).toContain(blockSection(BLOCKED_DOMAINS));
    expect(script).toContain("HOSTS='/etc/hosts'");
  });

  it("checks for root, sets owner and mode, writes atomically and flushes DNS", () => {
    expect(script).toMatch(/id -u/);
    expect(script).toContain("chown root:wheel");
    expect(script).toContain("chmod 644");
    expect(script).toMatch(/mktemp "\$HOSTS\.doros\.XXXXXX"/);
    expect(script).toMatch(/mv -f "\$tmp" "\$HOSTS"/);
    expect(script).toContain("dscacheutil -flushcache");
    expect(script).toContain("killall -HUP mDNSResponder");
  });

  it("uses a fixed PATH so sudo's environment can't swap the tools", () => {
    expect(script).toContain("PATH=/usr/bin:/bin:/usr/sbin:/sbin");
  });

  it("refuses an unsafe hosts path", () => {
    expect(() => buildHelperScript(DOMAINS, { hostsPath: "/tmp/it's" })).toThrow(/hosts path/);
    expect(() => buildHelperScript(DOMAINS, { hostsPath: "relative/hosts" })).toThrow(/hosts path/);
  });

  it("matches the committed helper/doros-block.sh (run `npm run helper:generate`)", () => {
    expect(fs.readFileSync(COMMITTED, "utf8")).toBe(script);
    expect(fs.statSync(COMMITTED).mode & 0o111).not.toBe(0);
  });

  it("won't change /etc/hosts without root (safe to run here: it stops before reading)", () => {
    const run = spawnSync("/bin/sh", [COMMITTED, "on"], { encoding: "utf8" });
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/sudo/);
  });
});

describe("the generated script on a temp hosts file", () => {
  let dir: string;
  let hosts: string;
  let helper: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "doros-hosts-"));
    hosts = path.join(dir, "hosts");
    helper = path.join(dir, "doros-block.sh");
    fs.writeFileSync(helper, buildHelperScript(DOMAINS, { hostsPath: hosts, privileged: false }));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const run = (...args: string[]) => spawnSync("/bin/sh", [helper, ...args], { encoding: "utf8" });
  const read = () => fs.readFileSync(hosts, "utf8");

  const FIXTURES = [
    "##\n# Host Database\n##\n127.0.0.1\tlocalhost\n::1             localhost\n",
    "127.0.0.1 localhost",
    "",
    "\n",
    "a\r\nb\r\n\n\n",
    "a\n" + blockSection(["electrek.co"]) + "b",
    blockSection(DOMAINS) + "x\n" + blockSection(DOMAINS),
  ];

  it.each(FIXTURES.map((f) => [JSON.stringify(f).slice(0, 40), f]))("on/off match hostsFile.ts: %s", (_, text) => {
    fs.writeFileSync(hosts, text);
    expect(run("on").status).toBe(0);
    expect(read()).toBe(addBlock(text, DOMAINS));
    expect(run("off").status).toBe(0);
    expect(read()).toBe(removeBlock(addBlock(text, DOMAINS)));

    fs.writeFileSync(hosts, text);
    expect(run("off").status).toBe(0);
    expect(read()).toBe(removeBlock(text));
  });

  it("reports status", () => {
    fs.writeFileSync(hosts, "127.0.0.1 localhost\n");
    expect(run("status").stdout).toBe("off\n");
    run("on");
    expect(run("status").stdout).toBe("on\n");
    run("off");
    expect(run("status").stdout).toBe("off\n");
  });

  it("replaces the file atomically and leaves no temp files", () => {
    fs.writeFileSync(hosts, "127.0.0.1 localhost\n");
    const before = fs.statSync(hosts).ino;
    run("on");
    expect(fs.statSync(hosts).ino).not.toBe(before);
    expect(fs.readdirSync(dir).sort()).toEqual(["doros-block.sh", "hosts"]);
    expect(fs.statSync(hosts).mode & 0o777).toBe(0o644);
  });

  it("doesn't rewrite the file when it's already in that state", () => {
    fs.writeFileSync(hosts, "127.0.0.1 localhost\n");
    run("on");
    const ino = fs.statSync(hosts).ino;
    expect(run("on").status).toBe(0);
    expect(fs.statSync(hosts).ino).toBe(ino);
    run("off");
    const offIno = fs.statSync(hosts).ino;
    expect(run("off").status).toBe(0);
    expect(fs.statSync(hosts).ino).toBe(offIno);
  });

  it("refuses a hand-broken section and leaves the file alone", () => {
    const broken = "a\n# BEGIN DOROS BLOCK\n0.0.0.0 reddit.com\nb\n";
    fs.writeFileSync(hosts, broken);
    for (const cmd of ["on", "off"]) {
      const r = run(cmd);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/fix it by hand/);
      expect(read()).toBe(broken);
    }
    expect(fs.readdirSync(dir).sort()).toEqual(["doros-block.sh", "hosts"]);
  });

  it("rejects other arguments without touching the file", () => {
    fs.writeFileSync(hosts, "127.0.0.1 localhost\n");
    for (const args of [[], ["ON"], ["on", "extra"], ["add", "apple.com"], ["--help"]]) {
      expect(run(...args).status).toBe(2);
      expect(read()).toBe("127.0.0.1 localhost\n");
    }
  });

  it("is valid POSIX sh", () => {
    expect(() => execFileSync("/bin/sh", ["-n", helper])).not.toThrow();
  });
});
