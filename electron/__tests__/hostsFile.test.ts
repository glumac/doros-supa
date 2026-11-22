// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  BLOCK_BEGIN,
  BLOCK_END,
  MalformedHostsError,
  addBlock,
  blockSection,
  hasBlock,
  isValidDomain,
  removeBlock,
} from "../hostsFile";

const SYSTEM = "##\n# Host Database\n##\n127.0.0.1\tlocalhost\n255.255.255.255\tbroadcasthost\n::1             localhost\n";
const DOMAINS = ["reddit.com", "www.reddit.com"];
const SECTION =
  "# BEGIN DOROS BLOCK\n" +
  "0.0.0.0 reddit.com\n" +
  ":: reddit.com\n" +
  "0.0.0.0 www.reddit.com\n" +
  ":: www.reddit.com\n" +
  "# END DOROS BLOCK\n";

describe("blockSection", () => {
  it("lists an IPv4 and an IPv6 entry per domain between the markers", () => {
    expect(blockSection(DOMAINS)).toBe(SECTION);
    expect(BLOCK_BEGIN).toBe("# BEGIN DOROS BLOCK");
    expect(BLOCK_END).toBe("# END DOROS BLOCK");
  });

  it("refuses anything that isn't a plain lowercase domain (no injected lines)", () => {
    expect(() => blockSection(["reddit.com\n0.0.0.0 apple.com"])).toThrow(/invalid domain/i);
    expect(() => blockSection(["Reddit.com"])).toThrow(/invalid domain/i);
    expect(() => blockSection([])).toThrow(/at least one/i);
  });
});

describe("isValidDomain", () => {
  it("accepts hostnames like the block list", () => {
    for (const d of ["reddit.com", "forums.macrumors.com", "news.ycombinator.com", "a-b.co"]) {
      expect(isValidDomain(d)).toBe(true);
    }
  });

  it("rejects everything else", () => {
    for (const d of ["", "com", "-a.com", "a-.com", "a..com", ".a.com", "a.com.", "a b.com", "a.com#", "*.a.com", "a'.com", "x".repeat(64) + ".com"]) {
      expect(isValidDomain(d)).toBe(false);
    }
  });
});

describe("addBlock", () => {
  it("appends the section after the existing entries", () => {
    expect(addBlock(SYSTEM, DOMAINS)).toBe(SYSTEM + SECTION);
  });

  it("is idempotent", () => {
    const once = addBlock(SYSTEM, DOMAINS);
    expect(addBlock(once, DOMAINS)).toBe(once);
  });

  it("replaces an old section (block list changed) in place of appending a second one", () => {
    const old = addBlock(SYSTEM, ["electrek.co"]);
    expect(addBlock(old, DOMAINS)).toBe(SYSTEM + SECTION);
  });

  it("adds a newline first when the file doesn't end with one", () => {
    expect(addBlock("127.0.0.1 localhost", DOMAINS)).toBe("127.0.0.1 localhost\n" + SECTION);
  });

  it("works on an empty file", () => {
    expect(addBlock("", DOMAINS)).toBe(SECTION);
  });
});

describe("removeBlock", () => {
  it("undoes addBlock exactly", () => {
    expect(removeBlock(addBlock(SYSTEM, DOMAINS))).toBe(SYSTEM);
  });

  it("leaves a file without a section unchanged, byte for byte", () => {
    for (const text of [SYSTEM, "", "\n", "no newline", "a\r\nb\r\n", "a\n\n\n"]) {
      expect(removeBlock(text)).toBe(text);
    }
  });

  it("keeps lines before and after the section, including blank lines and CRLF", () => {
    const before = "a\r\n\n  # comment\n";
    const after = "\n10.0.0.1 nas.local\n";
    expect(removeBlock(before + SECTION + after)).toBe(before + after);
  });

  it("keeps a missing final newline after the section", () => {
    expect(removeBlock("a\n" + SECTION + "b")).toBe("a\nb");
  });

  it("removes every section if there is more than one", () => {
    expect(removeBlock(SECTION + "a\n" + SECTION)).toBe("a\n");
  });

  it("only matches whole marker lines", () => {
    const text = "#  BEGIN DOROS BLOCK\nx # BEGIN DOROS BLOCK\n# BEGIN DOROS BLOCK!\n";
    expect(removeBlock(text)).toBe(text);
  });

  it("refuses to guess when a section is opened and never closed", () => {
    expect(() => removeBlock("a\n# BEGIN DOROS BLOCK\n0.0.0.0 reddit.com\nb\n")).toThrow(MalformedHostsError);
    expect(() => addBlock("# BEGIN DOROS BLOCK\n", DOMAINS)).toThrow(MalformedHostsError);
  });

  it("leaves a stray END marker alone", () => {
    expect(removeBlock("a\n# END DOROS BLOCK\n")).toBe("a\n# END DOROS BLOCK\n");
  });
});

describe("hasBlock", () => {
  it("is true only when a section is present", () => {
    expect(hasBlock(SYSTEM)).toBe(false);
    expect(hasBlock(addBlock(SYSTEM, DOMAINS))).toBe(true);
    expect(hasBlock(removeBlock(addBlock(SYSTEM, DOMAINS)))).toBe(false);
  });
});
