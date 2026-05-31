#!/bin/bash
cd "$(dirname "$0")"

echo "=========================================="
echo "  Colorwalk · 打包供 Netlify 手动上传"
echo "=========================================="

if ! command -v npm >/dev/null 2>&1; then
  echo "未找到 npm，请先安装 Node.js：https://nodejs.org"
  read -r -p "按回车键关闭…"
  exit 1
fi

# 删除 dist 里 macOS 复制产生的旧子文件夹，避免误拖进 Netlify
rm -rf dist/用所选项目* dist/未命名* dist/"images 2" dist/"videos 2" 2>/dev/null

echo "正在安装依赖并打包…"
npm install && npm run build || {
  echo "打包失败，请把终端里的报错发给我。"
  read -r -p "按回车键关闭…"
  exit 1
}

JS_FILE=$(grep -oE 'assets/index-[^"]+\.js' dist/index.html | head -1)
BUILD=$(grep -oE 'content="[^"]+"' dist/index.html | grep cw-build | head -1 | tr -d '"')

echo ""
echo "✓ 已生成 dist/（请上传这一层里的文件，不是子文件夹）"
echo "  JS 包：${JS_FILE:-（未找到）}"
echo "  版本：${BUILD:-（见 index.html meta cw-build）}"
echo ""
echo "上传步骤（Netlify → Deploys → 拖入手动部署）："
echo "  1. 打开 dist 文件夹"
echo "  2. 选中 index.html、netlify.toml、assets、images、videos"
echo "  3. 拖进 Deploy manually（不要拖 dist 文件夹本身）"
echo ""
echo "  _redirects 传不了可以不上传，只要有 netlify.toml 即可。"
echo ""
echo "iPad 仍像旧版时："
echo "  · 设置 → Safari → 清除历史记录与网站数据"
echo "  · 或用无痕模式打开展览页"
echo "  · 启动后顶部应短暂显示「已就绪 · 版本 日期」"
echo ""
echo "展览测试链接："
echo "  https://comforting-chebakia-ec1122.netlify.app/exhibition/map?nfc=07七彩楼梯"
echo ""
open dist

read -r -p "按回车键关闭…"
