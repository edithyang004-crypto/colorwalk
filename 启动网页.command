#!/bin/bash
cd "$(dirname "$0")"

echo "=========================================="
echo "  Colorwalk 本地开发服务器"
echo "=========================================="

if ! command -v npm >/dev/null 2>&1; then
  echo ""
  echo "未找到 npm，请先安装 Node.js：https://nodejs.org"
  read -r -p "按回车键关闭…"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "未找到 node，请先安装 Node.js"
  read -r -p "按回车键关闭…"
  exit 1
fi

echo "Node $(node -v) · npm $(npm -v)"
echo "正在安装依赖（首次较慢）…"
npm install || {
  echo "npm install 失败，请检查网络后重试"
  read -r -p "按回车键关闭…"
  exit 1
}

# 优先 Wi-Fi 网卡 IP（避免把 VPN/虚拟网卡 IP 写进 NFC）
get_lan_ip() {
  local ip=""
  for iface in en0 en1 bridge0; do
    ip="$(ipconfig getifaddr "$iface" 2>/dev/null)"
    [ -n "$ip" ] && echo "$ip" && return 0
  done
  ifconfig 2>/dev/null | awk '/inet / {
    gsub(/\/.*/, "", $2);
    if ($2 !~ /^127\./ && $2 !~ /^169\.254\./ && $2 !~ /^240\./ && $2 !~ /^0\./) print $2
  }' | head -1
}

LAN_IP="$(get_lan_ip)"

URL_LOCAL="https://127.0.0.1:5173/"
EXHIBITION_URL="https://127.0.0.1:5173/exhibition/entrance"
COLORWALK_URL="https://127.0.0.1:5173/"

if lsof -i :5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo ""
  PORT_PID="$(lsof -t -i :5173 -sTCP:LISTEN 2>/dev/null | head -1)"
  PORT_CWD=""
  if [ -n "$PORT_PID" ]; then
    PORT_CWD="$(lsof -a -p "$PORT_PID" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"
  fi
  if [ -n "$PORT_CWD" ] && [ "$PORT_CWD" = "$(pwd)" ]; then
    echo "✓ 端口 5173 已被【本项目 test2】占用，无需再启动。"
    echo "  请直接在浏览器打开（若页面旧，请强制刷新 Cmd+Shift+R）："
  else
    echo "端口 5173 已被占用（可能已有服务在跑）。"
    if [ -n "$PORT_CWD" ]; then
      echo "  当前占用目录：${PORT_CWD}"
    fi
    echo "⚠️  若占用来自上级目录的 test/ 项目，浏览器里看到的可能是旧版页面。"
    echo "    请先关掉其它 Vite 窗口，或只在本 test2 目录启动。"
    echo "若终端里已有本项目的 Vite，请直接在浏览器打开："
  fi
  echo "  转盘选色：${COLORWALK_URL}"
  echo "  展览模式：${EXHIBITION_URL}"
  echo "  节点4浮雕：${COLORWALK_URL}exhibition/map?nfc=04浮雕"
  echo ""
  if [ -n "$PORT_CWD" ] && [ "$PORT_CWD" = "$(pwd)" ]; then
    if curl -k -s -o /dev/null "https://127.0.0.1:5173/" 2>/dev/null; then
      open "${EXHIBITION_URL}" 2>/dev/null || true
    fi
    read -r -p "按回车键关闭本窗口…"
    exit 0
  fi
  read -r -p "仍要再启动一次？按回车继续，或 Ctrl+C 取消…"
fi

echo ""
echo "【电脑 · Colorwalk 转盘选色】${COLORWALK_URL}"
echo "  进入后点「+ 新建路径」→ 紫色裁切转盘 + 中心按钮转动"
echo "【电脑 · 展览模式】${EXHIBITION_URL}"
echo "  （须 https://；证书警告点「继续访问」）"
echo ""
if [ -n "$LAN_IP" ]; then
  echo "【手机 · 同 WiFi】请在手机浏览器先试（不要先碰 NFC）："
  echo "  https://${LAN_IP}:5173/e"
  echo "  能打开后，再把上面这一行写进 NFC 芯片。"
else
  echo "【手机】未检测到 Wi-Fi IP，启动后看终端 Vite 的 Network 行。"
fi
echo ""
echo "【手机显示「无法连接服务器」时】"
echo "  ① 手机与电脑必须同一 WiFi（不要用手机流量试局域网 IP）"
echo "  ② 系统设置 → 网络 → 防火墙：允许 Node / 终端 传入连接"
echo "  ③ 路由器关闭「AP 隔离 / 访客网络隔离」"
echo "  ④ 仍不行 → 关掉本窗口，双击「启动外网访问.command」（用流量也能开）"
echo ""
echo "正在启动（局域网模式，手机可访问）… 看到 ready 后勿关窗口。"
echo "=========================================="
echo ""

wait_for_server() {
  for _ in $(seq 1 60); do
    if curl -k -s -o /dev/null -w "%{http_code}" "https://127.0.0.1:5173/" 2>/dev/null | grep -q 200; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

check_phone_reachable() {
  [ -z "$LAN_IP" ] && return 1
  curl -k -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "https://${LAN_IP}:5173/" 2>/dev/null | grep -q 200
}

print_listen_status() {
  echo ""
  echo "━━━━ 服务状态 ━━━━"
  if lsof -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | grep -qE '(\*|0\.0\.0\.0):5173'; then
    echo "  监听：已开启局域网（0.0.0.0:5173）"
  else
    echo "  监听：仅本机 — 手机无法通过 IP 访问！"
    echo "  请关闭后重新双击本脚本，或使用「启动外网访问.command」"
  fi
  if [ -n "$LAN_IP" ]; then
    if check_phone_reachable; then
      echo "  手机连通性：本机模拟访问 ${LAN_IP} 成功 ✓"
      echo "  NFC / 手机请用：https://${LAN_IP}:5173/e"
    else
      echo "  手机连通性：本机无法通过 ${LAN_IP} 访问（防火墙或仅本机监听）"
      echo "  → 请双击「启动外网访问.command」获取公网链接写进 NFC"
    fi
  fi
  echo "━━━━━━━━━━━━━━━━━━"
  echo ""
}

open_exhibition() {
  if wait_for_server; then
    print_listen_status
    echo "正在打开 Colorwalk 主页（含转盘）…"
    open "${COLORWALK_URL}" 2>/dev/null || true
    echo "电脑：${COLORWALK_URL}"
  else
    echo "未能检测到服务，请手动打开：${EXHIBITION_URL}"
  fi
}

open_exhibition &
OPEN_PID=$!

if ! npm run dev; then
  kill "$OPEN_PID" 2>/dev/null
  echo ""
  echo "启动失败。可尝试：npm run dev:local（仅电脑）"
  echo "手机访问请用：启动外网访问.command"
  read -r -p "按回车键关闭…"
  exit 1
fi
