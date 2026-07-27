type GdeltArticle = {
  url?: string;
  url_mobile?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  sourcecountry?: string;
  language?: string;
};

const countryMap: Record<
  string,
  { country: string; flag: string; region: "北美" | "欧洲" | "大洋洲" | "亚洲" }
> = {
  "canada.ca": { country: "加拿大", flag: "🇨🇦", region: "北美" },
  "uscis.gov": { country: "美国", flag: "🇺🇸", region: "北美" },
  "gov.uk": { country: "英国", flag: "🇬🇧", region: "欧洲" },
  "immigration.govt.nz": { country: "新西兰", flag: "🇳🇿", region: "大洋洲" },
  "homeaffairs.gov.au": { country: "澳大利亚", flag: "🇦🇺", region: "大洋洲" },
  "europa.eu": { country: "欧盟", flag: "🇪🇺", region: "欧洲" },
  "make-it-in-germany.com": { country: "德国", flag: "🇩🇪", region: "欧洲" },
  "moj.go.jp": { country: "日本", flag: "🇯🇵", region: "亚洲" },
  "ica.gov.sg": { country: "新加坡", flag: "🇸🇬", region: "亚洲" },
};

function inferTopic(title: string) {
  const value = title.toLowerCase();
  if (/student|study|education|graduate/.test(value)) return "留学";
  if (/family|parent|grandparent|spouse|partner/.test(value)) return "家庭团聚";
  if (/permanent|residen|citizen|green card|skilled migrant/.test(value)) return "永居";
  if (/work|worker|employ|talent|occupation|labour/.test(value)) return "工作签";
  return "政策";
}

function cleanTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*[-–|]\s*[^-–|]{2,45}$/g, "")
    .trim();
}

function shortSummary(title: string, country: string, source: string) {
  const topic = inferTopic(title);
  const hints: Record<string, string> = {
    留学: "涉及留学签证、国际学生资格或申请流程变化，准备入学与续签的人群需要重点核对生效日期及材料要求。",
    家庭团聚: "涉及家庭团聚、配偶或父母类别安排，申请人应确认名额、担保资格与过渡规则。",
    永居: "涉及永久居留或公民身份路径变化，建议重点关注资格门槛、计分方式与实施时间。",
    工作签: "涉及工作签证、雇主担保或紧缺职业政策，可能影响申请资格、工资门槛与用工流程。",
    政策: "涉及移民政策或签证管理调整，具体适用范围及过渡安排请以主管部门发布的完整文件为准。",
  };
  return `${country}最新动态：${hints[topic]} 来源为${source}。`;
}

export async function GET() {
  const query = encodeURIComponent(
    '(immigration OR visa OR "permanent residence") (domain:canada.ca OR domain:uscis.gov OR domain:gov.uk OR domain:immigration.govt.nz OR domain:homeaffairs.gov.au OR domain:europa.eu OR domain:make-it-in-germany.com OR domain:moj.go.jp OR domain:ica.gov.sg)',
  );
  const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=40&format=json&sort=HybridRel`;

  try {
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "GlobalMoveStudio/1.0" },
      cf: { cacheTtl: 1800, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });
    if (!response.ok) throw new Error("GDELT request failed");
    const payload = (await response.json()) as { articles?: GdeltArticle[] };
    const seen = new Set<string>();
    const stories = (payload.articles || [])
      .filter((article) => article.title && article.url && article.domain)
      .map((article, index) => {
        const domain = article.domain!.replace(/^www\./, "");
        const identity = Object.entries(countryMap).find(([key]) => domain.endsWith(key));
        if (!identity) return null;
        const [, locale] = identity;
        const title = cleanTitle(article.title!);
        if (!title || seen.has(title.toLowerCase())) return null;
        seen.add(title.toLowerCase());
        const rawDate = article.seendate || new Date().toISOString();
        const normalized = rawDate.includes("T")
          ? rawDate.slice(0, 10)
          : `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
        return {
          id: `${domain}-${normalized}-${index}`,
          country: locale.country,
          flag: locale.flag,
          region: locale.region,
          topic: inferTopic(title),
          title,
          summary: shortSummary(title, locale.country, domain),
          source: domain,
          sourceUrl: article.url_mobile || article.url!,
          date: normalized,
          selected: index < 3,
        };
      })
      .filter(Boolean)
      .slice(0, 16);

    if (!stories.length) throw new Error("No official-source stories");
    return Response.json(
      { stories, updatedAt: new Date().toISOString(), provider: "GDELT" },
      { headers: { "Cache-Control": "public, max-age=900, s-maxage=1800" } },
    );
  } catch {
    return Response.json(
      { stories: [], updatedAt: new Date().toISOString(), provider: "fallback" },
      { status: 200, headers: { "Cache-Control": "public, max-age=300" } },
    );
  }
}
