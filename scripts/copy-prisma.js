// scripts/copy-prisma.js
const fs = require("fs");
const path = require("path");

function copyDir(src, dst) {
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const from = path.join(process.cwd(), "src", "generated", "prisma");
const to   = path.join(process.cwd(), "dist", "generated", "prisma");

if (!fs.existsSync(from)) {
  console.error("Prisma client not found at:", from);
  process.exit(1);
}

copyDir(from, to);
console.log("✔ Copied prisma client to dist/generated/prisma");
