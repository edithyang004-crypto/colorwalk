/** Web NFC 工具：支持检测、NDEF 文本解码、错误文案 */

export const NFC_START_TOKEN = 'NFC_START'

/** 当前环境是否支持 Web NFC API */
export function isNfcSupported() {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

/**
 * 解码 NDEF text 记录（跳过语言码前缀）
 * @param {NDEFRecord} record
 * @returns {string}
 */
export function decodeNdefText(record) {
  if (!record || record.recordType !== 'text' || !record.data) return ''

  const buffer =
    record.data instanceof ArrayBuffer
      ? record.data
      : record.data.buffer instanceof ArrayBuffer
        ? record.data.buffer
        : null
  if (!buffer) return ''

  const view = new DataView(buffer)
  if (view.byteLength < 1) return ''

  const status = view.getUint8(0)
  const langLen = status & 0x3f
  const encoding = status & 0x80 ? 'utf-16' : 'utf-8'
  const textStart = 1 + langLen
  if (textStart >= view.byteLength) return ''

  const payload = buffer.slice(textStart)
  try {
    return new TextDecoder(encoding).decode(payload)
  } catch {
    return new TextDecoder('utf-8').decode(payload)
  }
}

/**
 * 从 NDEF 消息中提取可读文本（text 优先，url 记录作备选）
 * @param {NDEFMessage} message
 * @returns {string}
 */
export function extractTextFromNdefMessage(message) {
  if (!message?.records?.length) return ''

  const parts = []
  for (const record of message.records) {
    if (record.recordType === 'text') {
      const text = decodeNdefText(record)
      if (text) parts.push(text)
    } else if (record.recordType === 'url' && record.data) {
      try {
        const url = typeof record.data === 'string' ? record.data : new TextDecoder().decode(record.data)
        if (url) parts.push(url)
      } catch {
        /* ignore */
      }
    }
  }
  return parts.join(' ')
}

/**
 * 判断读取内容是否为展览启动令牌
 * @param {string} raw
 */
export function isNfcStartToken(raw) {
  return String(raw).trim() === NFC_START_TOKEN
}

/**
 * 将 DOMException / 通用错误映射为中文提示
 * @param {unknown} err
 * @returns {string}
 */
export function mapNfcError(err) {
  const name = err?.name || ''
  const message = err?.message || ''

  if (name === 'NotAllowedError') {
    return '需要 NFC 权限，请在系统设置中允许'
  }
  if (name === 'NotSupportedError' || message.includes('secure context')) {
    return '请在 HTTPS 环境下打开（开发服务器已支持）'
  }
  if (name === 'AbortError') {
    return '扫描已取消'
  }
  if (name === 'NetworkError' || message.toLowerCase().includes('cancel')) {
    return '未检测到标签，请靠近后重试'
  }
  return '读取失败，请重试或选择跳过进入'
}
