# Colorwalk · 色彩漫步

移动端优先的纯前端「色彩漫步」网页工具。可在任意城市、校园或街区使用；内置温州洞头村第一段示范路线（WGS84、OpenStreetMap 底图、约 850 米 / 20 分钟、34 个轨迹点与 9 处采色），供欣赏与学习。

## 功能

- **开屏地图**：打开即见 Leaflet 灰度地图与历史彩色足迹、色彩点
- **Welcome 半屏**：介绍与「+ 新建路径」「画廊」浮动按钮；上滑查看历史路径与洞头村示范
- **右上角菜单**：Welcome / 示范作品 / 关于
- **行进中**：全屏地图、GPS 轨迹、拍照提色
- **画廊**：色卡、路线、拼贴（`/gallery`）
- **示范**（`/demo`）：洞头村第一段 Colorwalk 展示（与 `demoWalk.js` 数据一致）

## 快速开始

> **不要双击打开 `index.html`**，也不要把 `coords-七彩洞头村.txt` 或地图分享链接当网页打开。  
> 请双击 **`启动网页.command`**（或 `npm run dev` / `npm run dev:network`），电脑访问 **https://127.0.0.1:5173/**（推荐；`localhost` 若不行请用 127.0.0.1）。必须用 **`https://`**，`http://` 打不开。

**若提示无法访问 / 连接被拒绝：**

1. 确认终端里 Vite 已显示 `ready`，且窗口未关闭。
2. 优先试 **`https://127.0.0.1:5173/exhibition/entrance`**，再试 `https://localhost:5173/`。
3. 自签名证书：Chrome 点「高级」→「继续前往 localhost」；Safari 点「访问此网站」。
4. 若 `npm run dev` 启动报错（网络接口相关），项目已默认绑定 `127.0.0.1`；仍失败时在项目目录执行 `npm install` 后重试。
5. 手机同 WiFi：执行 `npm run dev:network`，用终端里 `Network: https://192.168.x.x:5173/`。

### 在手机上预览（开发环境）

**同一 WiFi（局域网）**

1. 电脑与手机连接**同一 WiFi**。
2. 终端执行 `npm run dev:network`，或双击 **`启动网页.command`**（已默认走局域网模式，终端会打印 `Network` 地址）。
3. 在手机浏览器输入终端里 **`Network:`** 那一行的完整地址，例如 `https://192.168.1.23:5173/`（**必须是 `https://`**，不要用 `http://`，也不要在手机里输入 `localhost`——`localhost` 指的是手机自己）。
4. 首次访问自签名证书时，选择「继续访问 / 显示详细信息后访问」；否则页面或定位可能异常。
5. **不要用**电脑上的 `https://localhost:5173/` 给手机用——手机打不开你电脑上的 localhost。

**手机用流量 / 与电脑不同 WiFi**

双击 **`启动外网访问.command`**，把终端里出现的 `https://xxxx.trycloudflare.com` 整段复制到手机浏览器打开。

### 手机用流量 / 任意网络访问（推荐实地调试）

任选其一：

| 方式 | 操作 | 适用 |
|------|------|------|
| **外网隧道** | 双击 `启动外网访问.command`，把终端里的 `https://xxx.trycloudflare.com` 发到手机 | 电脑随身、临时调试 |
| **正式部署** | `npm run build` 后把 `dist/` 上传到 HTTPS 静态托管 | 展览、长期可用 |

**外网隧道步骤：**

1. 双击 `启动外网访问.command`（或终端执行 `npm run dev:tunnel`）。
2. 等待出现 `https://xxxx.trycloudflare.com`（每次可能不同）。
3. 手机用 **流量或 WiFi** 均可打开该链接；电脑需保持运行且不要休眠。
4. 地图使用 **Leaflet + OpenStreetMap**，无需 API Key；若瓦片加载慢，多为网络原因。

**正式部署（流量/WiFi 都能用，不依赖电脑）：**

```bash
npm run build
# 将 dist/ 部署到 Vercel / Netlify / Cloudflare Pages / 阿里云 OSS 等（必须 HTTPS）
```

```bash
npm install
npm run dev
```

### 地图

底图为 [OpenStreetMap](https://www.openstreetmap.org/) 瓦片（经 Leaflet 加载），无需注册 Key。部署到任意 HTTPS 静态托管即可。

### 展览模式 NFC 入口（`/exhibition/entrance`）

| 问题 | 原因与处理 |
|------|------------|
| 电脑 `localhost` 打不开 | 先双击 **`启动网页.command`**，等终端出现 `ready`；地址用 **`https://`**（不是 `http://`）；证书警告点「继续访问」 |
| 手机碰 NFC 没反应 | 若芯片只写了文字 **`NFC_START`**，系统**不会**自动打开浏览器；须先用 **Android Chrome** 打开入口页 → 点「触碰NFC开始」→ 再碰标签 |
| 希望碰一下就开网页 | NFC 芯片写入 **网址（URI）**，例如 `https://你的IP:5173/e` 或 `/exhibition/entrance`（详见 **`NFC写卡说明.md`**） |

## 示范作品数据

第一段洞头村路线定义在 [`src/data/demoWalk.js`](src/data/demoWalk.js)：WGS84 坐标、34 个 `trackPoints`、9 个 `colorNodes` / `photos`（与《更新范例作品》一致）。当前照片 `url` 为内联 SVG 占位图；展览前可将真实图片放入 `public/demoPhotos/photo_1.jpg` … `photo_9.jpg`（或 `src/data/demoPhotos/` 并用 Vite 资源引用），再在 `demoWalk.js` 中把各 `url` 改为对应路径（单张建议 100–200KB）。

## 构建

```bash
npm run build
npm run preview
```

## 技术栈

Vue 3 · Vite · Pinia · Vue Router · Leaflet · OpenStreetMap · chroma-js · idb-keyval · Lucide Icons

数据存储在用户浏览器 IndexedDB，无后端。

## 部署

### Netlify（推荐）

完整步骤见 **[NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)**。

要点：

- **Build command**：`npm run build`
- **Publish directory**：**`dist`**（不能是 `.` 或项目根目录）
- 无需地图 API Key；按 `netlify.toml` 构建即可

### 其他托管

将 `npm run build` 生成的 `dist/` 目录上传到任意 **HTTPS** 静态托管；SPA 需配置「所有路径 → index.html」回退。
