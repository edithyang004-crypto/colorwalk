# 展览 NFC：碰一下打开网页

## 要点（必读）

| 写法 | 碰标签后 |
|------|----------|
| **网址 / URI**（推荐） | 手机自动打开浏览器，进入展览入口页 |
| 纯文字 `NFC_START` | **不会**打开浏览器，仅能在已打开的网页里配合「触碰NFC开始」使用 |

展览现场请用 **网址**。

## 第 1 步：让电脑上的网页能访问

1. 双击 **`启动网页.command`**，等终端出现 **`ready`**（窗口不要关）。
2. 电脑浏览器打开（两个都试一下）：
   - `https://127.0.0.1:5173/exhibition/entrance`
   - `https://localhost:5173/exhibition/entrance`
3. 必须用 **`https://`**，不要用 `http://`。
4. 若提示证书不安全：点「高级」→「继续访问」。

终端里会打印 **Network** 地址，例如：

```text
https://192.168.1.23:5173/exhibition/entrance
```

手机写卡、手机测试时用这个 **IP 地址**（不要用 localhost）。

手机与电脑不同 WiFi 时：双击 **`启动外网访问.command`**，选 **1（Localtunnel）**，把终端里的 `https://xxxx.loca.lt/e` 写入芯片。

若 Cloudflare 出现 **Error 1033**，说明隧道未连上（国内较常见），请改用 Localtunnel 或同 WiFi 局域网 IP。

## 第 2 步：用写卡 App 写入「网址」

推荐 App：**NFC Tools**（iOS / Android）、**TagWriter**（NXP）。

### NFC Tools 示例

1. 写入 → 添加记录 → **URL / 网址**
2. 填入（换成你终端里显示的地址）：
   ```text
   https://192.168.1.23:5173/exhibition/entrance
   ```
   或短链（若已启动服务）：
   ```text
   https://192.168.1.23:5173/e
   ```
3. 写入标签。
4. **删除**原先单独的「文本」记录 `NFC_START`（若存在），避免混淆。

### 正式展览（部署后）

`npm run build` 上传到 HTTPS 域名后，芯片写入：

```text
https://你的域名/exhibition/entrance
```

## 第 3 步：手机测试

1. **先在手机浏览器地址栏输入** `https://电脑IP:5173/e`（同 WiFi），能打开再写 NFC。
2. 若提示 **「无法连接服务器」**：
   - 不要用流量访问 `192.168.x.x`（局域网 IP 仅同 WiFi 有效）
   - 电脑与手机是否同一 WiFi；是否连了「访客网络」
   - macOS：**系统设置 → 网络 → 防火墙** → 允许 **Node** 传入连接
   - 路由器关闭 **AP 隔离**
   - **仍不行**：双击 **`启动外网访问.command`**，把 `https://xxxx.trycloudflare.com/e` 写进 NFC（流量可用）
3. 浏览器用 **Chrome**（Android）；iPhone 可碰开网页。
4. 锁屏贴近标签 → 应弹出打开链接；首次自签名证书点「继续访问」。

## 可选：进地图仍用 NFC_START

若希望「碰标签只开入口页，进地图再碰启动标签」：

1. 芯片 A：网址 → `/exhibition/entrance`
2. 芯片 B：文本 `NFC_START` → 在入口页点「触碰NFC开始」后再碰

若希望「碰一次就进地图并打卡」，芯片直接写（**Android + iPhone 共用同一张芯片，只写这一条网址**）：

```text
https://192.168.1.23:5173/exhibition/map?nfc=02邮电所
```

把 `192.168.1.23` 换成终端 Network 里的 IP；`?nfc=` 后的内容与代码里节点的 `nfcId` 一致（见下表）。

| # | 节点 | 芯片只写这一条 URL（将 IP 换成你的局域网地址） |
|---|------|-----------------------------------------------|
| 1 | 杨府殿 | `https://IP:5173/exhibition/map?nfc=01杨府殿` |
| 2 | 邮电所 | `https://IP:5173/exhibition/map?nfc=02邮电所` |
| 3 | 去那海糖水铺 | `https://IP:5173/exhibition/map?nfc=03糖水铺` |
| 4 | 浮雕 | `https://IP:5173/exhibition/map?nfc=04浮雕` |
| 5 | 七彩住家 | `https://IP:5173/exhibition/map?nfc=05七彩住家` |
| 6 | 屏枫民宿 | `https://IP:5173/exhibition/map?nfc=06屏枫民宿` |
| 7 | 七彩楼梯 | `https://IP:5173/exhibition/map?nfc=07七彩楼梯` |
| 8 | 渔具百货店 | `https://IP:5173/exhibition/map?nfc=08渔具百货店` |
| 9 | 海上阳台 | `https://IP:5173/exhibition/map?nfc=09海上阳台` |
| 10 | 海之蓝船用设备销售中心 | `https://IP:5173/exhibition/map?nfc=10海之蓝船用设备销售中心` |
| 11 | 芙蓉馄饨铺 | `https://IP:5173/exhibition/map?nfc=11芙蓉馄饨铺` |
| 12 | 码头排档 | `https://IP:5173/exhibition/map?nfc=12码头排档` |
| 13 | 废弃工厂 | `https://IP:5173/exhibition/map?nfc=13废弃工厂` |
| 14 | 东岙沙滩 | `https://IP:5173/exhibition/map?nfc=14东岙沙滩` |
| 15 | 洞头红石滩 | `https://IP:5173/exhibition/map?nfc=15洞头红石滩` |

**不要**在同一张芯片上再添加纯文本 `02三角梅`（多条记录会干扰识别）。  
`?nfc=` 里的内容与代码里节点的 `nfcId` 一致即可，不必重复写文本记录。

- **iPhone**：无 Web NFC，碰标签 → Safari 打开上述链接 → 自动打卡。  
- **Android**：碰标签 → 打开链接打卡；若已在地图页且浏览器支持 Web NFC，读到完整 URL 也会解析 `?nfc=` 打卡。
