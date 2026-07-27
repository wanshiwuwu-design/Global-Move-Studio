"use client";

import { toPng } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

type Region = "全球" | "北美" | "欧洲" | "大洋洲" | "亚洲";
type Topic = "全部" | "永居" | "工作签" | "留学" | "家庭团聚" | "政策";

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
  selected: boolean;
};

const fallbackStories: Story[] = [
  {
    id: "ca-pgp",
    country: "加拿大",
    flag: "🇨🇦",
    region: "北美",
    topic: "家庭团聚",
    title: "加拿大暂停父母及祖父母团聚项目新申请",
    summary:
      "加拿大移民部宣布暂停接收父母及祖父母团聚项目的新申请，现有申请继续处理，2026 年计划通过该项目批准最多 15,000 人获得永久居民身份。超级签证仍可用于长期探亲。",
    source: "加拿大移民部 IRCC",
    sourceUrl:
      "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/responsibly-manage-parent-grandparent-program.html",
    date: "2026-07-15",
    selected: true,
  },
  {
    id: "nz-student",
    country: "新西兰",
    flag: "🇳🇿",
    region: "大洋洲",
    topic: "留学",
    title: "新西兰放宽 Pathway Student Visa 学习路径",
    summary:
      "新规扩大低等级课程衔接范围，并把部分申请人的英语学习时间上限由 20 周延长至 30 周。调整已于 7 月 20 日生效，为国际学生提供更灵活的升学安排。",
    source: "新西兰移民局 INZ",
    sourceUrl:
      "https://www.immigration.govt.nz/about-us/news-centre/improvements-to-the-pathway-student-visa/",
    date: "2026-07-20",
    selected: true,
  },
  {
    id: "uk-rules",
    country: "英国",
    flag: "🇬🇧",
    region: "欧洲",
    topic: "政策",
    title: "英国发布新一轮移民规则变更说明",
    summary:
      "英国内政部发布 7 月移民规则变更文件，涵盖多项签证与居留规则的调整。准备递交申请的人应核对新旧规则的生效日期与过渡安排。",
    source: "英国内政部 Home Office",
    sourceUrl:
      "https://www.gov.uk/government/publications/statement-of-changes-to-the-immigration-rules-hc-259-9-july-2026",
    date: "2026-07-09",
    selected: true,
  },
  {
    id: "nz-skilled",
    country: "新西兰",
    flag: "🇳🇿",
    region: "大洋洲",
    topic: "永居",
    title: "新西兰技术移民与工作转居留细则即将调整",
    summary:
      "技术移民类别将简化工资门槛规则、更新学历证明要求，并调整技工与技术员路径。主要变化计划自 8 月 24 日起实施。",
    source: "新西兰移民局 INZ",
    sourceUrl:
      "https://www.immigration.govt.nz/about-us/news-centre/final-details-about-changes-to-the-skilled-migrant-category-resident-visa-and-work-to-residence-visa/",
    date: "2026-06-18",
    selected: false,
  },
  {
    id: "au-program",
    country: "澳大利亚",
    flag: "🇦🇺",
    region: "大洋洲",
    topic: "政策",
    title: "澳大利亚持续推进移民项目精简与数字化",
    summary:
      "澳大利亚最新项目管理文件继续强调技术移民、区域发展与签证系统数字化。申请人应以移民局公布的职业清单、州担保名额和邀请轮次为准。",
    source: "澳大利亚内政部",
    sourceUrl:
      "https://immi.homeaffairs.gov.au/what-we-do/migration-program-planning-levels",
    date: "2026-06-30",
    selected: false,
  },
];

const regions: Region[] = ["全球", "北美", "欧洲", "大洋洲", "亚洲"];
const topics: Topic[] = ["全部", "永居", "工作签", "留学", "家庭团聚", "政策"];
const MAX_SELECTED_STORIES = 8;
const palettes = [
  { name: "高达绿", primary: "#1E5552", accent: "#C99B52", soft: "#EAF2EF" },
  { name: "远洋蓝", primary: "#132B57", accent: "#EF5B4B", soft: "#EDF3F8" },
  { name: "苔原绿", primary: "#16453B", accent: "#D9853B", soft: "#EDF5F1" },
  { name: "暮霞紫", primary: "#3D2D5C", accent: "#E35D83", soft: "#F5EFF6" },
  { name: "炭黑红", primary: "#242424", accent: "#C83E3E", soft: "#F3F0EC" },
];

function formatChineseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
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
  const [stories, setStories] = useState<Story[]>(fallbackStories);
  const [region, setRegion] = useState<Region>("全球");
  const [topic, setTopic] = useState<Topic>("全部");
  const [activeId, setActiveId] = useState(fallbackStories[0].id);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [title, setTitle] = useState("全球移民周报");
  const [subtitle, setSubtitle] = useState("本周政策、签证与机会，一张图看懂");
  const [brand, setBrand] = useState("高达出国");
  const [issue, setIssue] = useState("VOL. 028");
  const [fontScale, setFontScale] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("打开时自动更新 · 官方来源优先");
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
          (region === "全球" || story.region === region) &&
          (topic === "全部" || story.topic === topic),
      ),
    [stories, region, topic],
  );
  const activeStory = stories.find((story) => story.id === activeId);

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
    setRefreshing(true);
    if (manual) setStatus("正在扫描全球移民资讯…");
    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      if (!response.ok) throw new Error("news unavailable");
      const data = (await response.json()) as { stories?: Story[]; updatedAt?: string };
      if (data.stories?.length) {
        setStories((current) => {
          const selectedIds = new Set(
            current.filter((item) => item.selected).map((item) => item.id),
          );
          const fresh = data.stories!.map((item, index) => ({
            ...item,
            selected: selectedIds.has(item.id) || index < 3,
          }));
          return fresh;
        });
        const time = new Date(data.updatedAt || Date.now()).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setStatus(`已更新 ${data.stories.length} 条 · ${time}`);
      }
    } catch {
      setStatus("已载入最新编辑样例 · 可手动刷新");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => refreshNews(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  function updateStory(id: string, patch: Partial<Story>) {
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
          <p className="update-state"><span>●</span>{status}</p>

          <label className="searchbox">
            <span>⌕</span>
            <input
              placeholder="搜索国家、签证或政策"
              onChange={(event) => {
                const value = event.target.value.trim().toLowerCase();
                if (!value) return setRegion("全球");
                const found = stories.find(
                  (item) =>
                    item.title.toLowerCase().includes(value) ||
                    item.country.toLowerCase().includes(value),
                );
                if (found) setActiveId(found.id);
              }}
            />
          </label>

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
            <span>候选资讯</span>
            <small>已选 {selectedStories.length}/{MAX_SELECTED_STORIES}</small>
          </div>
          <div className="story-list">
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
                    <time>{formatChineseDate(story.date)}</time>
                  </div>
                  <h3>{story.title}</h3>
                  <p>{story.source}</p>
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
                      <time>{formatChineseDate(story.date)}</time>
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
            <p><strong>可信来源策略</strong>优先聚合各国移民主管部门、政府公报与主流媒体；每条资讯保留原文入口。</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
