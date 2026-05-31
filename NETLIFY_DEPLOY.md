# Netlify 部署清单（Colorwalk）

按顺序做完下面步骤，可避免上次「dist / publish directory」类错误。

---

## 一、本地先确认能构建

在项目根目录执行：

```bash
npm install
npm run build
```

成功后会生成 **`dist/`** 文件夹，里面有 `index.html` 和 `assets/`。  
`dist` 已在 `.gitignore` 中，**不要**把 `dist` 提交到 Git；由 Netlify 在云端执行 `npm run build` 生成。

---

## 二、把代码推到 GitHub

1. 在 GitHub 新建仓库（或沿用已有仓库）。
2. 确保仓库里包含这些文件：
   - `package.json`、`package-lock.json`
   - `netlify.toml`（本文件已写好构建命令与发布目录）
   - `public/_redirects`
   - **不要**提交 `.env`（含密钥，已在 `.gitignore`）

---

## 三、在 Netlify 连接仓库

1. 打开 [https://app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**。
2. 选 **GitHub**，授权并选中你的仓库。
3. **Build settings**（重要，上次失败多半在这里）：

| 项 | 应填写的值 | 错误示例 |
|----|------------|----------|
| **Branch to deploy** | `main` 或你的主分支 | — |
| **Build command** | `npm run build` | 留空、或 `vite` |
| **Publish directory** | **`dist`** | `.`、`/`、`留空`、项目根目录 |

> 仓库里已有 `netlify.toml` 时，Netlify 会自动读取上述设置。若控制台里曾手动改过，请改成与上表一致，或点击 **Use settings from netlify.toml**。

4. 直接 **Deploy site**（地图使用 Leaflet + OpenStreetMap，无需 API Key 环境变量）。

---

## 四、首次部署与验证

1. **Deploy site**，等待 Build 日志出现 `npm run build` 且 **Published** 成功。
2. 打开 `https://你的站点名.netlify.app/`
3. 测试：
   - 首页能打开
   - 直接访问 `https://你的站点名.netlify.app/map` 不 404（依赖 SPA 重定向）
   - 地图页能显示 OpenStreetMap 底图与示范路线

---

## 常见问题

### 1. 部署成功但打开是 404 / Page not found

- **Publish directory** 必须是 **`dist`**，不能是项目根目录。
- 确认 `public/_redirects` 和 `netlify.toml` 里的 `/* → /index.html` 已随仓库上传。

### 2. 网站能开，地图空白或瓦片加载失败

- 多为网络无法访问 OpenStreetMap 瓦片服务器；可稍后重试或换网络。
- 浏览器控制台是否有跨域或混合内容（须 HTTPS）报错。

### 3. Build 失败

- 查看 Deploy log；本地先执行 `npm run build` 能否通过。
- Node 版本：项目使用 Node **20**（见 `.nvmrc` / `netlify.toml`）。

### 4. 控制台与 netlify.toml 冲突

若 UI 里 Build command / Publish directory 与 `netlify.toml` 不一致，以 **`netlify.toml` 为准** 或把 UI 改成与本文第二节表格一致。

### 5. 手动上传 dist 时注意

1. 先在本机执行 `npm run build`（每次改代码后都要重新打包），或双击 **`打包上传Netlify.command`**。
2. 打开 **`dist` 文件夹**，选中其中**全部内容**（`index.html`、`assets/`、`_redirects`、`images/`、`videos/` 等）拖入 Netlify Deploys。
3. **不要**拖整个 `dist` 文件夹本身（否则网址会变成 `/dist/index.html`）。
4. **不要**上传 `dist` 里的子文件夹（如 `用所选项目新建的文件夹`）——那是旧副本，上传后网站不会变。
5. **不要**上传带 ` 2.js` 后缀的重复文件（macOS 复制产生的副本），上传前可删掉 `dist/assets` 里名称含 ` 2.` 的文件。

### 5a. `_redirects` 无法上传 / 提示格式不对

- Finder 里文件名旁有 **云图标**、图标是 **问号**：说明文件还在 iCloud，**未下载到本机**，Netlify 拖不进去。
- **手动部署没有网页里填重定向的菜单**（新版 Netlify 主要靠文件配置）。
- **推荐做法**：运行 `打包上传Netlify.command` 后，把 **`dist/netlify.toml`** 和 `index.html` 等**一起**拖进 Deploys。该文件内容等价于 `_redirects`，展览子路径刷新才不会 404。
- `_redirects` 可以不上传；有 `netlify.toml` 即可。

### 5b. 改了代码但 iPad 上「一点变化也没有」

**常见原因不是没改成功，而是 iPad 还在用旧缓存。**

1. **确认线上已是新包（电脑浏览器）**  
   打开 `https://comforting-chebakia-ec1122.netlify.app/` → 右键「查看网页源代码」，应看到类似：  
   `<script … src="/assets/index-xxxxx.js">`  
   且页面加载后顶部白条会短暂显示 **`已就绪 · 版本 2026-05-31 …`**（有这行才是新包）。

2. **iPad 必须清缓存**  
   设置 → Safari → **清除历史记录与网站数据**，再打开；或 **无痕浏览** 访问展览页。

3. **确认打开的是展览地图**  
   NFC 应指向：  
   `https://comforting-chebakia-ec1122.netlify.app/exhibition/map?nfc=07七彩楼梯`  
   不要只打开首页 `/` 就以为在看展览卡片。

4. **Netlify 手动部署后**  
   Deploys 列表最上面一条应是 **Published** 且时间刚才是你上传的时刻。

### 6. 手机 / iPad 显示「无法启动 · 加载失败」

页面提示「会请求 `/src/main.js`」时，说明线上仍是**未打包的开发版首页**，或设备缓存了旧页面。

**在 Netlify 检查（必做）：**

| 项 | 正确值 |
|----|--------|
| Build command | `npm run build` |
| Publish directory | **`dist`**（不能是 `.` 或留空） |

保存后点击 **Deploys → Trigger deploy → Clear cache and deploy site**。

**在 iPad 上：**

1. 用正式地址：`https://comforting-chebakia-ec1122.netlify.app/`（不要用 `6a1beb03…--站点名.netlify.app` 这类带 deploy 编号的预览链，除非确认该次部署已成功）。
2. **设置 → Safari → 清除历史记录与网站数据**，再重新打开。
3. 若仍异常：在地址栏长按刷新，或关闭该标签页重新输入网址。

**自检：** 在电脑浏览器打开首页 → 查看源代码，应看到  
`<script … src="/assets/index-xxxxx.js">`  
而不是 `import('/src/main.js')`。

---

## 七、部署成功后你的网址

Netlify 默认地址：

```text
https://<你的站点名>.netlify.app/
https://<你的站点名>.netlify.app/map
```

可在 **Domain management** 里绑定自己的域名。

### 改了 Project name / Site name 后出现 Page not found

在 Netlify 里**改名 = 换了一个新的 `xxx.netlify.app` 子域名**，旧地址会失效。

- 例如旧链 `https://comforting-chebakia-ec1122.netlify.app/` 改名后往往会变成 **404**（已无法访问）。
- 请在 Netlify 站点首页顶部 **Domain management** 或站点卡片上查看**当前**地址，形如 `https://新名字.netlify.app/`。
- **NFC 标签、书签、发给别人的链接** 必须全部改成新地址；展览页示例：  
  `https://新名字.netlify.app/exhibition/map?nfc=07七彩楼梯`
- 若**新地址**首页也 404：说明还没部署成功，请重新拖入完整 `dist`（含 `index.html`、`netlify.toml`、`assets`）。
