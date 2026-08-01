// Generuje PWA ikony (golfový míček na tmavě zeleném pozadí) bez externích
// závislostí - jen Node + zlib. Spouští se ručně přes `npm run icons`,
// výstup se commituje do public/.
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

/**
 * @param size hrana ikony v px
 * @param ballRatio poloměr míčku vůči hraně - u maskable ikon menší,
 *        aby se vešel do bezpečné zóny, kterou si iOS/Android ořízne.
 */
function drawIcon(size, ballRatio) {
  const out = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = size * ballRatio
  const ss = 3 // supersampling kvůli hladkým hranám

  // Dimply v šestiúhelníkové mřížce, ať to vypadá jako golfový míček.
  const dimples = []
  const step = r * 0.29
  for (let row = -5; row <= 5; row++) {
    for (let col = -5; col <= 5; col++) {
      const dx = (col + (row % 2 ? 0.5 : 0)) * step
      const dy = row * step * 0.87
      if (Math.hypot(dx, dy) < r * 0.84) dimples.push([cx + dx, cy + dy])
    }
  }
  const dimpleR = step * 0.3

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss
          const py = y + (sy + 0.5) / ss

          // pozadí: svislý gradient
          let color = mix([22, 48, 31], [11, 21, 15], py / size)

          const d = Math.hypot(px - cx, py - cy)
          if (d < r) {
            // míček se stínováním zleva nahoře
            const shade = (px - cx + r) / (2 * r) * 0.5 + ((py - cy + r) / (2 * r)) * 0.5
            let ball = mix([255, 255, 255], [206, 216, 208], shade)
            for (const [dx, dy] of dimples) {
              if (Math.hypot(px - dx, py - dy) < dimpleR) {
                ball = mix(ball, [186, 198, 189], 0.85)
                break
              }
            }
            color = ball
          }
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
  ['icon-192.png', 192, 0.34],
  ['icon-512.png', 512, 0.34],
  // maskable: obsah musí zůstat v centrálních ~80 % plochy
  ['icon-512-maskable.png', 512, 0.26],
  ['apple-touch-icon.png', 180, 0.34],
]
for (const [name, size, ratio] of files) {
  writeFileSync(join(publicDir, name), drawIcon(size, ratio))
  console.log(`${name} (${size}x${size})`)
}
