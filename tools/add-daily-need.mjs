#!/usr/bin/env bun
/**
 * add-daily-need.mjs — إضافة كارت «احتياج اليوم» بشكل آمن
 *
 * الاستخدام:
 *   bun tools/add-daily-need.mjs card.json            # إضافة كارت
 *   bun tools/add-daily-need.mjs card.json --push      # إضافة + commit + push
 *   bun tools/add-daily-need.mjs --status              # آخر كارت وعمره بالأيام
 *
 * الملف: src/data/daily-needs.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DATA = resolve(ROOT, "src/data/daily-needs.js");
const REL = "src/data/daily-needs.js";

const args = process.argv.slice(2);
const push = args.includes("--push");
const statusOnly = args.includes("--status");
const file = args.find((a) => !a.startsWith("--"));

const src = readFileSync(DATA, "utf8");

function loadCards() {
  return new Function(src + "\nreturn { dailyNeeds, getTodayNeed };")();
}

function todayKey() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function ageInDays(dateStr) {
  const a = new Date(dateStr + "T00:00:00");
  const b = new Date(todayKey() + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

if (statusOnly) {
  const { dailyNeeds } = loadCards();
  const sorted = [...dailyNeeds].sort((x, y) => y.date.localeCompare(x.date));
  const last = sorted[0];
  console.log(JSON.stringify({
    total: dailyNeeds.length,
    lastDate: last?.date ?? null,
    lastTitle: last?.title ?? null,
    ageDays: last ? ageInDays(last.date) : null,
    stale: last ? ageInDays(last.date) > 1 : true,
    today: todayKey(),
  }, null, 2));
  process.exit(0);
}

if (!file) {
  console.error("usage: bun tools/add-daily-need.mjs <card.json> [--push] | --status");
  process.exit(1);
}

const card = JSON.parse(readFileSync(file, "utf8"));

const problems = [];
if (!/^\d{4}-\d{2}-\d{2}$/.test(card.date || "")) problems.push("date لازم يكون YYYY-MM-DD");
if (!card.title || card.title.length < 10) problems.push("title ناقص أو قصير");
if (!card.category) problems.push("category ناقص");
if (!Array.isArray(card.sources) || card.sources.length === 0) problems.push("لازم مصدر رسمي واحد على الأقل");
if (Array.isArray(card.sources)) {
  card.sources.forEach((s, i) => {
    if (!s?.name || !/^https?:\/\//.test(s?.url || "")) problems.push(`sources[${i}] لازم name + url`);
  });
}
if (!card.summary) problems.push("summary ناقص");

if (problems.length) {
  console.error("❌ الكارت مرفوض:\n- " + problems.join("\n- "));
  process.exit(2);
}

const { dailyNeeds } = loadCards();
if (dailyNeeds.some((c) => c.date === card.date)) {
  console.error(`❌ فيه كارت بالفعل بتاريخ ${card.date} — مش هكتب فوقه.`);
  process.exit(2);
}

const closeIdx = src.lastIndexOf("\n];");
if (closeIdx === -1) {
  console.error("❌ مش لاقي نهاية المصفوفة في الملف.");
  process.exit(2);
}

const block = ",\n  " + JSON.stringify(card, null, 2).replace(/\n/g, "\n  ");
const next = src.slice(0, closeIdx) + block + src.slice(closeIdx);

// تحقق إن الملف لسه JS سليم بعد الإضافة
try {
  new Function(next + "\nreturn { dailyNeeds, getTodayNeed };")();
} catch (e) {
  console.error("❌ الملف مش هيكون صالح بعد الإضافة: " + e.message);
  process.exit(2);
}

writeFileSync(DATA, next, "utf8");
console.log(`✅ اتضاف كارت ${card.date} — ${card.title}`);

const { dailyNeeds: after } = new Function(next + "\nreturn { dailyNeeds };")();
console.log(`   إجمالي الكروت: ${after.length}`);

if (push) {
  const msg = `daily-need: كارت ${card.date} — ${card.category}`;
  execSync(`cd ${JSON.stringify(ROOT)} && git add ${REL} && git commit -m ${JSON.stringify(msg)} && git push origin main`, {
    stdio: "inherit",
  });
  console.log("🚀 اترفع على main");
}
