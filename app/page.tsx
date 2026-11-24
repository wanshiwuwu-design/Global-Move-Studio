"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { verifiedNews } from "./api/news/verified-news.mjs";

type Region = "全球" | "北美" | "欧洲" | "大洋洲" | "亚洲" | "拉丁美洲";
type Topic = "全部" | "永居" | "工作签" | "留学" | "家庭团聚" | "投资移民" | "排期" | "政策";

type Story = {
  id: string;
  country: string;
  flag: string;
  region: Exclude<Region, "全球">;
  topic: Exclude<Topic, "全部">;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  date: string;
  dateKind: "published" | "updated" | "issue";
  verified?: boolean;
  status?: string;
  timing?: string;
  selected: boolean;
};

type SourceCheck = {
  id: string;
  country: string;
  source: string;
  error: boolean;
  lastSuccess: string | null;
};

type NewsResponse = {
  stories: Omit<Story, "selected">[];
  updatedAt: string;
  lastSuccess: string | null;
  sources: SourceCheck[];
};

const regions: Region[] = ["全球", "北美", "欧洲", "大洋洲", "亚洲", "拉丁美洲"];
const topics: Topic[] = ["全部", "永居", "工作签", "留学", "家庭团聚", "投资移民", "排期", "政策"];
const MAX_SELECTED_STORIES = 8;
const palettes = [
  { name: "高达绿", primary: "#1E5552", accent: "#C99B52", soft: "#EAF2EF" },
  { name: "远洋蓝", primary: "#132B57", accent: "#EF5B4B", soft: "#EDF3F8" },
  { name: "苔原绿", primary: "#16453B", accent: "#D9853B", soft: "#EDF5F1" },
  { name: "暮霞紫", primary: "#3D2D5C", accent: "#E35D83", soft: "#F5EFF6" },
  { name: "炭黑红", primary: "#242424", accent: "#C83E3E", soft: "#F3F0EC" },
];

function formatStoryDate(story: Story) {
  const [year, month, day] = story.date.split("-").map(Number);
  if (story.dateKind === "issue") return `${year} 年 ${month} 月刊`;
  return `${month} 月 ${day} 日${story.dateKind === "updated" ? "更新" : "公告"}`;
}

function formatCheckTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function makeWhiteLogo(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const distanceFromWhite = 255 - Math.min(red, green, blue);
    pixels.data[index] = 255;
    pixels.data[index + 1] = 255;
    pixels.data[index + 2] = 255;
    pixels.data[index + 3] = Math.min(255, distanceFromWhite * 1.35);
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>(() =>
    verifiedNews.map((story, index) => ({ ...story, selected: index < 3 })),
  );
  const [showCandidates, setShowCandidates] = useState(false);
  const [region, setRegion] = useState<Region>("全球");
  const [topic, setTopic] = useState<Topic>("全部");
  const [activeId, setActiveId] = useState(verifiedNews[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [title, setTitle] = useState("全球移民周报");
  const [subtitle, setSubtitle] = useState("本周政策、签证与机会，一张图看懂");
  const [brand, setBrand] = useState("高达出国");
  const [issue, setIssue] = useState("VOL. 028");
  const [fontScale, setFontScale] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("正在读取官方资讯…");
  const [sourceChecks, setSourceChecks] = useState<SourceCheck[]>([]);
  const refreshingRef = useRef(false);
  const editsRef = useRef(new Map<string, Partial<Story>>());
  const [exporting, setExporting] = useState(false);
  const [whiteLogoSrc, setWhiteLogoSrc] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const palette = palettes[paletteIndex];
  const selectedStories = stories
    .filter((story) => story.selected)
    .slice(0, MAX_SELECTED_STORIES);
  const filteredStories = useMemo(
    () =>
      stories.filter(
        (story) =>
          (showCandidates ? !story.verified : story.verified) &&
          (region === "全球" || story.region === region) &&
          (topic === "全部" || story.topic === topic) &&
          (!search || [story.country, story.title, story.summary, story.source, story.topic]
            .some((value) => value.toLowerCase().includes(search))),
      ),
    [stories, region, topic, search, showCandidates],
  );
  const activeStory = filteredStories.find((story) => story.id === activeId) ?? filteredStories[0];

  useEffect(() => {
    let active = true;
    loadImage("/company-logo.jpg")
      .then((image) => {
        if (active) setWhiteLogoSrc(makeWhiteLogo(image).toDataURL("image/png"));
      })
      .catch(() => {
        if (active) setWhiteLogoSrc(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refreshNews(manual = false) {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    if (manual) setStatus("正在读取官方资讯…");
    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      if (!response.ok && response.status !== 503) throw new Error("news unavailable");
      const data = (await response.json()) as NewsResponse;
      const failed = data.sources.filter((source) => source.error).length;
      setSourceChecks(data.sources);
      if (!response.ok) {
        setStatus(data.lastSuccess
          ? `所有来源暂时不可用 · 上次成功 ${formatCheckTime(data.lastSuccess)}`
          : "所有来源暂时不可用 · 请稍后刷新");
        return;
      }

      setStories((current) => {
        const fresh = new Map(data.stories.map((story) => [story.id, story]));
        const selected = current.filter((story) => story.selected).map((story) => ({
          ...story, ...fresh.get(story.id), ...editsRef.current.get(story.id), selected: true,
        }));
        const selectedIds = new Set(selected.map((story) => story.id));
        const rest = data.stories.filter((story) => !selectedIds.has(story.id)).map((story) => ({
          ...story, ...editsRef.current.get(story.id), selected: false,
        }));
        return [...selected, ...rest];
      });

      const checked = `最近检查 ${formatCheckTime(data.updatedAt)}`;
      const verified = data.stories.filter((story) => story.verified).length;
      const count = `${verified} 条已核验 · ${data.stories.length - verified} 条官方待核验`;
      setStatus(`${count} · ${checked}${failed ? ` · ${failed} 个来源暂不可用` : ""}`);
    } catch {
      setStatus("资讯服务暂不可用 · 请稍后刷新");
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshNews();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshNews();
    }, 5 * 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function updateStory(id: string, patch: Partial<Story>) {
    editsRef.current.set(id, { ...editsRef.current.get(id), ...patch });
    setStories((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function toggleStory(id: string) {
    setStories((items) => {
      const chosen = items.filter((item) => item.selected).length;
      return items.map((item) =>
        item.id === id
          ? {
              ...item,
              selected:
                item.selected ? false : chosen < MAX_SELECTED_STORIES,
            }
          : item,
      );
    });
  }

  function moveStory(id: string, direction: -1 | 1) {
    setStories((items) => {
      const index = items.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= items.length) return items;
      const copy = [...items];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  async function downloadPoster() {
    setExporting(true);
    try {
      await document.fonts.ready;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const poster = posterRef.current;
      if (!poster) throw new Error("Poster preview is unavailable");
      const targetWidth = 2160;
      const pixelRatio = targetWidth / poster.offsetWidth;
      const dataUrl = await toPng(poster, {
        backgroundColor: "#F8F6F0",
        cacheBust: true,
        pixelRatio,
        skipAutoScale: true,
      });
      const link = document.createElement("a");
      link.download = `全球移民周报-${new Date().toISOString().slice(0, 10)}-高清.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setStatus("海报生成失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main
      className="studio"
      style={
        {
          "--primary": palette.primary,
          "--accent": palette.accent,
          "--soft": palette.soft,
        } as React.CSSProperties
      }
    >
      <header className="topbar">
        <div className="wordmark">
          <span className="logo-mark">G</span>
          <div>
            <strong>Global Move Studio</strong>
            <small>全球移民资讯海报生成器</small>
          </div>
        </div>
        <div className="header-actions">
          <span className="save-state"><i /> 已自动保存</span>
          <button className="ghost-button" onClick={() => window.print()}>
            打印预览
          </button>
          <button className="download-button" onClick={downloadPoster} disabled={exporting}>
            <span>↓</span> {exporting ? "正在生成…" : "下载高清海报"}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LIVE SOURCES</span>
              <h2>资讯素材库</h2>
            </div>
            <button
              className={`refresh-button ${refreshing ? "spinning" : ""}`}
              onClick={() => refreshNews(true)}
              disabled={refreshing}
              aria-label="刷新全球资讯"
            >
              ↻
            </button>
          </div>
          <p className="update-state" role="status"><span>●</span>{status}</p>
          {sourceChecks.length > 0 && (
            <details className="source-checks">
              <summary>官方来源状态</summary>
              <ul>
                {sourceChecks.map((check) => (
                  <li key={check.id}>
                    {check.source} · {check.error ? "暂不可用" : "可用"}
                    {check.lastSuccess ? ` · 上次成功 ${formatCheckTime(check.lastSuccess)}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <label className="searchbox">
            <span>⌕</span>
            <input
              placeholder="搜索国家、签证或政策"
              onChange={(event) => setSearch(event.target.value.trim().toLowerCase())}
            />
          </label>

          <div className="filter-block">
            <div className="chips" role="group" aria-label="资讯核验状态">
              <button className={!showCandidates ? "active" : ""} aria-pressed={!showCandidates}
                onClick={() => setShowCandidates(false)}>已核验政策</button>
              <button className={showCandidates ? "active" : ""} aria-pressed={showCandidates}
                onClick={() => setShowCandidates(true)}>官方待核验</button>
            </div>
          </div>

          <div className="filter-block">
            <span className="field-label">地区</span>
            <div className="chips">
              {regions.map((item) => (
                <button
                  key={item}
                  className={region === item ? "active" : ""}
                  onClick={() => setRegion(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-block">
            <span className="field-label">主题</span>
            <div className="chips">
              {topics.map((item) => (
                <button
                  key={item}
                  className={topic === item ? "active" : ""}
                  onClick={() => setTopic(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="story-list-heading">
            <span>{showCandidates ? "官方待核验" : "已核验政策"}</span>
            <small>已选 {selectedStories.length}/{MAX_SELECTED_STORIES}</small>
          </div>
          <div className="story-list">
            {filteredStories.length === 0 && !refreshing && (
              <p className="update-state">{stories.length ? "没有符合当前筛选的资讯。" : "暂无可显示的官方资讯。"}</p>
            )}
            {filteredStories.map((story) => (
              <article
                key={story.id}
                className={`story-row ${activeId === story.id ? "focused" : ""}`}
                onClick={() => setActiveId(story.id)}
              >
                <button
                  className={`check-button ${story.selected ? "checked" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleStory(story.id);
                  }}
                  disabled={
                    !story.selected &&
                    selectedStories.length >= MAX_SELECTED_STORIES
                  }
                  aria-label={story.selected ? "移出海报" : "加入海报"}
                >
                  {story.selected ? "✓" : "+"}
                </button>
                <div className="story-copy">
                  <div className="story-meta">
                    <span>{story.flag} {story.country}</span>
                    <time>{formatStoryDate(story)}</time>
                  </div>
                  <h3>{story.title}</h3>
                  <p>{story.source}{story.status ? ` · ${story.status}` : ""}</p>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="canvas-area">
          <div className="canvas-toolbar">
            <div className="zoom-control">
              <span>画布</span>
              <strong>9:12 · 高清长图</strong>
            </div>
            <div className="toolbar-hint">点击海报文字可直接编辑</div>
          </div>

          <div className="poster-shell">
            <div className="poster" ref={posterRef} style={{ fontSize: `${fontScale}em` }}>
              <div className="poster-hero">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="hero-topline">
                  <div className="poster-logo-card">
                    {whiteLogoSrc ? (
                      <img src={whiteLogoSrc} alt={brand} />
                    ) : (
                      <span>{brand}</span>
                    )}
                  </div>
                  <span className="issue">{issue}</span>
                </div>
                <h1 contentEditable suppressContentEditableWarning onBlur={(e) => setTitle(e.currentTarget.textContent || title)}>{title}</h1>
                <p contentEditable suppressContentEditableWarning onBlur={(e) => setSubtitle(e.currentTarget.textContent || subtitle)}>{subtitle}</p>
                <div className="date-line">
                  <strong>GLOBAL IMMIGRATION BRIEF</strong>
                  <span>{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>

              <div className="poster-intro">
                <span className="intro-number">{String(selectedStories.length).padStart(2, "0")}</span>
                <div>
                  <small>THIS WEEK</small>
                  <strong>本周值得关注的全球移民动态</strong>
                </div>
                <div className="region-stamps">
                  {[...new Set(selectedStories.map((item) => item.region))].map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <div className="poster-stories">
                {selectedStories.map((story, index) => (
                  <article className={`poster-story ${index === 0 ? "lead-story" : ""}`} key={story.id}>
                    <div className="poster-story-head">
                      <span className="story-index">0{index + 1}</span>
                      <div className="country-line">
                        <span className="flag">{story.flag}</span>
                        <strong>{story.country}</strong>
                        <i />
                        <span>{story.topic}</span>
                      </div>
                      <time>{formatStoryDate(story)}</time>
                    </div>
                    <h2
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateStory(story.id, { title: e.currentTarget.textContent || story.title })}
                    >
                      {story.title}
                    </h2>
                    <p
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => updateStory(story.id, { summary: e.currentTarget.textContent || story.summary })}
                    >
                      {story.summary}
                    </p>
                    <div className="source-line">
                      <span>来源 · {story.source}</span>
                      <a href={story.sourceUrl} target="_blank" rel="noreferrer">查看原文 ↗</a>
                    </div>
                    <div className="source-line">
                      <span>{story.timing ? `${story.status} · ${story.timing}` : "官方原文待核验"}</span>
                    </div>
                  </article>
                ))}
              </div>

              <footer className="poster-footer">
                <div className="poster-footer-brand">
                  <img src="/company-logo.jpg" alt={brand} />
                  <span>MOVE WITH CLARITY</span>
                </div>
                <p>信息仅供参考，请以各国移民主管部门最新公布为准</p>
                <span className="footer-globe">◎</span>
              </footer>
            </div>
          </div>
        </section>

        <aside className="edit-panel">
          <div className="edit-tabs">
            <button className="active">内容编辑</button>
            <button>样式</button>
          </div>

          <section className="edit-section">
            <h3>海报信息</h3>
            <label>
              <span>主标题</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              <span>副标题</span>
              <textarea value={subtitle} onChange={(event) => setSubtitle(event.target.value)} rows={2} />
            </label>
            <div className="two-fields">
              <label>
                <span>品牌名</span>
                <input value={brand} onChange={(event) => setBrand(event.target.value)} />
              </label>
              <label>
                <span>期号</span>
                <input value={issue} onChange={(event) => setIssue(event.target.value)} />
              </label>
            </div>
          </section>

          {activeStory && (
            <section className="edit-section story-editor">
              <div className="section-heading">
                <h3>当前资讯</h3>
                <span>{activeStory.flag} {activeStory.country}</span>
              </div>
              {activeStory.timing && <p>{activeStory.status} · {activeStory.timing}</p>}
              <p><a href={activeStory.sourceUrl} target="_blank" rel="noreferrer">查看官方原文 ↗</a></p>
              <label>
                <span>标题</span>
                <textarea
                  value={activeStory.title}
                  onChange={(event) => updateStory(activeStory.id, { title: event.target.value })}
                  rows={3}
                />
              </label>
              <label>
                <span>摘要</span>
                <textarea
                  value={activeStory.summary}
                  onChange={(event) => updateStory(activeStory.id, { summary: event.target.value })}
                  rows={6}
                />
              </label>
              <div className="story-actions">
                <button onClick={() => moveStory(activeStory.id, -1)}>↑ 上移</button>
                <button onClick={() => moveStory(activeStory.id, 1)}>↓ 下移</button>
                <button
                  className="danger"
                  onClick={() => toggleStory(activeStory.id)}
                  disabled={
                    !activeStory.selected &&
                    selectedStories.length >= MAX_SELECTED_STORIES
                  }
                >
                  {activeStory.selected ? "移出海报" : "加入海报"}
                </button>
              </div>
            </section>
          )}

          <section className="edit-section">
            <h3>视觉样式</h3>
            <span className="field-label">主题色</span>
            <div className="palette-list">
              {palettes.map((item, index) => (
                <button
                  key={item.name}
                  className={paletteIndex === index ? "active" : ""}
                  onClick={() => setPaletteIndex(index)}
                  aria-label={item.name}
                >
                  <i style={{ background: item.primary }} />
                  <i style={{ background: item.accent }} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            <label className="range-row">
              <span>字号</span>
              <input
                type="range"
                min="0.88"
                max="1.08"
                step="0.02"
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
              />
              <strong>{Math.round(fontScale * 100)}%</strong>
            </label>
          </section>

          <div className="source-note">
            <span>✓</span>
            <p><strong>可信来源策略</strong>聚合已接入的移民主管部门和政府公报。每条资讯保留官方原文，标题和摘要可在发布海报前编辑。</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
