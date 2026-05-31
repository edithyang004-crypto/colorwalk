# 用 GitHub Pages 托管（不依赖 Netlify）

代码在 GitHub 上后，由 **GitHub Actions** 自动打包并发布，无需 Netlify。

## 线上地址

仓库名 `colorwalk`、用户 `edithyang004-crypto` 时：

```text
https://edithyang004-crypto.github.io/colorwalk/
https://edithyang004-crypto.github.io/colorwalk/exhibition/map
https://edithyang004-crypto.github.io/colorwalk/exhibition/map?nfc=07七彩楼梯
```

若以后改仓库名，需同步改 `vite.config.js` 里的 `/colorwalk/` 为 `/新仓库名/`。

## 首次开启（只需一次）

1. 打开 https://github.com/edithyang004-crypto/colorwalk  
2. **Settings** → 左侧 **Pages**  
3. **Build and deployment** → **Source** 选 **GitHub Actions**（不要选 Deploy from a branch 除非你知道自己在做什么）  
4. 把本仓库最新代码 `git push` 上去（含 `.github/workflows/deploy-github-pages.yml`）  
5. **Actions** 标签 → 等 **Deploy GitHub Pages** 跑绿  
6. 回到 **Pages**，会显示 **Visit site** 链接  

首次发布可能要等 1～3 分钟。

## 日常更新

```bash
git add .
git commit -m "更新说明"
git push
```

推送后 Actions 自动重新部署，无需手动上传 `dist`。

## 与 Netlify 的区别

| | GitHub Pages | Netlify |
|--|--------------|---------|
| 网址 | `用户名.github.io/仓库名/` | `站点名.netlify.app/` |
| 子路径 | 固定带 `/colorwalk/` | 可用根路径 `/` |
| NFC 链接 | 必须写完整 GitHub Pages 地址 | 写 Netlify 地址 |
| 稳定性 | GitHub 官方，一般较稳 | 视网络与套餐而定 |

## 本地预览 GitHub Pages 版

```bash
npm run build:gh-pages
npx vite preview --base /colorwalk/
```

## 若展览子路径刷新 404

确认 Actions 构建日志里执行的是 `build:gh-pages`，且 `dist/404.html` 已生成（与 `index.html` 相同，用于 SPA）。
