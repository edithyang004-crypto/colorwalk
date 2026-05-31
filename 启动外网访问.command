#!/bin/bash
# 外网隧道：手机用流量也能访问。国内优先 Localtunnel，Cloudflare 作备选。
cd "$(dirname "$0")"

TUNNEL_PORT=5174
ORIGIN="http://127.0.0.1:${TUNNEL_PORT}"

if ! command -v npm >/dev/null 2>&1; then
  echo "未找到 npm，请先安装 Node.js：https://nodejs.org"
  read -r -p "按回车键关闭…"
  exit 1
fi

npm install

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Colorwalk · 外网访问"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  ① 启动本地服务（端口 ${TUNNEL_PORT}，专供隧道）"
echo "  ② 建立公网链接（国内推荐 Localtunnel）"
echo "  ③ 把终端里「展览入口」整行复制到手机 / 写进 NFC"
echo ""
echo "  勿关本窗口；关闭即失效。若曾出现 Cloudflare 1033，请用本脚本默认方式。"
echo ""

cleanup() {
  [ -n "$VITE_PID" ] && kill "$VITE_PID" 2>/dev/null
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  rm -f "$URL_SENTINEL" 2>/dev/null
}
trap cleanup EXIT INT TERM

URL_SENTINEL="$(mktemp "${TMPDIR:-/tmp}/colorwalk-tunnel-url.XXXXXX")"
rm -f "$URL_SENTINEL"

show_urls() {
  local base="$1"
  local name="$2"
  [ -z "$base" ] || [ -e "$URL_SENTINEL" ] && return 0
  : >"$URL_SENTINEL"
  echo ""
  echo "  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
  echo "  ┃  ${name} — 手机复制下面「展览入口」整行                          ┃"
  echo "  ┃  ${base}/e"
  echo "  ┃  （Localtunnel 首次可能要点「Continue」继续）                  ┃"
  echo "  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
  echo ""
}

wait_origin() {
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "${ORIGIN}/" 2>/dev/null | grep -q 200; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# 若 5174 已被占用，尝试复用
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "${ORIGIN}/" 2>/dev/null | grep -q 200; then
  echo "  检测到 ${TUNNEL_PORT} 已有服务，跳过启动 Vite。"
  VITE_PID=""
else
  echo "  正在启动 Vite（${ORIGIN}）…"
  npm run dev:tunnel >/dev/null 2>&1 &
  VITE_PID=$!
  if ! wait_origin; then
    echo ""
    echo "  错误：本地 ${ORIGIN} 未就绪。请关闭占用 ${TUNNEL_PORT} 的程序后重试。"
    read -r -p "按回车键关闭…"
    exit 1
  fi
  echo "  本地服务已就绪。"
fi

echo ""
echo "  选择隧道（直接回车 = 1）："
echo "    1) Localtunnel（国内推荐，避免 Cloudflare 1033）"
echo "    2) Cloudflare trycloudflare"
echo ""
read -r -p "  请输入 1 或 2 [默认 1]: " TUNNEL_CHOICE
TUNNEL_CHOICE="${TUNNEL_CHOICE:-1}"

rm -f "$URL_SENTINEL"

run_localtunnel() {
  echo ""
  echo "  正在建立 Localtunnel…"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npx --yes localtunnel --port "$TUNNEL_PORT" 2>&1 | while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "$line"
    url=$(printf '%s\n' "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.loca\.lt' | head -1)
    if [ -n "$url" ]; then
      show_urls "$url" "Localtunnel"
    fi
  done
}

run_cloudflared() {
  echo ""
  echo "  正在建立 Cloudflare 隧道（若出现 1033，请 Ctrl+C 后改用方式 1）…"
  echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npx --yes cloudflared@latest tunnel --url "$ORIGIN" 2>&1 | while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "$line"
    url=$(printf '%s\n' "$line" | grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' | head -1)
    if [ -n "$url" ]; then
      show_urls "$url" "Cloudflare"
    fi
  done
}

case "$TUNNEL_CHOICE" in
  2) run_cloudflared ;;
  *) run_localtunnel ;;
esac
