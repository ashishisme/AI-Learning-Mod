// SPEC: FR-UI-28, FR-CNT-13 (SPEC-014 clips), visual pass 2026-11-23.
// Kids clips, second style: a full bright scene, vector fruit and props with dark outlines, and motion timed to the
// lesson's cues so each caption matches what is on screen. No words in the frame (captions carry them).
//   node scripts/render-kids-clips-v2.js --stills <outDir>   one PNG per cue, for review
//   node scripts/render-kids-clips-v2.js                     writes webm, mp4 and poster to web/public and design/brand/source
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'))

const kidsSrc = fs.readFileSync(path.join(__dirname, 'render-kids-clips.js'), 'utf8')
const chipFn = kidsSrc.slice(kidsSrc.indexOf('function drawChipAvatar'), kidsSrc.indexOf('\nfunction renderChipDogLearningFrame'))

// Lesson cues (VideoClipPlayer DEFAULT_CUES): 0, 3.5, 6.5, 9.8, 13.0; the clip runs 16 s.
function renderChipFruitSorterFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const t = f / FPS
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const smooth = (v) => { v = clamp(v); return v * v * (3 - 2 * v) }
  const INK = '#1F2937'

  // ---------- timeline ----------
  // dir -1 = left (apple crate), +1 = right (lemon crate). k scales the event's speed.
  const events = [
    { t0: 0.2, kind: 'apple', dir: -1, k: 1 },
    { t0: 3.4, kind: 'lemon', dir: -1, k: 1 }, // mistake: lemon into the apple crate
    { t0: 9.9, kind: 'apple', dir: 1, k: 1 }, // mistake again: apple into the lemon crate
    { t0: 12.9, kind: 'lemon', dir: 1, k: 0.65 },
    { t0: 13.75, kind: 'apple', dir: -1, k: 0.65 },
  ]
  const dialAt = (tt) => {
    let v = -1
    v += 1.6 * smooth((tt - 7.0) / 1.2) // Chip turns the dial: -1 -> 0.6
    v -= 0.4 * smooth((tt - 12.3) / 0.6) // and back a little: 0.6 -> 0.2
    return v
  }
  const P = { x: 450, y: 222 } // ramp pivot
  const HALF = 132
  const R = 21
  const crateX = { '-1': 300, '1': 600 }
  const phase = (e) => {
    const k = e.k
    return { travel: [e.t0, e.t0 + 1.0 * k], drop: [e.t0 + 1.0 * k, e.t0 + 1.3 * k], roll: [e.t0 + 1.3 * k, e.t0 + 2.0 * k], fall: [e.t0 + 2.0 * k, e.t0 + 2.45 * k] }
  }
  const rampAngle = (tt) => {
    let a = dialAt(tt) * 0.05
    for (const e of events) {
      const p = phase(e)
      const on = smooth((tt - (p.drop[0] - 0.1 * e.k)) / (0.3 * e.k)) * (1 - smooth((tt - p.fall[0]) / (0.3 * e.k)))
      a += e.dir * 0.3 * on
    }
    return a
  }
  const onRamp = (s, lift, ang) => ({ x: P.x + Math.cos(ang) * s - Math.sin(ang) * -lift, y: P.y + Math.sin(ang) * s + Math.cos(ang) * -lift })

  // ---------- drawing helpers ----------
  const drawApple = (x, y, r, spin = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin)
    ctx.fillStyle = '#E53935'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.7)
    ctx.bezierCurveTo(r * 0.9, -r * 1.25, r * 1.35, r * 0.2, 0, r)
    ctx.bezierCurveTo(-r * 1.35, r * 0.2, -r * 0.9, -r * 1.25, 0, -r * 0.7)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.25, r * 0.18, r * 0.32, -0.4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#5D4037'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -r * 0.7); ctx.lineTo(r * 0.1, -r * 1.15); ctx.stroke()
    ctx.fillStyle = '#43A047'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.ellipse(r * 0.38, -r * 1.05, r * 0.32, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.restore()
  }
  const drawLemon = (x, y, r, spin = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin)
    ctx.fillStyle = '#FDD835'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-r * 1.25, 0)
    ctx.quadraticCurveTo(-r * 1.0, -r * 0.95, 0, -r * 0.85)
    ctx.quadraticCurveTo(r * 1.0, -r * 0.95, r * 1.25, 0)
    ctx.quadraticCurveTo(r * 1.0, r * 0.95, 0, r * 0.85)
    ctx.quadraticCurveTo(-r * 1.0, r * 0.95, -r * 1.25, 0)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.35, r * 0.14, -0.2, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const drawFruit = (kind, x, y, r, spin) => (kind === 'apple' ? drawApple : drawLemon)(x, y, r, spin)
  const badge = (x, y, ok, s) => {
    if (s <= 0) return
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
    ctx.fillStyle = ok ? '#16A34A' : '#DC2626'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath()
    if (ok) { ctx.moveTo(-10, 1); ctx.lineTo(-3, 9); ctx.lineTo(11, -8) } else { ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9) }
    ctx.stroke(); ctx.restore()
  }

  // ---------- background ----------
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#8FD3F4'); sky.addColorStop(0.7, '#D8F1FB')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFE082'; ctx.beginPath(); ctx.arc(720, 62, 34, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,224,130,0.35)'; ctx.beginPath(); ctx.arc(720, 62, 50, 0, Math.PI * 2); ctx.fill()
  const cloud = (cx, cy, s) => { ctx.fillStyle = '#FFFFFF'; for (const [dx, dy, r] of [[0, 0, 18], [20, -8, 22], [42, 0, 17], [20, 6, 18]]) { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, Math.PI * 2); ctx.fill() } }
  cloud(((90 + t * 6) % 900) - 60, 50, 1); cloud(((470 + t * 4) % 900) - 60, 34, 0.8)
  ctx.fillStyle = '#A5D6A7'; ctx.beginPath(); ctx.ellipse(160, 410, 300, 90, 0, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#9CCC65'; ctx.beginPath(); ctx.ellipse(640, 415, 320, 80, 0, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#7CB342'; ctx.fillRect(0, 395, W, 55)
  ctx.fillStyle = '#689F38'; ctx.fillRect(0, 395, W, 5)

  ctx.strokeStyle = '#607D8B'; ctx.lineWidth = 6
  ctx.beginPath(); ctx.moveTo(250, 130); ctx.lineTo(250, 398); ctx.moveTo(400, 130); ctx.lineTo(400, 398); ctx.stroke() // belt legs
  // ---------- ramp stand ----------
  ctx.fillStyle = '#90A4AE'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - 34, 398); ctx.lineTo(P.x + 34, 398); ctx.closePath(); ctx.fill(); ctx.stroke()

  // ---------- crates (with the fruit already in them) ----------
  const landed = { '-1': [], '1': [] }
  for (const e of events) if (t >= phase(e).fall[1]) landed[e.dir].push(e)
  const wrongShake = (dir) => {
    let s = 0
    for (const e of landed[dir]) { const tl = phase(e).fall[1]; const wrong = (e.kind === 'apple') !== (dir === -1); if (wrong && t - tl < 0.5) s = Math.sin((t - tl) * 50) * 4 * (1 - (t - tl) / 0.5) }
    return s
  }
  for (const dir of ['-1', '1']) {
    const cx = crateX[dir] + wrongShake(dir)
    const top = 318
    // fruit inside (drawn first so the front slats cover their lower half)
    landed[dir].forEach((e, i) => drawFruit(e.kind, cx - 36 + i * 26, top + 6 - (i % 2) * 4, 16, 0.3 * i))
    ctx.fillStyle = '#C68642'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.roundRect(cx - 74, top + 4, 148, 80, 6); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = '#8D5524'; ctx.lineWidth = 2
    for (const y of [top + 30, top + 56]) { ctx.beginPath(); ctx.moveTo(cx - 72, y); ctx.lineTo(cx + 72, y); ctx.stroke() }
    // plaque: which fruit belongs here
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(cx, top + 44, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    drawFruit(dir === '-1' ? 'apple' : 'lemon', cx, top + 45, 12, 0)
  }

  // ---------- ramp ----------
  const ang = rampAngle(t)
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(ang)
  ctx.fillStyle = '#D9A066'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(-HALF, -8, HALF * 2, 16, 6); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#B07A45'; ctx.lineWidth = 1.5
  for (const x of [-90, -30, 40, 95]) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 22, -3); ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = '#455A64'; ctx.beginPath(); ctx.arc(P.x, P.y, 7, 0, Math.PI * 2); ctx.fill()

  // ---------- conveyor and hopper ----------
  const beltY = 112
  ctx.fillStyle = '#546E7A'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.roundRect(200, beltY, 236, 18, 9); ctx.fill(); ctx.stroke()
  for (let i = 0; i < 7; i++) {
    const rx = 214 + i * 35, ry = beltY + 9
    ctx.fillStyle = '#B0BEC5'; ctx.beginPath(); ctx.arc(rx, ry, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#37474F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t * 6 + i) * 6, ry + Math.sin(t * 6 + i) * 6); ctx.stroke()
  }
  ctx.fillStyle = '#FB8C00'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(186, 44); ctx.lineTo(262, 44); ctx.lineTo(240, 96); ctx.lineTo(208, 96); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#78909C'; ctx.fillRect(220, 96, 8, 16) // hopper neck onto the belt

  // ---------- moving fruit ----------
  for (const e of events) {
    const p = phase(e)
    if (t < p.travel[0] || t >= p.fall[1]) continue
    let x, y, spin = 0, scale = 1
    if (t < p.travel[1]) {
      const u = (t - p.travel[0]) / (p.travel[1] - p.travel[0])
      x = 224 + u * 206; y = beltY - R + 2; spin = (x - 224) / R
      scale = smooth(u / 0.15)
    } else if (t < p.drop[1]) {
      const u = (t - p.drop[0]) / (p.drop[1] - p.drop[0])
      const land = onRamp(0, R + 8, rampAngle(p.drop[1]))
      x = 430 + (land.x - 430) * u; y = beltY - R + 2 + (land.y - (beltY - R + 2)) * u * u; spin = 206 / R
    } else if (t < p.roll[1]) {
      const u = (t - p.roll[0]) / (p.roll[1] - p.roll[0])
      const s = e.dir * (HALF - 6) * u * u
      const q = onRamp(s, R + 8, ang)
      x = q.x; y = q.y; spin = 206 / R + s / R
    } else {
      const u = (t - p.fall[0]) / (p.fall[1] - p.fall[0])
      const a = onRamp(e.dir * (HALF - 6), R + 8, rampAngle(p.fall[0]))
      const tx = crateX[e.dir] - 36 + landed[e.dir].length * 26, ty = 324
      x = a.x + (tx - a.x) * u; y = a.y + (ty - a.y) * u * u - 30 * Math.sin(u * Math.PI) * 0.3
      spin = 206 / R + e.dir * (HALF + u * 60) / R
    }
    drawFruit(e.kind, x, y, R * scale, e.kind === 'lemon' ? spin * 0.3 : spin * 0.15)
  }

  // ---------- check or cross over a crate after each landing ----------
  for (const e of events) {
    const tl = phase(e).fall[1]
    const dt = t - tl
    if (dt < 0 || dt > 1.4) continue
    const ok = (e.kind === 'apple') === (e.dir === -1)
    const s = easeOutBack(clamp(dt / 0.35)) * (1 - smooth((dt - 1.1) / 0.3))
    badge(crateX[e.dir], 286, ok, s)
  }

  // ---------- the dial (the neuron's weight) ----------
  const D = { x: 183, y: 168 }
  ctx.strokeStyle = '#607D8B'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(D.x, D.y + 30); ctx.lineTo(D.x, 398); ctx.stroke() // dial post
  ctx.fillStyle = '#ECEFF1'; ctx.strokeStyle = INK; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(D.x, D.y, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // red half for apples (left), yellow half for lemons (right)
  ctx.lineWidth = 7
  ctx.strokeStyle = '#E53935'; ctx.beginPath(); ctx.arc(D.x, D.y, 27, Math.PI, Math.PI * 1.5); ctx.stroke()
  ctx.strokeStyle = '#FBC02D'; ctx.beginPath(); ctx.arc(D.x, D.y, 27, Math.PI * 1.5, Math.PI * 2); ctx.stroke()
  const needle = -Math.PI / 2 + dialAt(t) * 1.1
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(D.x + Math.cos(needle) * 25, D.y + Math.sin(needle) * 25); ctx.stroke()
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(D.x, D.y, 5, 0, Math.PI * 2); ctx.fill()
  const turning = (t > 6.9 && t < 8.4) || (t > 12.2 && t < 13.0)
  if (turning) { // motion arcs around the dial
    ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 3
    const a0 = t * 5
    ctx.beginPath(); ctx.arc(D.x, D.y, 46, a0, a0 + 0.9); ctx.stroke()
    ctx.beginPath(); ctx.arc(D.x, D.y, 46, a0 + Math.PI, a0 + Math.PI + 0.9); ctx.stroke()
  }

  // ---------- Chip ----------
  const pose = t >= 14.6 ? 'cheer' : turning ? 'point' : 'wave'
  drawChipAvatar(ctx, 78, 262, 1.05, pose, t)
  if (turning) { // Chip's arm reaching the dial
    ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 7; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(112, 248); ctx.quadraticCurveTo(150, 236, D.x - 26, D.y + 22); ctx.stroke()
  }
  const oops = (t > 5.95 && t < 6.9) || (t > 12.45 && t < 13.2)
  if (oops) { // surprise bubble
    const s = easeOutBack(clamp(((t > 12 ? t - 12.45 : t - 5.95)) / 0.3))
    ctx.save(); ctx.translate(100, 176); ctx.scale(s, s)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#DC2626'; ctx.fillRect(-3, -12, 6, 15); ctx.beginPath(); ctx.arc(0, 9, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  // ---------- finale: both crates right, confetti ----------
  if (t >= 14.6) {
    const u = t - 14.6
    const colors = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#8E24AA']
    for (let i = 0; i < 46; i++) {
      const x0 = (i * 97) % W, sp = 120 + (i * 37) % 90
      const y = -20 + u * sp + ((i * 53) % 60)
      if (y > H) continue
      ctx.save(); ctx.translate(x0 + Math.sin(u * 3 + i) * 12, y); ctx.rotate(u * 4 + i)
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-5, -3, 10, 6); ctx.restore()
    }
    const s = easeOutBack(clamp(u / 0.4))
    badge(300, 286, true, s); badge(600, 286, true, s)
  }
}

const SCENES = [{ name: 'chip-fruit-sorter', fn: renderChipFruitSorterFrame, poster: 1.75 }]
const STILLS = [1.75, 5.5, 7.8, 12.3, 15.4] // one moment in each cue

async function main() {
  const stillsIdx = process.argv.indexOf('--stills')
  const stillsDir = stillsIdx > 0 ? path.resolve(process.argv[stillsIdx + 1]) : null
  const browser = await chromium.launch()
  for (const scene of SCENES) {
    const page = await browser.newPage()
    const result = await page.evaluate(async ({ fn, chipFn, stills, posterAt }) => {
      const W = 800, H = 450, FPS = 60, TOTAL = 16 * FPS
      const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
      const renderFrame = new Function('ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', 'easeOutBack', `const drawChipAvatar = ${chipFn};\nreturn (${fn})(ctx, f, totalFrames, W, H, FPS, easeOutBack);`)
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      if (stills) return { stills: stills.map((s) => { renderFrame(ctx, Math.round(s * FPS), TOTAL, W, H, FPS, easeOutBack); return canvas.toDataURL('image/png') }) }
      const stream = canvas.captureStream(FPS)
      const rec = (mime, bps) => { const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps }); const c = []; r.ondataavailable = (e) => e.data.size && c.push(e.data); r.start(100); return { r, c, mime } }
      const recs = [rec('video/webm;codecs=vp9', 340_000)]
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) recs.push(rec('video/mp4;codecs=avc1', 340_000))
      let poster = null
      for (let f = 0; f < TOTAL; f++) {
        renderFrame(ctx, f, TOTAL, W, H, FPS, easeOutBack)
        if (f === Math.round(posterAt * FPS)) poster = canvas.toDataURL('image/jpeg', 0.85)
        await new Promise((r) => setTimeout(r, 1000 / FPS))
      }
      const out = {}
      for (const { r, c, mime } of recs) { await new Promise((res) => { r.onstop = res; r.stop() }); out[mime.startsWith('video/webm') ? 'webm' : 'mp4'] = Array.from(new Uint8Array(await new Blob(c).arrayBuffer())) }
      return { ...out, poster }
    }, { fn: scene.fn.toString(), chipFn, stills: stillsDir ? STILLS : null, posterAt: scene.poster })
    await page.close()
    if (stillsDir) {
      fs.mkdirSync(stillsDir, { recursive: true })
      result.stills.forEach((d, i) => fs.writeFileSync(path.join(stillsDir, `${scene.name}-${i + 1}.png`), Buffer.from(d.split(',')[1], 'base64')))
      console.log(`stills: ${stillsDir}/${scene.name}-1..${result.stills.length}.png`)
      continue
    }
    for (const dir of ['../web/public/brand/videos', '../design/brand/source/videos']) {
      const d = path.resolve(__dirname, dir)
      fs.writeFileSync(path.join(d, `${scene.name}.webm`), Buffer.from(result.webm))
      if (result.mp4) fs.writeFileSync(path.join(d, `${scene.name}.mp4`), Buffer.from(result.mp4))
      fs.writeFileSync(path.join(d, `${scene.name}-poster.jpg`), Buffer.from(result.poster.split(',')[1], 'base64'))
    }
    console.log(`${scene.name}: webm ${(result.webm.length / 1024).toFixed(0)} KB, mp4 ${result.mp4 ? (result.mp4.length / 1024).toFixed(0) : '-'} KB`)
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
