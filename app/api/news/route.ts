import { buildNewsResponse, collectOfficialNews } from "./official-news.mjs";
import { verifiedNews } from "./verified-news.mjs";

const snapshotUrl = "https://raw.githubusercontent.com/wanshiwuwu-design/Global-Move-Studio/immigration-news/news.json";
const refreshMs = 15 * 60 * 1000;
type Snapshot = Awaited<ReturnType<typeof collectOfficialNews>>;

let cached: Snapshot | undefined;
let pending: Promise<Snapshot> | undefined;

async function refreshNews() {
  let snapshot = cached;
  try {
    const response = await fetch(snapshotUrl, { signal: AbortSignal.timeout(3500) });
    if (response.ok) {
      const data = (await response.json()) as Snapshot;
      if (Array.isArray(data.sources) && Date.parse(data.checkedAt) > (Date.parse(snapshot?.checkedAt ?? "") || 0)) {
        snapshot = data;
      }
    }
  } catch (error) {
    console.warn("[immigration-news] Background snapshot unavailable", error);
  }
  if (snapshot && Date.now() - Date.parse(snapshot.checkedAt) < refreshMs) return snapshot;
  return collectOfficialNews({ previous: snapshot });
}

export async function GET() {
  if (!cached || Date.now() - Date.parse(cached.checkedAt) >= refreshMs) {
    pending ??= refreshNews().then((result) => {
      cached = result;
      return result;
    }).finally(() => {
      pending = undefined;
    });
  }
  const snapshot = (await pending) ?? cached;
  if (!snapshot) return new Response(null, { status: 503 });
  const result = buildNewsResponse(snapshot, Date.now(), verifiedNews);
  const usable = result.stories.length > 0 || snapshot.sources.some((source) => !source.error);
  return Response.json(result, {
    status: usable ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
