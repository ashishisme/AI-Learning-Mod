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

// ---------- shared helpers for the v2 scenes (injected next to drawChipAvatar) ----------
function kSmooth(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v) }
function kBadge(ctx, x, y, ok, s) {
  if (s <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.fillStyle = ok ? '#16A34A' : '#DC2626'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath()
  if (ok) { ctx.moveTo(-10, 1); ctx.lineTo(-3, 9); ctx.lineTo(11, -8) } else { ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9) }
  ctx.stroke(); ctx.restore()
}
function kConfetti(ctx, u, W, H) {
  const colors = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#8E24AA']
  for (let i = 0; i < 46; i++) {
    const x0 = (i * 97) % W, sp = 120 + (i * 37) % 90, y = -20 + u * sp + ((i * 53) % 60)
    if (y > H) continue
    ctx.save(); ctx.translate(x0 + Math.sin(u * 3 + i) * 12, y); ctx.rotate(u * 4 + i)
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(-5, -3, 10, 6); ctx.restore()
  }
}
function kRoom(ctx, W, H) {
  ctx.fillStyle = '#FFF3E0'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#FFE0B2'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, 372)
  ctx.fillStyle = '#A1887F'; ctx.fillRect(0, 372, W, H - 372)
  ctx.fillStyle = '#8D6E63'; for (let x = 0; x < W; x += 90) ctx.fillRect(x, 372, 3, H - 372)
  ctx.fillStyle = '#6D4C41'; ctx.fillRect(0, 368, W, 6)
}
function kBubble(ctx, x, y, s, draw) {
  if (s <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.arc(-26, 30, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  draw(); ctx.restore()
}

// Lesson 1 Kids: Chip learns what a dog is. Cues 0, 3.5, 6.5, 9.8, 13.0.
function renderChipDogLearningFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const t = f / FPS
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const INK = '#1F2937'
  // Traits in the dog's own coordinates (facing right, body centre at 0,0).
  const TRAITS = [{ x: 0, y: 26 }, { x: 64, y: -17 }, { x: -50, y: -26 }] // legs, nose, tail
  const drawDog = (x, y, s, o) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = o.body; ctx.lineWidth = 7; ctx.lineCap = 'round' // tail
    ctx.beginPath(); ctx.moveTo(-36, -6); ctx.quadraticCurveTo(-52, -12, -52, -32 + Math.sin(t * 8 + o.seed) * 4); ctx.stroke()
    ctx.fillStyle = o.leg || o.body; ctx.strokeStyle = INK; ctx.lineWidth = 2
    for (const lx of [-28, -15, 13, 26]) { ctx.beginPath(); ctx.roundRect(lx - 4, 6, 9, 30 * (o.legs || 1), 4); ctx.fill(); ctx.stroke() }
    ctx.fillStyle = o.body; ctx.lineWidth = 2.5
    if (o.fluffy) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 32, Math.sin(a) * 13, 11, 0, Math.PI * 2); ctx.fill() } }
    ctx.beginPath(); ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2); ctx.fill(); if (!o.fluffy) ctx.stroke()
    if (o.spots) { ctx.fillStyle = INK; for (const [sx, sy, r] of [[-15, -5, 6], [8, 4, 5], [20, -8, 4], [-25, 6, 4]]) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill() } }
    ctx.fillStyle = o.body; ctx.strokeStyle = INK
    ctx.beginPath(); ctx.arc(40, -20, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(55, -13, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = o.ear; ctx.beginPath(); ctx.ellipse(31, -24, 7, 14, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(45, -25, 2.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(64, -17, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(62.5, -18.5, 1.6, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  const photo = (x, y, w, h, bg, dog, glow) => {
    ctx.save()
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 22 }
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.stroke()
    ctx.restore()
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 4); ctx.fill()
    const s = Math.min(w, h) / 130 * dog.size
    const cx = x + w / 2 - 6 * s, cy = y + h / 2 + 4 * s
    ctx.save(); ctx.beginPath(); ctx.rect(x + 8, y + 8, w - 16, h - 16); ctx.clip()
    drawDog(cx, cy, s, dog); ctx.restore()
    return { cx, cy, s, flip: dog.flip }
  }
  const ring = (x, y, r, a) => {
    if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(x, y, r + Math.sin(t * 8) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  }
  const traitAt = (p, i) => ({ x: p.cx + TRAITS[i].x * p.s * (p.flip ? -1 : 1), y: p.cy + TRAITS[i].y * p.s })

  kRoom(ctx, W, H)

  const DOGS = [
    { body: '#C68642', ear: '#8D5524', seed: 0, size: 1.0, bg: '#BBDEFB' }, // the first photo
    { body: '#795548', ear: '#4E342E', seed: 1, size: 1.0, legs: 1.15, bg: '#C8E6C9' }, // big
    { body: '#FFCC80', ear: '#E65100', seed: 2, size: 0.7, legs: 0.6, bg: '#F8BBD0' }, // small
    { body: '#FFFFFF', ear: '#BDBDBD', seed: 3, size: 0.95, fluffy: true, bg: '#D1C4E9' }, // soft
  ]
  const NEW = { body: '#E0E0E0', ear: '#616161', seed: 4, size: 1.0, spots: true, flip: false, bg: '#FFF59D' }

  // Gallery slots (photo 1 starts big in the middle, then joins the gallery).
  const SLOT = [[210, 38], [365, 38], [210, 178], [365, 178]]
  const SW = 140, SH = 120
  const g = kSmooth((t - 3.5) / 0.6) // photo 1 shrinking into its slot
  const placed = []
  {
    const x = 300 + (SLOT[0][0] - 300) * g, y = 70 + (SLOT[0][1] - 70) * g
    const w = 200 + (SW - 200) * g, h = 170 + (SH - 170) * g
    const s = easeOutBack(clamp((t - 0.2) / 0.5))
    if (s > 0) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2)); placed.push(photo(x, y, w, h, DOGS[0].bg, DOGS[0])); ctx.restore() }
  }
  for (let i = 1; i < 4; i++) {
    const t0 = 4.1 + (i - 1) * 0.55
    const s = easeOutBack(clamp((t - t0) / 0.45))
    if (s <= 0) continue
    const [x, y] = SLOT[i]
    ctx.save(); ctx.translate(x + SW / 2, y + SH / 2); ctx.scale(s, s); ctx.translate(-(x + SW / 2), -(y + SH / 2))
    placed.push(photo(x, y, SW, SH, DOGS[i].bg, DOGS[i])); ctx.restore()
  }

  // Step 3: the shared traits light up on every dog, and the checklist fills in.
  const traitStart = [6.7, 7.6, 8.5]
  const PANEL = { x: 540, y: 300 }
  const icon = (i, x, y) => {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round'
    if (i === 0) { ctx.lineWidth = 5; for (const lx of [-12, -4, 4, 12]) { ctx.beginPath(); ctx.moveTo(lx, -10); ctx.lineTo(lx, 12); ctx.stroke() } ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(15, -10); ctx.stroke() }
    if (i === 1) { ctx.beginPath(); ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#29B6F6'; ctx.beginPath(); ctx.moveTo(10, 8); ctx.quadraticCurveTo(15, 16, 10, 18); ctx.quadraticCurveTo(5, 16, 10, 8); ctx.fill() }
    if (i === 2) { ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-12, 10); ctx.quadraticCurveTo(10, 8, 8, -14); ctx.stroke() }
    ctx.restore()
  }
  if (t >= 6.5) {
    const a = kSmooth((t - 6.5) / 0.4)
    ctx.save(); ctx.globalAlpha = a
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(PANEL.x, PANEL.y, 220, 60, 14); ctx.fill(); ctx.stroke()
    ctx.restore()
    for (let i = 0; i < 3; i++) {
      const s = easeOutBack(clamp((t - traitStart[i]) / 0.4))
      if (s <= 0) continue
      const x = PANEL.x + 40 + i * 70, y = PANEL.y + 30
      const lit = t >= 9.8 && t < 13 ? (t > 10.8 + i * 0.7 ? 1 : 0) : 0
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
      ctx.fillStyle = lit ? '#FFE082' : '#FFF8E1'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore()
      icon(i, x, y)
      for (const p of placed) { const q = traitAt(p, i); if (t < 9.8) ring(q.x, q.y, i === 0 ? 20 * p.s : 12 * p.s, kSmooth((t - traitStart[i]) / 0.3) * (1 - kSmooth((t - 9.5) / 0.3))) }
    }
  }

  // Step 4: a new photo comes in; Chip scans it for the three traits.
  if (t >= 9.8) {
    const slide = kSmooth((t - 9.8) / 0.6)
    const x = 820 + (555 - 820) * slide, y = 48
    const done = t >= 13
    const p = photo(x, y, 210, 175, NEW.bg, NEW, done ? '#22C55E' : null)
    if (!done && t > 10.4) { // scan line
      const u = ((t - 10.4) % 1.2) / 1.2
      ctx.fillStyle = 'rgba(14,165,233,0.35)'; ctx.fillRect(x + 8, y + 8 + u * 159, 194, 6)
    }
    for (let i = 0; i < 3; i++) { const q = traitAt(p, i); if (t > 10.8 + i * 0.7) ring(q.x, q.y, i === 0 ? 20 * p.s : 12 * p.s, 1) }
    // the question mark, then the tick
    if (!done) {
      const s = easeOutBack(clamp((t - 10.2) / 0.4))
      if (s > 0) { ctx.save(); ctx.translate(x + 200, y + 6); ctx.scale(s, s); ctx.fillStyle = '#F59E0B'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFFFFF'; ctx.font = '800 30px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2); ctx.restore() }
    } else kBadge(ctx, x + 200, y + 6, true, easeOutBack(clamp((t - 13) / 0.4)))
  }

  // Chip, with a thought bubble showing a dog in step 1 and in the finale.
  const pose = t >= 13 ? 'cheer' : t >= 6.5 && t < 9.8 ? 'point' : 'wave'
  drawChipAvatar(ctx, 95, 270, 1.15, pose, t)
  const bubbleOn = (t > 0.8 && t < 3.4) || t > 13.2
  if (bubbleOn) {
    const s = easeOutBack(clamp((t > 13 ? t - 13.2 : t - 0.8) / 0.35))
    kBubble(ctx, 120, 150, s, () => drawDog(-2, 4, 0.36, { body: '#C68642', ear: '#8D5524', seed: 0 }))
  }
  if (t >= 13.2) kConfetti(ctx, t - 13.2, W, H)
}
// Lesson 2 Kids: Chip's picture rulebook works out "bird", then "duck". Cues 0, 3.5, 6.5, 9.8, 13.0.
function renderChipRuleRobotFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const t = f / FPS
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
  const INK = '#1F2937'
  const lerp = (a, b, u) => a + (b - a) * u

  // ---------- icons ----------
  const icon = {
    feather: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.6); ctx.fillStyle = '#26A69A'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(12, -4, 0, 16); ctx.quadraticCurveTo(-12, -4, 0, -18); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 22); ctx.stroke(); ctx.restore() },
    note: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#7E57C2'; ctx.strokeStyle = '#7E57C2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-5, 10, 8, 6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(2, 9); ctx.lineTo(2, -16); ctx.quadraticCurveTo(12, -10, 12, -2); ctx.stroke(); ctx.restore() },
    bird: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#42A5F5'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(0, 3, 16, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(12, -8, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FFA726'; ctx.beginPath(); ctx.moveTo(19, -9); ctx.lineTo(27, -6); ctx.lineTo(19, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1E88E5'; ctx.beginPath(); ctx.ellipse(-3, 2, 9, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(14, -10, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.restore() },
    water: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = '#1E88E5'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (const dy of [-7, 5]) { ctx.beginPath(); ctx.moveTo(-18, dy); for (let i = 0; i <= 6; i++) ctx.lineTo(-18 + i * 6, dy + (i % 2 ? -4 : 4)); ctx.stroke() } ctx.restore() },
    duck: (x, y, s) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#FFD54F'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(-2, 5, 18, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(11, -8, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#FB8C00'; ctx.beginPath(); ctx.ellipse(22, -6, 6, 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(13, -10, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFCA28'; ctx.beginPath(); ctx.ellipse(-4, 3, 9, 5, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore() },
  }
  const arrow = (x, y) => { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 8, y); ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 8, y); ctx.lineTo(x + 2, y + 6); ctx.stroke() }
  const plus = (x, y) => { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke() }
  const disc = (x, y, r, fill, glow) => { ctx.save(); if (glow) { ctx.shadowColor = '#FACC15'; ctx.shadowBlur = 16 } ctx.fillStyle = fill; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore() }

  // ---------- scene ----------
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8FD3F4'); sky.addColorStop(0.7, '#D8F1FB')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#9CCC65'; ctx.beginPath(); ctx.ellipse(400, 470, 560, 150, 0, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#7CB342'; ctx.fillRect(0, 380, W, 70)
  ctx.fillStyle = '#4FC3F7'; ctx.strokeStyle = '#0288D1'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.ellipse(690, 392, 120, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke() // pond
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2
  for (const [px, ph] of [[650, 0], [720, 1.5]]) { ctx.beginPath(); ctx.ellipse(px, 392, 18 + Math.sin(t * 2 + ph) * 4, 4, 0, 0, Math.PI * 2); ctx.stroke() }

  // the duck: hidden behind the bush until the end, then swims out
  const duckOut = kSmooth((t - 13.8) / 1.0)
  const drawDuckOut = () => icon.duck(lerp(690, 610, duckOut), lerp(330, 388, duckOut) + Math.sin(t * 4) * 2, 2.0)
  if (duckOut > 0 && duckOut < 0.5) drawDuckOut()

  // the bush, rustling when a clue comes out of it
  const rustle = (t > 3.6 && t < 5.6) || (t > 9.9 && t < 11.2) ? Math.sin(t * 30) * 3 : 0
  ctx.fillStyle = '#43A047'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
  for (const [bx, by, r] of [[640, 330, 38], [690, 305, 46], [742, 330, 38], [690, 345, 40]]) { ctx.beginPath(); ctx.arc(bx + rustle, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
  ctx.fillStyle = '#66BB6A'; for (const [bx, by, r] of [[675, 292, 14], [722, 318, 11]]) { ctx.beginPath(); ctx.arc(bx + rustle, by, r, 0, Math.PI * 2); ctx.fill() }

  if (duckOut >= 0.5) drawDuckOut()

  // ---------- the rulebook ----------
  const open = kSmooth((t - 0.2) / 0.7)
  const B = { x: 385, y: 40, pw: 175, ph: 200 }
  ctx.fillStyle = '#8D6E63'; ctx.strokeStyle = INK; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(B.x - B.pw * open - 10, B.y - 8, (B.pw * open + 10) * 2, B.ph + 16, 10); ctx.fill(); ctx.stroke() // cover
  const pageGlow = [t > 6.6 && t < 9.8, t > 13 && t < 15]
  for (const side of [0, 1]) {
    const w = B.pw * open
    const x = side ? B.x : B.x - w
    ctx.save(); if (pageGlow[side]) { ctx.shadowColor = '#FACC15'; ctx.shadowBlur = 24 }
    ctx.fillStyle = pageGlow[side] ? '#FFFDE7' : '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.roundRect(x, B.y, w, B.ph, 6); ctx.fill(); ctx.stroke(); ctx.restore()
  }
  const RULE = [
    { cx: B.x - B.pw / 2, ins: ['feather', 'note'], out: 'bird', tick: 7.6 },
    { cx: B.x + B.pw / 2, ins: ['bird', 'water'], out: 'duck', tick: 13.6 },
  ]
  if (open > 0.95) {
    RULE.forEach((r, i) => {
      // rule number
      disc(r.cx, B.y + 30, 17, '#FFE082', false)
      ctx.fillStyle = INK; ctx.font = '800 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), r.cx, B.y + 31)
      // ins (top row) and out (bottom), drawn as a little picture sum
      const lit = pageGlow[i]
      disc(r.cx - 40, B.y + 85, 24, lit ? '#FFF59D' : '#F5F5F5', lit); icon[r.ins[0]](r.cx - 40, B.y + 85, 0.9)
      plus(r.cx, B.y + 85)
      disc(r.cx + 40, B.y + 85, 24, lit ? '#FFF59D' : '#F5F5F5', lit); icon[r.ins[1]](r.cx + 40, B.y + 85, 0.9)
      ctx.save(); ctx.translate(r.cx, B.y + 125); ctx.rotate(Math.PI / 2); arrow(0, 0); ctx.restore()
      disc(r.cx, B.y + 163, 26, '#E3F2FD', false); icon[r.out](r.cx, B.y + 163, 1.0)
      kBadge(ctx, r.cx + 48, B.y + 30, true, easeOutBack(clamp((t - r.tick) / 0.35)) * 0.75)
    })
  }

  // ---------- the clue tray (what Chip knows so far) ----------
  const TRAY = { x: 225, y: 290, w: 320, h: 66 }
  ctx.fillStyle = '#ECEFF1'; ctx.strokeStyle = INK; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 14); ctx.fill(); ctx.stroke()
  const slot = (i) => ({ x: TRAY.x + 45 + i * 76, y: TRAY.y + 33 })
  for (let i = 0; i < 4; i++) { const p = slot(i); ctx.strokeStyle = '#B0BEC5'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
  // clue tokens: [icon, from, t0, t1, slot]
  const BUSH = { x: 690, y: 300 }
  const tokens = [
    ['feather', BUSH, 3.9, 4.8, 0],
    ['note', BUSH, 4.6, 5.5, 1],
    ['bird', { x: RULE[0].cx, y: B.y + 163 }, 8.0, 8.8, 2],
    ['water', { x: 640, y: 392 }, 10.3, 11.2, 3],
  ]
  for (const [name, from, t0, t1, si] of tokens) {
    if (t < t0) continue
    const u = kSmooth((t - t0) / (t1 - t0)), to = slot(si)
    const x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 60
    const lit = (si < 2 && t > 6.6 && t < 9.8) || (si >= 2 && t > 13 && t < 15)
    disc(x, y, 24, lit ? '#FFF59D' : '#FFFFFF', lit); icon[name](x, y, 0.9)
  }
  // links from the tray to the rule being checked
  const link = (si, x, y, a) => { if (a <= 0) return; const p = slot(si); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.moveTo(p.x, p.y - 24); ctx.lineTo(x, y + 24); ctx.stroke(); ctx.restore() }
  const a1 = kSmooth((t - 6.6) / 0.4) * (1 - kSmooth((t - 9.4) / 0.4)); link(0, RULE[0].cx - 40, B.y + 85, a1); link(1, RULE[0].cx + 40, B.y + 85, a1)
  const a2 = kSmooth((t - 13.0) / 0.4) * (1 - kSmooth((t - 14.8) / 0.4)); link(2, RULE[1].cx - 40, B.y + 85, a2); link(3, RULE[1].cx + 40, B.y + 85, a2)

  // music notes and splashes coming from the hidden animal
  if (t > 4.0 && t < 6.4) for (let i = 0; i < 3; i++) { const u = ((t - 4.0 + i * 0.5) % 1.5) / 1.5; ctx.globalAlpha = Math.min(1, 1.6 * (1 - u)); icon.note(705 + i * 18 + Math.sin(u * 6) * 6, 260 - u * 70, 0.8); ctx.globalAlpha = 1 }
  if (t > 10.0 && t < 12.6) for (let i = 0; i < 6; i++) { const u = ((t - 10.0 + i * 0.2) % 0.9) / 0.9; ctx.fillStyle = `rgba(30,136,229,${1 - u})`; ctx.beginPath(); ctx.arc(640 + Math.cos(i) * 30 * u, 385 - Math.sin(u * Math.PI) * 40 - i * 2, 4, 0, Math.PI * 2); ctx.fill() }

  // ---------- Chip ----------
  const pose = t >= 14.6 ? 'cheer' : (t > 6.6 && t < 9.8) || (t > 13 && t < 14.6) ? 'point' : 'wave'
  drawChipAvatar(ctx, 92, 268, 1.15, pose, t)
  const wonder = (t > 3.7 && t < 6.5) || (t > 10 && t < 13)
  if (wonder) kBubble(ctx, 118, 150, easeOutBack(clamp(((t > 9 ? t - 10 : t - 3.7)) / 0.35)), () => { ctx.fillStyle = '#F59E0B'; ctx.font = '800 32px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2) })
  if (t > 14.6) { kBubble(ctx, 118, 150, easeOutBack(clamp((t - 14.6) / 0.35)), () => icon.duck(0, 2, 1.1)); kConfetti(ctx, t - 14.6, W, H) }
}

const HELPERS = [kSmooth, kBadge, kConfetti, kRoom, kBubble].map(String).join('\n')
const SCENES = [
  { name: 'chip-rule-robot', fn: renderChipRuleRobotFrame, poster: 8.2 },
  { name: 'chip-dog-learning', fn: renderChipDogLearningFrame, poster: 5.4 },
  { name: 'chip-fruit-sorter', fn: renderChipFruitSorterFrame, poster: 1.75 }]
const STILLS = [1.75, 5.5, 7.8, 12.3, 15.4] // one moment in each cue

async function main() {
  const stillsIdx = process.argv.indexOf('--stills')
  const stillsDir = stillsIdx > 0 ? path.resolve(process.argv[stillsIdx + 1]) : null
  const browser = await chromium.launch()
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
  for (const scene of SCENES.filter((s) => !only || s.name === only)) {
    const page = await browser.newPage()
    const result = await page.evaluate(async ({ fn, chipFn, helpers, stills, posterAt }) => {
      const W = 800, H = 450, FPS = 60, TOTAL = 16 * FPS
      const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
      const renderFrame = new Function('ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', 'easeOutBack', `const drawChipAvatar = ${chipFn};\n${helpers}\nreturn (${fn})(ctx, f, totalFrames, W, H, FPS, easeOutBack);`)
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      if (stills) return { stills: stills.map((s) => { renderFrame(ctx, Math.round(s * FPS), TOTAL, W, H, FPS, easeOutBack); return canvas.toDataURL('image/png') }) }
      const stream = canvas.captureStream(FPS)
      const rec = (mime, bps) => { const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps }); const c = []; r.ondataavailable = (e) => e.data.size && c.push(e.data); r.start(100); return { r, c, mime } }
      const recs = [rec('video/webm;codecs=vp9', 270_000)]
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) recs.push(rec('video/mp4;codecs=avc1', 270_000))
      let poster = null
      for (let f = 0; f < TOTAL; f++) {
        renderFrame(ctx, f, TOTAL, W, H, FPS, easeOutBack)
        if (f === Math.round(posterAt * FPS)) poster = canvas.toDataURL('image/jpeg', 0.85)
        await new Promise((r) => setTimeout(r, 1000 / FPS))
      }
      const out = {}
      for (const { r, c, mime } of recs) { await new Promise((res) => { r.onstop = res; r.stop() }); out[mime.startsWith('video/webm') ? 'webm' : 'mp4'] = Array.from(new Uint8Array(await new Blob(c).arrayBuffer())) }
      return { ...out, poster }
    }, { fn: scene.fn.toString(), chipFn, helpers: HELPERS, stills: stillsDir ? STILLS : null, posterAt: scene.poster })
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
