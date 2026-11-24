# Global Move Studio

全球移民资讯海报生成器：自动聚合最新移民资讯，支持在线筛选、编辑、排版，并将预览画布原样导出为高清 PNG。

## 在线预览

### [立即打开 Global Move Studio →](https://global-move-poster-studio.garfield-wu.chatgpt.site)

> 预览站点使用私有访问模式，打开后可能需要登录 ChatGPT。

![Global Move Studio](public/og.png)

## 功能

- 追踪美国、加拿大、英国、新西兰、澳大利亚、欧盟、希腊、中国香港、新加坡和巴拿马的已接入官方来源
- 按地区和永居、工作签、留学、家庭团聚、政策等主题筛选
- 每张海报最多选择 8 条资讯
- 在线修改标题、摘要、品牌署名、期号、字号和主题配色
- 调整资讯顺序，并保留官方原文入口
- 直接将预览画布原样导出为 2160 像素宽的高清 PNG
- 使用“高达出国”品牌 Logo 与墨绿色视觉主题

## 本地运行

需要 Node.js `>=22.13.0` 和 pnpm。

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

## 构建

```bash
pnpm build
```

## 技术栈

- React 19
- Next.js / vinext
- TypeScript
- Cloudflare Workers
- 官方 RSS、Atom、公告页与站点地图
- html-to-image 高清导出

## 说明

自动摘要仅用于资讯整理，不构成移民或法律建议。申请前请以各国移民主管部门发布的最新规则为准。


## 资讯更新

- 线上页面读取官方来源近 120 天的资讯，显示公告日期、原文入口和各来源上次成功检查时间。美国签证公告使用对应期号月份。
- 默认分支的 GitHub Actions 计划每 15 分钟检查，实际运行时间以 Actions 为准。它把资讯和检查状态保存到 `immigration-news` 分支的 `news.json`。部署后可在 Actions 手动运行一次填充首个快照。
- 页面打开时读取快照，打开期间每 5 分钟重新读取。快照超过 15 分钟时，站点按需检查官方来源。单个来源失败时保留它的近期记录并标记状态。官方源缺少摘要时，保留原文链接供编辑查阅。
- 新增目的地可在 `app/api/news/sources.mjs` 配置官方入口。覆盖范围取决于接入来源能在线发布和提供哪些公告。
