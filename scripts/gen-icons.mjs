// Generuje PWA ikony (značka Fairsome na tmavě zeleném pozadí) bez externích
// závislostí - jen Node + zlib. Spouští se ručně přes `npm run icons`,
// výstup se commituje do public/.
//
// Značka je ta samá, co nese wordmark v aplikaci (`BrandMark`
// v `src/screens/HomeScreen.tsx`) a favicon: dva překrývající se kruhy
// narážející na „-some" ve jméně. Když se změní jedno, musí se změnit
// všechna tři místa - nic je nesváže.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 10..12 = komprese/filtr/prokládání, vše 0

  // Každý řádek je prefixovaný filter bytem 0 (none).
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    const src = y * width * 4
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, src, src + width * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

/** Pozadí appky (svislý gradient) a její akcentní zelená. */
const BG_TOP = [22, 48, 31]
const BG_BOTTOM = [11, 21, 15]
const ACCENT = [74, 222, 128]

/**
 * Značka Fairsome: dva stejně velké kruhy na úhlopříčce, zadní průsvitný,
 * přední plný. Poměr je převzatý ze SVG wordmarku, kde mají kruhy `r=6`
 * a středy v `9,9` a `15,15` - posun je tedy půl poloměru na každou osu.
 *
 * @param size hrana ikony v px
 * @param rRatio poloměr kruhu vůči hraně. U maskable ikony menší: Android si
 *        z dlaždice nechá jen kruh o průměru 80 %, a nejvzdálenější bod
 *        značky je `1,71 × r` od středu.
 */
function drawIcon(size, rRatio) {
  const out = Buffer.alloc(size * size * 4)
  const r = size * rRatio
  const offset = r / 2
  const back = [size / 2 - offset, size / 2 - offset]
  const front = [size / 2 + offset, size / 2 + offset]
  const ss = 4 // supersampling kvůli hladkým hranám kruhů

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss
          const py = y + (sy + 0.5) / ss

          let color = mix(BG_TOP, BG_BOTTOM, py / size)
          // Pořadí je stejné jako v SVG: zadní kruh, pak přední přes něj.
          if (Math.hypot(px - back[0], py - back[1]) < r) {
            color = mix(color, ACCENT, 0.35)
          }
          if (Math.hypot(px - front[0], py - front[1]) < r) color = ACCENT

          acc = acc.map((v, i) => v + color[i])
        }
      }
      const i = (y * size + x) * 4
      const n = ss * ss
      out[i] = Math.round(acc[0] / n)
      out[i + 1] = Math.round(acc[1] / n)
      out[i + 2] = Math.round(acc[2] / n)
      out[i + 3] = 255
    }
  }
  return encodePng(size, size, out)
}

mkdirSync(publicDir, { recursive: true })
const files = [
  ['icon-192.png', 192, 0.235],
  ['icon-512.png', 512, 0.235],
  // maskable: obsah musí zůstat v centrálních ~80 % plochy
  ['icon-512-maskable.png', 512, 0.21],
  ['apple-touch-icon.png', 180, 0.235],
]
for (const [name, size, ratio] of files) {
  writeFileSync(join(publicDir, name), drawIcon(size, ratio))
  console.log(`${name} (${size}x${size})`)
}
