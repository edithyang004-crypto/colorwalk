/** 七彩洞头村展览节点数据与地图配置 */

import chroma from 'chroma-js'
import { isVideoUrl } from '../utils/videoMedia.js'

/** 地图中心坐标（七彩洞头村） */
export const MAP_CENTER = {
  lat: 27.8224083,
  lng: 121.1487159,
}

/** 地图初始缩放级别 */
export const MAP_INITIAL_ZOOM = 16

/** iPhone 等无法用 Web NFC 时，URL 查询参数名（例：/exhibition/map?nfc=01杨府殿） */
export const NFC_URL_QUERY_KEY = 'nfc'

/** 展览地图路由路径（不含域名） */
export const EXHIBITION_MAP_PATH = '/exhibition/map'

/** 展览节点列表（共 15 个） */
export const EXHIBITION_NODES = [
  {
    id: 'node-1',
    number: 1,
    name: '杨府殿',
    lat: 27.822373,
    lng: 121.148099,
    mainColor: '#c92828',
    colorName: '香火红',
    cardLocation: '杨府殿',
    /** 同一张卡片内多段采色（香火红 + 三角梅红） */
    cardSections: [
      {
        colorName: '香火红',
        mainColor: '#c92828',
        story: '老庙香火，承载了过去的故事',
        cardPhotos: [
          {
            url: '/videos/yangfu-dian-web.mp4',
            orientation: 'landscape',
            type: 'video',
            poster: '/images/yangfu-dian-video-poster.jpg',
          },
          { url: '/images/node-1.png', orientation: 'landscape' },
          { url: '/images/node-1-2.png', orientation: 'landscape' },
          { url: '/images/node-1-3.png', orientation: 'landscape' },
        ],
      },
      {
        colorName: '三角梅红',
        mainColor: '#c93851',
        colors: ['#c93851', '#d4a574', '#8b4545'],
        story: '来自洞头村民宿和街角的三角梅花朵',
        cardPhotos: [
          { url: '/images/node-2.jpg', orientation: 'portrait' },
          { url: '/images/node-2-2.jpg', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '01杨府殿',
  },
  {
    id: 'node-2',
    number: 2,
    name: '洞头邮电所',
    lat: 27.8225839,
    lng: 121.148724,
    mainColor: '#169a71',
    colorName: '邮电绿',
    cardLocation: '洞头邮电所',
    cardSections: [
      {
        colorName: '邮电绿',
        mainColor: '#169a71',
        colors: ['#169a71', '#f37021', '#ffcc00'],
        story: '能吃饭的邮电所',
        cardPhotos: [
          { url: '/images/post-office-1.png', orientation: 'landscape' },
          { url: '/images/post-office-2.png', orientation: 'landscape' },
          { url: '/images/post-office-3.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '02邮电所',
  },
  {
    id: 'node-3',
    number: 3,
    name: '去那海糖水铺',
    lat: 27.8227689,
    lng: 121.1490995,
    mainColor: '#e5ae79',
    colorName: '暖杏仁',
    cardLocation: '去那海糖水铺',
    cardSections: [
      {
        colorName: '暖杏仁',
        mainColor: '#e5ae79',
        colors: ['#e5ae79', '#f0c89a', '#c8925e'],
        story: '村中的休闲地',
        cardPhotos: [
          { url: '/images/qunahai-warm-almond.png', orientation: 'landscape' },
        ],
      },
      {
        colorName: '天幕黄',
        mainColor: '#efd474',
        colors: ['#efd474', '#f8e9a8', '#d4b84a'],
        cardPhotos: [
          { url: '/images/qunahai-sky-yellow.png', orientation: 'landscape' },
          { url: '/images/qunahai-pool-1.png', orientation: 'portrait' },
          { url: '/images/qunahai-pool-2.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '03糖水铺',
  },
  {
    id: 'node-4',
    number: 4,
    name: '浮雕',
    lat: 27.8227902,
    lng: 121.149137,
    mainColor: '#c5a490',
    colorName: '石灰色',
    cardLocation: '浮雕',
    cardSections: [
      {
        colorName: '石灰色',
        mainColor: '#c5a490',
        colors: ['#c5a490', '#d8b9a6', '#9a7f6e'],
        story:
          '庭院石墙上的浅浮雕：福船破浪、祥云翻涌，是海上丝路远行的记忆；另一侧「鱼」字从象形到篆隶，鎏金笔画嵌进暖灰大理石。海风与墨痕同刻一石，静看潮起潮落。',
        cardPhotos: [
          { url: '/images/relief-1.png', orientation: 'landscape' },
          { url: '/images/relief-2.png', orientation: 'landscape' },
          { url: '/images/relief-3.png', orientation: 'landscape' },
          { url: '/images/relief-4.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '04浮雕',
  },
  {
    id: 'node-5',
    number: 5,
    name: '七彩住家',
    lat: 27.8225768,
    lng: 121.149027,
    mainColor: '#ced6ec',
    colorName: '蓝雾紫',
    cardLocation: '七彩住家',
    cardSections: [
      {
        colorName: '蓝雾紫',
        mainColor: '#ced6ec',
        colors: ['#ced6ec', '#e8d4f0', '#a8b8d8'],
        story:
          '一排排住家把墙面刷成粉、黄、蓝、绿——像把海天的浅色折进巷弄。阳台下还贴着春联，邻里在台阶上择蚕豆，粉盆里橘猫打盹；抬头是幻彩栏杆映出的海面。洞头日常的温柔，就藏在这些不重样的配色里。',
        cardPhotos: [
          { url: '/images/colorful-homes-1.png', orientation: 'landscape' },
          { url: '/images/colorful-homes-2.png', orientation: 'landscape' },
          { url: '/images/colorful-homes-3.png', orientation: 'landscape' },
          { url: '/images/colorful-homes-4.png', orientation: 'landscape' },
          { url: '/images/colorful-homes-5.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '05七彩住家',
  },
  {
    id: 'node-6',
    number: 6,
    name: '屏枫民宿',
    lat: 27.8225696,
    lng: 121.1490002,
    mainColor: '#9dc7af',
    colorName: '墙绿',
    cardLocation: '屏枫民宿',
    cardSections: [
      {
        colorName: '墙绿',
        mainColor: '#9dc7af',
        colors: ['#9dc7af', '#b8d9c4', '#7aab8f'],
        story:
          '民宿外墙刷成淡淡的墙绿，漆皮随岁月起皱，石基却还扎实。水管与粉花从墙缝里长出来，像洞头慢生活留下的温柔褶皱。',
        cardPhotos: [
          { url: '/images/pingfeng-homestay-1.png', orientation: 'portrait' },
          { url: '/images/pingfeng-homestay-2.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '06屏枫民宿',
  },
  {
    id: 'node-7',
    number: 7,
    name: '七彩楼梯',
    lat: 27.8223799,
    lng: 121.1486784,
    mainColor: '#f9db93',
    colorName: '奶油阳光',
    cardLocation: '七彩楼梯',
    cardSections: [
      {
        colorName: '奶油阳光',
        mainColor: '#f9db93',
        colors: ['#f9db93', '#fce8b8', '#e8c46a'],
        story:
          '花纹钢梯踏面上，红橙黄绿蓝紫像涟漪一层层铺开；侧墙是奶油阳光般的淡黄。阳光从栏杆间落下来，每一步都带着金属的轻响。',
        cardPhotos: [
          {
            url: '/videos/colorful-stairs-web.mp4',
            orientation: 'landscape',
            type: 'video',
            poster: '/images/colorful-stairs-video-poster.jpg',
          },
          { url: '/images/colorful-stairs-1.png', orientation: 'landscape' },
          { url: '/images/colorful-stairs-2.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '07七彩楼梯',
  },
  {
    id: 'node-8',
    number: 8,
    name: '渔具百货店',
    lat: 27.8224178,
    lng: 121.1486891,
    mainColor: '#9cd3e2',
    colorName: '海岸青绿',
    cardLocation: '渔具百货店',
    cardSections: [
      {
        colorName: '海岸青绿',
        mainColor: '#9cd3e2',
        colors: ['#9cd3e2', '#b8e4ef', '#7ab8c8'],
        story:
          '门楣贴着「喜气盈门」，外墙刷成海岸青绿。这里卖渔具，也卖风车、小桶和草帽——出海捕鱼的电话写在粉拱门下，台阶边常有人围坐打牌。海边的百货，把生计与闲趣都装在一起。',
        cardPhotos: [
          { url: '/images/fishing-store-1.png', orientation: 'portrait' },
          { url: '/images/fishing-store-2.png', orientation: 'landscape' },
          { url: '/images/fishing-store-3.png', orientation: 'portrait' },
          { url: '/images/fishing-store-4.png', orientation: 'landscape' },
          { url: '/images/fishing-store-5.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '08渔具百货店',
  },
  {
    id: 'node-9',
    number: 9,
    name: '海上阳台',
    lat: 27.8221901,
    lng: 121.1482546,
    mainColor: '#aadaf3',
    colorName: '映海蓝',
    cardLocation: '海上阳台',
    cardSections: [
      {
        colorName: '映海蓝',
        mainColor: '#aadaf3',
        colors: ['#aadaf3', '#c8e8f8', '#8abed4'],
        story:
          '站在阳台望出去，海面映着天空的浅蓝，小艇静静漂着，远处沙滩与白楼连成一条线。',
        cardPhotos: [
          {
            url: '/videos/sea-balcony-hai-web.mp4',
            orientation: 'landscape',
            type: 'video',
            poster: '/images/sea-balcony-video-poster.jpg',
          },
          { url: '/images/sea-balcony-reflect-1.png', orientation: 'landscape' },
        ],
      },
      {
        colorName: '破晓粉',
        mainColor: '#f7d6cb',
        colors: ['#f7d6cb', '#fce8e0', '#e8b8a8'],
        story:
          '破晓时分，云隙透出粉与金，海水把这层光又送回来。桥下的浪纹、远处的浮标，都在教你看潮涨潮落。',
        cardPhotos: [
          { url: '/images/sea-balcony-dawn-1.png', orientation: 'portrait' },
          { url: '/images/sea-balcony-3.png', orientation: 'landscape' },
          { url: '/images/sea-balcony-4.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '09海上阳台',
  },
  {
    id: 'node-10',
    number: 10,
    name: '海之蓝船用设备销售中心',
    lat: 27.8225768,
    lng: 121.1491826,
    mainColor: '#97bde0',
    colorName: '晴屿蓝',
    cardLocation: '海之蓝船用设备销售中心',
    cardSections: [
      {
        colorName: '晴屿蓝',
        mainColor: '#97bde0',
        colors: ['#97bde0', '#b8d4ef', '#7a9fc4'],
        story:
          '抬头是晴屿蓝的天，丝云像被风梳过；低头是街角一排彩楼，蓝底白字的招牌写着船用设备。机油桶、通信器材与便利店比邻——出海前的补给，就藏在这抹海天的颜色里。',
        cardPhotos: [
          { url: '/images/hai-zhi-lan-1.png', orientation: 'portrait' },
          { url: '/images/hai-zhi-lan-2.png', orientation: 'landscape' },
          { url: '/images/hai-zhi-lan-3.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '10海之蓝船用设备销售中心',
  },
  {
    id: 'node-11',
    number: 11,
    name: '芙蓉馄饨铺',
    lat: 27.8224012,
    lng: 121.1491773,
    mainColor: '#f0d8a5',
    colorName: '温暖米黄',
    cardLocation: '芙蓉馄饨铺',
    cardSections: [
      {
        colorName: '温暖米黄',
        mainColor: '#f0d8a5',
        colors: ['#f0d8a5', '#f8e8c4', '#d4b878'],
        story:
          '台阶上去，温暖米黄的墙边贴着红底招牌与春联。一碗清汤馄饨、几只手工小笼，是洞头街坊最家常的热气。',
        cardPhotos: [
          { url: '/images/furong-wonton-1.png', orientation: 'portrait' },
          { url: '/images/furong-wonton-2.png', orientation: 'portrait' },
          { url: '/images/furong-wonton-3.png', orientation: 'portrait' },
          { url: '/images/furong-wonton-4.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '11芙蓉馄饨铺',
  },
  {
    id: 'node-12',
    number: 12,
    name: '码头排档',
    lat: 27.8225696,
    lng: 121.1497432,
    mainColor: '#3655a5',
    colorName: '深海蓝',
    cardLocation: '码头排档',
    cardSections: [
      {
        colorName: '深海蓝',
        mainColor: '#3655a5',
        colors: ['#3655a5', '#4a6fc4', '#284080'],
        story:
          '三层玻璃缸里游着刚上岸的鱼虾蟹，价签贴在缸沿，网兜一抄就是今晚的菜。木柱下圆桌排开，紫椅套在风里晃，后厨不锈钢台还映着海面的光——码头边的排档，把深海蓝和烟火气一起端上桌。',
        cardPhotos: [
          { url: '/images/pier-stall-1.png', orientation: 'portrait' },
          { url: '/images/pier-stall-2.png', orientation: 'landscape' },
          { url: '/images/pier-stall-3.png', orientation: 'portrait' },
          { url: '/images/pier-stall-4.png', orientation: 'landscape' },
          { url: '/images/pier-stall-5.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '12码头排档',
  },
  {
    id: 'node-13',
    number: 13,
    name: '废弃工厂',
    lat: 27.8226574,
    lng: 121.1498961,
    mainColor: '#e5baa4',
    colorName: '砖橙色',
    cardLocation: '废弃工厂',
    cardSections: [
      {
        colorName: '砖橙色',
        mainColor: '#e5baa4',
        colors: ['#e5baa4', '#f0d0bc', '#c89878'],
        story:
          '灰浆剥落，砖橙色从墙里露出来；空窗框对着天空，回字纹阳台还留着旧日的讲究。墙洞外树影涌进来，堆叠的砖块像被时间按了暂停——这里曾轰鸣，如今只剩风穿过。',
        cardPhotos: [
          { url: '/images/abandoned-factory-1.png', orientation: 'portrait' },
          { url: '/images/abandoned-factory-2.png', orientation: 'portrait' },
          { url: '/images/abandoned-factory-3.png', orientation: 'portrait' },
          { url: '/images/abandoned-factory-4.png', orientation: 'portrait' },
        ],
      },
    ],
    nfcId: '13废弃工厂',
  },
  {
    id: 'node-14',
    number: 14,
    name: '东岙沙滩',
    lat: 27.8243606,
    lng: 121.1562422,
    mainColor: '#005e94',
    colorName: '船漆蓝',
    cardLocation: '东岙沙滩',
    cardSections: [
      {
        colorName: '船漆蓝',
        mainColor: '#005e94',
        colors: ['#005e94', '#1a7ab8', '#004670'],
        story:
          '卵石滩边，一排船漆蓝的小渔船静静泊着，「东屏渔038」还写在船头。湾里浮桥延伸出去，岩壁与绿树把海围成一只碗——东岙的蓝，是渔民刷在船身上、也映在水面上的那种蓝。',
        cardPhotos: [
          { url: '/images/dongao-beach-1.png', orientation: 'landscape' },
          { url: '/images/dongao-beach-2.png', orientation: 'landscape' },
          { url: '/images/dongao-beach-3.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '14东岙沙滩',
  },
  {
    id: 'node-15',
    number: 15,
    name: '洞头红石滩',
    lat: 27.8238862,
    lng: 121.1570174,
    mainColor: '#835852',
    colorName: '海石红',
    cardLocation: '洞头红石滩',
    cardSections: [
      {
        colorName: '海石红',
        mainColor: '#835852',
        colors: ['#835852', '#a07068', '#6a4540'],
        story:
          '海石红从岩缝里渗出来，像被潮水一遍遍染过。石面裂成块，潮池映着天光，柱状的岩壁从卵石滩上拔地而起——洞头最硬的颜色，也是海最久的一种签名。',
        cardPhotos: [
          {
            url: '/videos/red-stone-beach-mvi9580-web.mp4',
            orientation: 'landscape',
            type: 'video',
            poster: '/images/red-stone-beach-video-poster.jpg',
          },
          { url: '/images/red-stone-beach-1.png', orientation: 'landscape' },
          { url: '/images/red-stone-beach-2.png', orientation: 'landscape' },
          { url: '/images/red-stone-beach-3.png', orientation: 'landscape' },
          { url: '/images/red-stone-beach-4.png', orientation: 'landscape' },
        ],
      },
    ],
    nfcId: '15洞头红石滩',
  },
]

/** 当前已配置的节点数量 */
export const EXHIBITION_NODE_COUNT = EXHIBITION_NODES.length

/**
 * 展览计划总点位（进度条分母）
 * 新增节点时只需往 EXHIBITION_NODES 追加，分母与此同步
 */
export const EXHIBITION_PLANNED_TOTAL = EXHIBITION_NODE_COUNT

/**
 * 从 NFC 读取内容解析 nfcId（纯文本「02三角梅」或打卡链接 ?nfc=02三角梅 均可）
 * @param {string} raw - 芯片文本记录，或 Web NFC 读到的完整 URL
 * @returns {string}
 */
export function resolveNfcIdFromPayload(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const fromQuery = url.searchParams.get(NFC_URL_QUERY_KEY)
      if (fromQuery != null && fromQuery !== '') {
        return decodeURIComponent(String(fromQuery)).trim()
      }
    } catch {
      /* 非合法 URL，按纯文本处理 */
    }
  }

  return trimmed
}

/**
 * 根据 NFC 芯片内文本或打卡 URL 查找对应节点
 * @param {string} raw
 * @returns {typeof EXHIBITION_NODES[0] | undefined}
 */
/** 已更名节点的 NFC 旧 id，便于已写芯片继续打卡 */
const NFC_ID_ALIASES = {
  '04壁画': '04浮雕',
  '05联排住家': '05七彩住家',
  '08渔具店': '08渔具百货店',
  '12柒号大排档': '12码头排档',
  '15红石滩': '15洞头红石滩',
}

export function findNodeByNfcPayload(raw) {
  const nfcId = resolveNfcIdFromPayload(raw)
  if (!nfcId) return undefined
  const resolved = NFC_ID_ALIASES[nfcId] ?? nfcId
  return EXHIBITION_NODES.find((node) => node.nfcId === resolved)
}

/**
 * 根据 nfcId 精确查找节点（如「02三角梅」）
 * @param {string} nfcId
 * @returns {typeof EXHIBITION_NODES[0] | undefined}
 */
export function findNodeByNfcId(nfcId) {
  const trimmed = String(nfcId ?? '').trim()
  return EXHIBITION_NODES.find((node) => node.nfcId === trimmed)
}

/**
 * 根据节点 id 查找节点
 * @param {string} id
 */
export function findNodeById(id) {
  return EXHIBITION_NODES.find((node) => node.id === id)
}

/**
 * 节点展示用照片列表（支持 photoUrls 或旧字段 photoUrl）
 * @param {{ photoUrls?: string[], photoUrl?: string }} node
 * @returns {string[]}
 */
export function getNodePhotoUrls(node) {
  if (!node) return []
  if (Array.isArray(node.photoUrls) && node.photoUrls.length) {
    return node.photoUrls.filter(Boolean)
  }
  if (node.photoUrl) return [node.photoUrl]
  return []
}

/**
 * 从 mainColor 派生 3 个采色（节点未配置 colors 时使用）
 * @param {string} mainColor
 * @returns {string[]}
 */
function deriveColorsFromMain(mainColor) {
  try {
    const base = chroma(mainColor)
    return [
      base.hex(),
      base.brighten(0.55).saturate(0.1).hex(),
      base.darken(0.35).desaturate(0.15).hex(),
    ]
  } catch {
    return [mainColor, mainColor, mainColor]
  }
}

/**
 * 卡片用 3 个采色（优先 node.colors，不足则从 mainColor 派生）
 * @param {{ colors?: string[], mainColor?: string } | null | undefined} node
 * @returns {string[]}
 */
export function getNodeColors(node) {
  if (!node) return []
  const fromData = Array.isArray(node.colors)
    ? node.colors.filter(Boolean).slice(0, 3)
    : []
  if (fromData.length >= 3) return fromData
  if (!node.mainColor) return fromData
  const derived = deriveColorsFromMain(node.mainColor)
  return [...fromData, ...derived].slice(0, 3)
}

/**
 * 卡片用两张照片（photo1 / photo2）
 * @param {{ photoUrl?: string, photoUrl2?: string, photoUrls?: string[], id?: string } | null | undefined} node
 * @returns {{ photo1: string, photo2: string }}
 */
export function getNodeCardPhotos(node) {
  if (!node) return { photo1: '', photo2: '' }

  const photo1 =
    node.photoUrl ||
    (Array.isArray(node.photoUrls) && node.photoUrls[0]) ||
    ''

  const photo2 =
    node.photoUrl2 ||
    (Array.isArray(node.photoUrls) && node.photoUrls[1]) ||
    ''

  return { photo1, photo2 }
}

/**
 * 卡片滑动区照片列表（首图横版 380×249 + 三色条，其余按横/竖版规范）
 * @param {{ cardPhotos?: { url: string, orientation?: 'landscape' | 'portrait' }[], photoUrl?: string, photoUrl2?: string, photoUrls?: string[] } | null | undefined} source
 * @returns {{ url: string, orientation: 'landscape' | 'portrait' }[]}
 */
export function getNodeCardPhotoSlides(source) {
  if (!source) return []

  if (Array.isArray(source.cardPhotos) && source.cardPhotos.length) {
    return source.cardPhotos.map((item, index) => {
      const url = typeof item === 'string' ? item : item?.url
      if (!url) return null
      const orientation =
        (typeof item === 'object' && item.orientation) ||
        (index === 0 ? 'landscape' : 'portrait')
      const type =
        (typeof item === 'object' && item.type) ||
        (isVideoUrl(url) ? 'video' : 'image')
      const poster = typeof item === 'object' ? item.poster : undefined
      return { url, orientation, type, ...(poster ? { poster } : {}) }
    }).filter(Boolean)
  }

  const slides = []
  const { photo1, photo2 } = getNodeCardPhotos(source)
  if (photo1) slides.push({ url: photo1, orientation: 'landscape' })
  if (photo2) slides.push({ url: photo2, orientation: 'portrait' })

  if (Array.isArray(source.photoUrls) && source.photoUrls.length > 2) {
    source.photoUrls.slice(2).forEach((url, index) => {
      if (!url) return
      slides.push({
        url,
        orientation: index % 2 === 0 ? 'landscape' : 'portrait',
      })
    })
  }

  return slides
}

/**
 * 展览卡片多段采色（如杨府殿：香火红 + 三角梅红）
 * @param {{ cardSections?: object[], colorName?: string, mainColor?: string, story?: string } | null | undefined} node
 * @returns {{ colorName: string, mainColor: string, colors: string[], story: string, photoSlides: ReturnType<typeof getNodeCardPhotoSlides> }[]}
 */
export function getNodeCardSections(node) {
  if (!node) return []

  if (Array.isArray(node.cardSections) && node.cardSections.length) {
    return node.cardSections.map((section) => ({
      colorName: section.colorName || node.colorName || node.name || '',
      mainColor: section.mainColor || node.mainColor || '',
      colors: getNodeColors(section),
      story: section.story || '',
      photoSlides: getNodeCardPhotoSlides(section),
    }))
  }

  return [
    {
      colorName: node.colorName || node.name || '',
      mainColor: node.mainColor || '',
      colors: getNodeColors(node),
      story: node.story || '',
      photoSlides: getNodeCardPhotoSlides(node),
    },
  ]
}

/**
 * 生成节点 NFC 打卡链接（写入芯片 URL 记录，iPhone 触碰后 Safari 自动打开）
 * @param {string} nfcId - 与节点 nfcId 字段一致，如「01杨府殿」
 * @param {string} [origin] - 站点根地址，默认当前页 origin
 * @returns {string}
 */
export function buildExhibitionCheckInUrl(nfcId, origin) {
  const base = import.meta.env.BASE_URL || '/'
  const path = `${base}${EXHIBITION_MAP_PATH.replace(/^\//, '')}`.replace(/\/+/g, '/')
  const root =
    origin ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
  const url = new URL(path, root)
  url.searchParams.set(NFC_URL_QUERY_KEY, String(nfcId ?? '').trim())
  return url.href
}
