# Colorwalk 设计规范 (Lively Everyday V5 - Mobile)

## 1. 品牌理念与视觉基调
**核心理念**：缓解压力，通过捕捉日常色彩重新发现生活的美好。
**视觉基调**：活泼 (Lively)、日常 (Everyday)、亲切 (Friendly)、具有呼吸感 (Breathable)。
**设计语言**：Luminous Travel - Lively Edition。在极简中性色调中注入律动感，通过圆润的组件、柔和的投影和动态排版营造一种“色彩手帐”的氛围。

---

## 2. 色彩系统 (Color System)
严格遵循指定的极简四色体系，杜绝橙色、墨绿色。

*   **Surface (基底)**: `#F4EFE4` (奶油白) - 核心主色，营造温馨、轻盈的底色。
*   **Ink/Primary (主文字)**: `#302E2E` (香墨) - 用于所有关键标题、主要正文及重要按钮背景。
*   **Stone/Secondary (次文字)**: `#5A5B57` (石褐) - 用于副标题、说明文字及次级交互元素。
*   **Sage/Muted (辅助色)**: `#929185` (鼠尾草) - 用于占位符、不活跃状态及微弱的装饰线条。

---

## 3. 排版系统 (Typography)
*   **字体族**: `Source Han Sans SC` (思源黑体)。
*   **Display**: 24-28px / Bold (首页口号)。
*   **Headline**: 18-20px / Bold (页标题)。
*   **Body**: 14-16px / Regular / Line-height 1.6 (正文描述)。
*   **Label**: 12px / Medium (微型标签、数据信息)。

---

## 4. 布局与交互 (Mobile Layout & Flow)
*   **无底部导航栏**：强调沉浸感，通过页面逻辑流转。
*   **首页交互**：全屏地图作为背景，底部半屏浮层 (Handle) 展示每日灵感与历史，点击“新建路径”触发全屏转场。
*   **转盘交互**：12色转盘，支持手势旋转或点击中心“Begin”。
*   **安全边距**：统一 20px 侧边距。
*   **组件圆角**：容器圆角统一为 20px - 28px，传达友好感。
*   **阴影规范**：`0 8px 24px rgba(48, 46, 46, 0.08)` - 极轻盈的纸张浮动感。

---

## 5. 组件规范 (Core Components)
*   **Floating Panel (半屏浮层)**：顶部带有圆润 Handle，背景色为 Surface 或半透明模糊。
*   **Intention Wheel (意图转盘)**：12等分，色彩饱满，中心具备明确的交互反馈。
*   **Color Card (色卡)**：类似拍立得或手账贴纸风格，包含色块、诗意名称与 Hex 值。
*   **Aesthetic Log (漫游记录)**：时间轴流线型排版，球形节点连接色彩发现。
