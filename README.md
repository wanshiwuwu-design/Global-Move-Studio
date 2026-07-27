# Global Move Studio

全球移民资讯海报生成器：自动聚合最新移民资讯，支持在线筛选、编辑、排版，并将预览画布原样导出为高清 PNG。

## 在线预览

### [立即打开 Global Move Studio →](https://global-move-poster-studio.garfield-wu.chatgpt.site)

> 预览站点使用私有访问模式，打开后可能需要登录 ChatGPT。

![Global Move Studio](public/og.png)

## 功能

- 自动聚合加拿大、美国、英国、新西兰、澳大利亚、欧盟及亚洲主要目的地的移民资讯
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
- GDELT 全球资讯聚合
- html-to-image 高清导出

## 说明

自动摘要仅用于资讯整理，不构成移民或法律建议。申请前请以各国移民主管部门发布的最新规则为准。
