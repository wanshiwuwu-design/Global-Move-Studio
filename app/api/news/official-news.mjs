import { sources } from "./sources.mjs";

const newsWindowDays = 120;
const day = 86_400_000;
const maxPerSource = 20;
const month = "January February March April May June July August September October November December".split(" ");

const relevant = /\b(?:visas?|immigra\w*|migrat\w*|residen\w*|citizenship|naturalization|express entry|work pass(?:es)?|settlement|global talent|skillselect|apec business travel card|schengen|indefinite leave|inmigraci[oó]n|migraci[oó]n|residencia|regularizaci[oó]n)\b|入[境国]|居留|移民|签证|人才|永居|逗留|商务旅游证|商務旅遊證|在留|μετανάστευσ|άδει[αε]ς? διαμονής|χρυσή βίζα/iu;
const routineEnforcement = /\b(?:charged with|charged for|sentenced to|arrested|arrests|enforcement operation|fraud scheme|false declarations|deportation flight|suspected.*offences)\b|拘捕|被囚|非法劳工行动|非法勞工行動|遣返.*人|\boperativo[s]?\b/iu;
const topics = [
  ["排期", /visa bulletin|dates for filing|final action dates|排期/i],
  ["投资移民", /golden visa|investor|investment visa|\beb-?5\b|投资|投資|inversionist|επενδυτ/i],
  ["工作签", /work visa|work pass|skilled worker|employer|employment|talent|工作|人才|εργασ/i],
  ["留学", /student|study|留学|就读|留學|就讀|estudiant/i],
  ["家庭团聚", /family|parent|spouse|partner|团聚|團聚|familiar|οικογεν/i],
  ["永居", /permanent residen|green card|express entry|skilled migrant|residen[ct] visa|indefinite leave|永居|永久居留|residencia permanente/i],
];

function decode(value = "") {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|apos|quot|lt|gt|nbsp|ndash|mdash|rsquo|lsquo|ldquo|rdquo);/gi, (original, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : original;
    }
    return ({ amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" })[name.toLowerCase()];
  });
}

function plain(value = "") {
  return decode(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/[\u200b-\u200f\uFEFF]/g, "")
    .replace(/\s+/g, " ").trim();
}

