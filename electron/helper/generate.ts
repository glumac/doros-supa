// `npm run helper:generate`: writes doros-block.sh from blocklist.ts (run with tsx).
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCKED_DOMAINS } from "../blocklist";
import { buildHelperScript } from "../helperScript";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "doros-block.sh");
fs.writeFileSync(out, buildHelperScript(BLOCKED_DOMAINS), { mode: 0o755 });
fs.chmodSync(out, 0o755);
console.log(`wrote ${path.relative(process.cwd(), out)}`);
