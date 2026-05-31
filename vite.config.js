import os from 'node:os'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

/** 外网隧道专用：DEV_HTTP=1 时用 HTTP，避免 cloudflared 连不上自签名 HTTPS */
const useHttp = process.env.DEV_HTTP === '1'
const devPort = Number(process.env.DEV_PORT) || 5173
const isNetwork =
  process.env.DEV_HOST === '0.0.0.0' || process.env.DEV_NETWORK === '1'

function pickLanIp() {
  try {
    const ifaces = os.networkInterfaces()
    for (const name of ['en0', 'en1', 'bridge0']) {
      for (const iface of ifaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address
      }
    }
  } catch {
    // 部分 macOS / 沙箱环境无法读取网卡列表
  }
  return undefined
}

const lanIp = process.env.DEV_HMR_HOST || pickLanIp()

/** 手机走局域网 IP 时，HMR 不能指向 localhost，否则页面可能白屏 */
function buildHmr() {
  if (!isNetwork) return undefined
  if (!lanIp) return false
  if (useHttp) return { host: lanIp, port: devPort }
  return { host: lanIp, protocol: 'wss', port: devPort }
}

/** 写入 index.html，便于 iPad 上确认是否加载到最新部署包 */
function buildStampPlugin() {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return {
    name: 'cw-build-stamp',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta name="cw-build" content="${stamp}" />`,
      )
    },
  }
}

/** GitHub Pages 项目站：https://<用户>.github.io/colorwalk/ */
const ghPagesBase =
  process.env.GITHUB_PAGES === 'true' ? '/colorwalk/' : undefined

export default defineConfig({
  plugins: [vue(), buildStampPlugin(), ...(useHttp ? [] : [basicSsl()])],
  // 根域名（Netlify 等）用 '/'；GitHub Pages 仓库页用 '/colorwalk/'
  base: process.env.VITE_BASE_PATH || ghPagesBase || '/',
  appType: 'spa',
  build: {
    // 展览用 iPad 可能较旧，避免 ES2020+ 语法导致整页脚本不执行
    target: 'es2015',
    cssTarget: 'safari11',
  },
  server: {
    // 默认 127.0.0.1：避免 host:true 在部分 macOS 上 uv_interface_addresses 报错导致无法启动
    // 手机同 WiFi 预览请用 npm run dev:network
    // 使用字符串 '0.0.0.0'，避免 host:true 在部分 macOS 上触发 uv_interface_addresses 报错
    host: isNetwork ? '0.0.0.0' : process.env.DEV_HOST || '127.0.0.1',
    https: !useHttp,
    open: '/',
    port: devPort,
    strictPort: true,
    allowedHosts: isNetwork ? true : undefined,
    hmr: buildHmr(),
  },
  preview: {
    host: '127.0.0.1',
    https: true,
    port: 4173,
    strictPort: true,
  },
})
