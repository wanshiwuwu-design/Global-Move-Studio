import assert from "node:assert/strict";
import test from "node:test";
import { buildNewsResponse, collectOfficialNews } from "../app/api/news/official-news.mjs";
import { sources } from "../app/api/news/sources.mjs";
import { verifiedNews } from "../app/api/news/verified-news.mjs";

const now = Date.UTC(2026, 10, 24, 12);
const source = (id) => sources.find((item) => item.id === id);
const mockFetch = (responses) => async (url) => new Response(responses[url], {
  status: Object.hasOwn(responses, url) ? 200 : 503,
});

test("uses official publication dates and summaries, and discards invalid or unrelated RSS links", async () => {
  const uk = source("uk-home-office");
  const results = await collectOfficialNews({
    config: [uk], now, fetcher: mockFetch({
      [uk.url]: `<feed>
        <entry><title>Update to work visas &amp; sponsorship</title>
          <link rel="alternate" href="https://www.gov.uk/guidance/work-visas?utm_source=feed"/>
          <published>2026-11-18T00:30:00+13:00</published><updated>2026-11-24T10:00:00Z</updated>
          <summary>&lt;p&gt;The application window opens on 1 December.&lt;/p&gt;</summary></entry>
        <entry><title>New visa programme</title><link href="https://notgov.uk/guidance/visa"/>
          <updated>2026-11-23</updated></entry>
        <entry><title>Police procurement</title><link href="https://www.gov.uk/procurement"/>
          <published>2026-11-23</published></entry>
        <entry><title>Green card update</title><link href="https://www.gov.uk/undated"/></entry>
      </feed>`,
    }),
  });
  const { stories } = buildNewsResponse(results, now);
  assert.equal(stories.length, 1);
  assert.equal(stories[0].id, "https://www.gov.uk/guidance/work-visas");
  assert.equal(stories[0].date, "2026-11-18");
  assert.equal(stories[0].dateKind, "published");
  assert.equal(stories[0].title, "Update to work visas & sponsorship");
  assert.equal(stories[0].summary, "The application window opens on 1 December.");
  assert.equal(stories[0].topic, "工作签");
});

test("retains each source's last good articles and distinguishes failures from a successful check", async () => {
  const hk = source("hk-immd");
  const uk = source("uk-home-office");
  const first = await collectOfficialNews({
    config: [hk], now, fetcher: mockFetch({
      [hk.url]: `<table><tr><td>2026年11月20日</td><td>
        <a href="/hks/press/press-releases/20261120a.html">人才入境计划申请更新</a>
        </td></tr></table>`,
    }),
  });
  const second = await collectOfficialNews({
    config: [hk, uk], now: now + 60_000, previous: first, fetcher: mockFetch({ [uk.url]: "<feed></feed>" }),
  });
  const response = buildNewsResponse(second, now + 60_000);
  assert.equal(response.stories[0].title, "人才入境计划申请更新");
  assert.equal(response.sources[0].error, true);
  assert.equal(response.sources[0].lastSuccess, first.checkedAt);
  assert.equal(response.sources[1].error, false);
});

test("distinguishes the visa bulletin issue month from announcement dates", async () => {
  const us = source("us-bulletin");
  const snapshot = await collectOfficialNews({
    config: [us], now, fetcher: mockFetch({
      [us.url]: `<main><a href="/content/travel/en/legal/visa-law0/visa-bulletin/2027/visa-bulletin-for-december-2026.html">
        Visa Bulletin For December 2026</a></main>`,
    }),
  });
  const story = buildNewsResponse(snapshot, now).stories[0];
  assert.equal(story.topic, "排期");
  assert.equal(story.dateKind, "issue");
  assert.equal(story.date, "2026-12-01");
});

test("reads the actual New Zealand publication date from the linked announcement", async () => {
  const nz = source("nz-inz");
  const url = "https://www.immigration.govt.nz/about-us/news-centre/graduate-visa-update/";
  const snapshot = await collectOfficialNews({
    config: [nz], now, fetcher: mockFetch({
      [nz.url]: `<urlset><url><loc>${url}</loc><lastmod>2026-11-24</lastmod></url></urlset>`,
      [url]: `<meta name="description" content="The work visa is available through enhanced Immigration Online.">
        <main><h1>Graduate Work Visa update</h1><p>Published 23 November 2026</p></main>`,
    }),
  });
  const story = buildNewsResponse(snapshot, now).stories[0];
  assert.equal(story.date, "2026-11-23");
  assert.match(story.summary, /Immigration Online/);
});

test("keeps the verified briefing usable on a source failure and takes precedence over the same raw link", () => {
  const [verified] = verifiedNews;
  const candidate = { ...verified, verified: false, summary: "Feed excerpt", date: "2026-11-24" };
  const snapshot = {
    checkedAt: new Date(now).toISOString(),
    sources: [{
      id: "nz-inz", country: verified.country, source: verified.source,
      lastSuccess: null, error: true, stories: [candidate],
    }],
  };
  const { stories, sources: checks } = buildNewsResponse(snapshot, now, verifiedNews);
  assert.equal(stories.length, 8);
  assert.deepEqual(stories[0], verified);
  assert.equal(stories.filter((story) => story.id === candidate.id).length, 1);
  assert.equal(checks[0].error, true);
  assert.equal(stories.find((story) => story.country === "英国")?.status, "政府方案");
});