function tag(node, ...names) {
  for (const name of names) {
    const match = node.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\/${name}>`, "i"));
    if (match) return match[1];
  }
  return "";
}

function attribute(tagText, name) {
  const match = tagText.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function officialUrl(value, source) {
  if (!value || /^#/.test(value)) return null;
  try {
    const url = new URL(decode(value.trim()), source.url);
    const hosts = source.hosts ?? [new URL(source.url).hostname.replace(/^www\./, "")];
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
        !hosts.some((host) => url.hostname === host || url.hostname.endsWith("." + host))) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url;
  } catch {
    return null;
  }
}

function isoDate(value) {
  const iso = value.match(/^\d{4}-\d{2}-\d{2}(?=T|\s|$)/)?.[0];
  if (iso) {
    const ms = Date.parse(iso);
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === iso ? iso : "";
  }
  const chinese = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (chinese) return isoDate(`${chinese[1]}-${chinese[2].padStart(2, "0")}-${chinese[3].padStart(2, "0")}`);
  const english = value.match(/\b(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})\b/);
  if (!english) return "";
  const ms = Date.parse(english[0] + " UTC");
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
}

function entriesFromFeed(body) {
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(body)) throw new Error("Expected RSS or Atom");
  return [...body.matchAll(/<(entry|item)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(([, , node]) => {
    const link = [...node.matchAll(/<link\b[^>]*>/gi)].find(([markup]) =>
      attribute(markup, "href") && ["", "alternate"].includes(attribute(markup, "rel")));
    const published = plain(tag(node, "published", "pubDate", "dc:date"));
    const updated = plain(tag(node, "updated"));
    return {
      title: tag(node, "title"),
      url: link ? attribute(link[0], "href") : plain(tag(node, "link")),
      summary: tag(node, "summary", "description"),
      date: published || updated,
      dateKind: published ? "published" : "updated",
    };
  });
}

function entriesFromList(body, source) {
  const main = tag(body, "main") || body;
  const links = [...main.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    const url = officialUrl(attribute(match[1], "href"), source);
    return url && source.path.test(url.pathname + url.search) && plain(match[2]) ? [{ match, url }] : [];
  });
  if (!links.length) throw new Error("No notice links found");
  return links.map(({ match, url }, i) => {
    const index = match.index;
    const end = index + match[0].length;
    const rowStart = main.lastIndexOf("<tr", index);
    const rowEnd = main.indexOf("</tr>", end);
    const inRow = rowStart >= 0 && main.lastIndexOf("</tr>", index) < rowStart && rowEnd >= 0;
    const itemStart = main.lastIndexOf("<li", index);
    const itemEnd = main.indexOf("</li>", end);
    const inItem = itemStart >= 0 && main.lastIndexOf("</li>", index) < itemStart && itemEnd >= 0;
    const context = inRow ? main.slice(rowStart, rowEnd) : inItem ? main.slice(itemStart, itemEnd)
      : main.slice(end, Math.min(end + 260, links[i + 1]?.match.index ?? main.length));
    const time = context.match(/<time\b[^>]*>/i)?.[0] ?? "";
    const preceding = main.slice(Math.max(links[i - 1]?.match.index ?? 0, index - 350), index);
    const date = source.dateBeforeLink
      ? isoDate(plain(preceding)) || attribute(time, "datetime") || plain(context)
      : attribute(time, "datetime") || plain(context.replace(match[0], ""));
    return { title: match[2], url: url.href, date };
  });
}

function bulletinEntries(body, source) {
  const first = entriesFromList(body, source).slice(0, 6);
  return first.flatMap((entry) => {
    const match = new URL(entry.url).pathname.match(/visa-bulletin-for-([a-z]+)-(\d{4})\.html$/i);
    const index = month.findIndex((name) => name.toLowerCase() === match?.[1]?.toLowerCase());
    if (!match || index < 0) return [];
    return [{
      ...entry,
      title: `美国签证公告 ${match[2]} 年 ${index + 1} 月排期`,
      date: `${match[2]}-${String(index + 1).padStart(2, "0")}-01`,
      dateKind: "issue",
    }];
  });
}

async function fetchText(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(7500) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const limit = 3_000_000;
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw new Error("Source response too large");
  }
  const raw = await response.text();
  if (raw.length > limit) throw new Error("Source response too large");
  return raw;
}

async function sitemapEntries(body, source, fetcher) {
  const seen = new Set();
  const urls = [...body.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)].flatMap(([, node]) => {
    const url = officialUrl(plain(tag(node, "loc")), source);
    if (!url || !source.path.test(url.pathname) || seen.has(url.href)) return [];
    seen.add(url.href);
    return [{ url: url.href, modified: plain(tag(node, "lastmod")) }];
  }).sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 10);
  if (!urls.length) throw new Error("No matching article URLs in sitemap");
  const articles = await Promise.allSettled(urls.map(async ({ url }) => {
    const page = await fetchText(url, fetcher);
    const main = tag(page, "main") || page;
    const headline = tag(main, "h1");
    const date = plain(main).match(/\bPublished\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1] ?? "";
    const metadata = [...page.matchAll(/<meta\b[^>]*>/gi)].find(([markup]) => attribute(markup, "name") === "description");
    if (!headline || !date) throw new Error("Article missing publication date");
    return { url, title: headline, date, summary: metadata ? attribute(metadata[0], "content") : "" };
  }));
  const parsed = articles.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!parsed.length) throw new Error("No dated articles in sitemap");
  return parsed;
}

function normalize(entry, source, now) {
  const title = plain(entry.title);
  const url = officialUrl(entry.url, source);
  const date = isoDate(entry.date);
  const dateMs = Date.parse(date);
  if (!title || !url || !date || dateMs < now - newsWindowDays * day ||
      (entry.dateKind !== "issue" && dateMs > now + day)) return null;
  const summary = plain(entry.summary);
  if (entry.dateKind !== "issue" &&
      (!relevant.test(`${title} ${summary}`) || routineEnforcement.test(title))) return null;
  return {
    id: url.href, country: source.country, flag: source.flag, region: source.region,
    title, summary: summary.length > 360 ? summary.slice(0, 357).replace(/\s+\S*$/, "") + "…" : summary,
    date, dateKind: entry.dateKind ?? "published",
    source: source.source, sourceUrl: url.href,
    topic: topics.find(([, pattern]) => pattern.test(title))?.[0] ?? "政策",
  };
}

/** @param {Snapshot} snapshot
 * @param {number} [now]
 * @param {Array<NonNullable<ReturnType<typeof normalize>> & {verified: boolean}>} [verified]
 */
export function buildNewsResponse(snapshot, now = Date.now(), verified = []) {
  const checks = snapshot.sources;
  const merged = [...verified, ...checks.flatMap((check) => check.stories)]
    .filter((story) => Date.parse(story.date) >= now - newsWindowDays * day)
    .sort((a, b) => Number("verified" in b && b.verified) - Number("verified" in a && a.verified) ||
      b.date.localeCompare(a.date) || b.summary.length - a.summary.length);
  const seen = new Set();
  const stories = merged.filter((story) => {
    if (seen.has(story.id)) return false;
    seen.add(story.id);
    return true;
  });
  const lastSuccess = checks.map((check) => check.lastSuccess).filter(Boolean).sort().at(-1) ?? null;
  return {
    stories, updatedAt: snapshot.checkedAt, lastSuccess,
    sources: checks.map(({ id, country, source, error, lastSuccess }) => ({ id, country, source, error, lastSuccess })),
  };
}

/**
 * @typedef {{
 *   id: string,
 *   country: string,
 *   source: string,
 *   lastSuccess: string | null,
 *   error: boolean,
 *   stories: NonNullable<ReturnType<typeof normalize>>[],
 * }} SourceResult
 *
 * @typedef {{ checkedAt: string, sources: SourceResult[] }} Snapshot
 */

/**
 * @param {{
 *   fetcher?: typeof fetch,
 *   previous?: Snapshot,
 *   now?: number,
 *   config?: typeof sources,
 * }} [options]
 * @returns {Promise<Snapshot>}
 */
export async function collectOfficialNews({ fetcher = fetch, previous, now = Date.now(), config = sources } = {}) {
  const checkedAt = new Date(now).toISOString();
  const sources = await Promise.all(config.map(async (source) => {
    const old = previous?.sources.find((item) => item.id === source.id);
    const info = { id: source.id, country: source.country, source: source.source };
    try {
      const body = await fetchText(source.url, fetcher);
      const entries = source.format === "feed" ? entriesFromFeed(body)
        : source.format === "sitemap" ? await sitemapEntries(body, source, fetcher)
        : source.format === "bulletin" ? bulletinEntries(body, source)
        : entriesFromList(body, source);
      if (source.format !== "feed" && !entries.some((entry) => isoDate(entry.date))) {
        throw new Error("No dated notices found");
      }
      const fresh = entries.map((entry) => normalize(entry, source, now)).filter(Boolean);
      const combined = new Map((old?.stories ?? []).map((story) => [story.id, story]));
      for (const story of fresh) combined.set(story.id, story);
      const stories = [...combined.values()].filter((story) => Date.parse(story.date) >= now - newsWindowDays * day)
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, maxPerSource);
      return { ...info, lastSuccess: checkedAt, error: false, stories };
    } catch (error) {
      console.warn(`[immigration-news] ${source.id}: ${error.message}`);
      return { ...info, lastSuccess: old?.lastSuccess ?? null, error: true, stories: old?.stories ?? [] };
    }
  }));
  return { checkedAt, sources };
}
