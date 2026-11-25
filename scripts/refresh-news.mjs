import { readFile, writeFile } from "node:fs/promises";
import { collectOfficialNews } from "../app/api/news/official-news.mjs";
import { verifiedNews } from "../app/api/news/verified-news.mjs";

const [, , file] = process.argv;
if (!file) throw new Error("Pass the working tree's news.json path");

let previous;
try {
  previous = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const snapshot = await collectOfficialNews({ previous });
await writeFile(file, JSON.stringify({ ...snapshot, verified: verifiedNews }) + "\n");
const failed = snapshot.sources.filter((source) => source.error);
console.log(`Checked ${snapshot.sources.length} sources, ${failed.length} failed.`);
if (failed.length === snapshot.sources.length) process.exitCode = 1;
