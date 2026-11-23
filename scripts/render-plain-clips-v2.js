// SPEC: FR-UI-28, FR-CNT-13 (SPEC-014 clips), visual pass 2026-11-23.
// Plain English clips, second style: calm adult look (warm paper, muted palette, flat shapes), motion timed to the
// lesson cues (0, 3.5, 6.5, 9.8, 13.0; 16 s) so each spoken step matches the screen. No words in the frame.
//   node scripts/render-plain-clips-v2.js [--only=<name>] --stills <outDir>   one PNG per cue, for review
//   node scripts/render-plain-clips-v2.js [--only=<name>]                     webm, mp4, poster to web/public and design/brand/source
const fs = require('fs')
const path = require('path')
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'))

// Shared helpers, injected into each scene's frame function.
const HELPERS = `
const C = { bg: '#F4F1EA', panel: '#FFFFFF', ink: '#243042', muted: '#8A94A6', line: '#D9D4C7',
  good: '#2A9D8F', bad: '#E76F51', warn: '#E9A23B', navy: '#264653', soft: '#EAE6DC' }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const sm = (v) => { v = clamp(v); return v * v * (3 - 2 * v) }
const lerp = (a, b, u) => a + (b - a) * u
const pBg = (ctx, W, H) => { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H) }
const pPanel = (ctx, x, y, w, h, a = 1) => {
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = 'rgba(36,48,66,0.06)'; ctx.beginPath(); ctx.roundRect(x + 3, y + 5, w, h, 14); ctx.fill()
  ctx.fillStyle = C.panel; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.restore()
}
const pPerson = (ctx, x, y, s, col) => {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col
  ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.roundRect(-15, -9, 30, 26, [14, 14, 4, 4]); ctx.fill(); ctx.restore()
}
const pMark = (ctx, x, y, kind, s = 1) => {
  if (s <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  ctx.fillStyle = kind === 'ok' ? C.good : kind === 'no' ? C.bad : C.warn
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath()
  if (kind === 'ok') { ctx.moveTo(-5, 0); ctx.lineTo(-1.5, 4); ctx.lineTo(5, -4); ctx.stroke() }
  else if (kind === 'no') { ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.stroke() }
  else { ctx.fillStyle = '#FFFFFF'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1) }
  ctx.restore()
}
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
`

// Lesson 1: handwritten rules vs learning from records.
function renderPlainRulesVsLearningFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  const leftA = 1 - 0.55 * sm((t - 6.4) / 0.6)
  const rightA = 0.45 + 0.55 * sm((t - 6.2) / 0.6)
  pPanel(ctx, 30, 40, 350, 370, leftA)
  pPanel(ctx, 420, 40, 350, 370, rightA)

  // ---------- left: a person's hand-written rule flow ----------
  ctx.save(); ctx.globalAlpha = leftA
  // author at the top-left with a rule sheet
  pPerson(ctx, 70, 102, 1, C.navy)
  ctx.fillStyle = C.soft; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(95, 70, 44, 54, 4); ctx.fill(); ctx.stroke()
  const lines = Math.floor(clamp(t / 2.5) * 4)
  ctx.strokeStyle = C.muted; ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) if (i < lines || t > 2.5) { ctx.beginPath(); ctx.moveTo(102, 82 + i * 11); ctx.lineTo(132 - (i % 2) * 8, 82 + i * 11); ctx.stroke() }
  // two gates: income at least a bar, debt at most a bar
  const gate = (x, y, kind) => {
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.navy; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + 30, y); ctx.lineTo(x, y + 26); ctx.lineTo(x - 30, y); ctx.closePath(); ctx.fill(); ctx.stroke()
    if (kind === 'income') { ctx.fillStyle = C.good; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y + 8 - i * 6, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill() } }
    else { ctx.fillStyle = C.bad; ctx.fillRect(x - 10, y - 2, 6, 12); ctx.fillRect(x - 2, y - 8, 6, 18); ctx.fillStyle = C.navy; ctx.fillRect(x - 13, y - 11, 20, 2) }
  }
  const G1 = { x: 230, y: 150 }, G2 = { x: 230, y: 245 }
  ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.setLineDash([6, 6])
  ctx.beginPath(); ctx.moveTo(150, 100); ctx.lineTo(G1.x, G1.y - 26); ctx.moveTo(G1.x, G1.y + 26); ctx.lineTo(G2.x, G2.y - 26)
  ctx.moveTo(G2.x, G2.y + 26); ctx.lineTo(320, 345); ctx.moveTo(G1.x - 30, G1.y); ctx.lineTo(95, 335); ctx.stroke(); ctx.setLineDash([])
  gate(G1.x, G1.y, 'income'); gate(G2.x, G2.y, 'debt')
  // trays: approved (right), manual review (left)
  ctx.fillStyle = C.soft; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.roundRect(280, 340, 80, 50, 8); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.roundRect(50, 340, 110, 50, 8); ctx.fill(); ctx.stroke()
  pMark(ctx, 320, 400, 'ok', 0.9)
  // applications: two bars on a card (income, debt); odd ones have a jagged third mark
  const card = (x, y, odd, a = 1) => {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = odd ? C.warn : C.navy; ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.roundRect(-17, -12, 34, 24, 3); ctx.fill(); ctx.stroke()
    ctx.fillStyle = C.good; ctx.fillRect(-12, -6, 18, 4)
    ctx.fillStyle = C.bad; ctx.fillRect(-12, 2, 10, 4)
    if (odd) { ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(7, 0); ctx.lineTo(10, 6); ctx.lineTo(13, 0); ctx.stroke() }
    ctx.restore()
  }
  const along = (pts, u) => {
    const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), v = u * n - k
    return { x: lerp(pts[k][0], pts[k + 1][0], v), y: lerp(pts[k][1], pts[k + 1][1], v) }
  }
  const okPath = [[150, 100], [G1.x, G1.y], [G2.x, G2.y], [320, 360]]
  // step 1: three ordinary cards pass both gates
  let done = 0
  for (const t0 of [0.6, 1.5, 2.4]) {
    const u = (t - t0) / 1.4
    if (u >= 1) done++
    else if (u > 0) { const p = along(okPath, sm(u)); card(p.x, p.y, false) }
  }
  for (let i = 0; i < done; i++) card(300 + (i % 3) * 18, 362 - i * 3, false)
  // step 2: odd cards stall at the first gate and pile into review
  let piled = 0
  const odds = [3.6, 4.1, 4.6, 5.1, 5.6, 6.0]
  for (const t0 of odds) {
    const u = t - t0
    if (u > 1.4) { piled++; continue }
    if (u <= 0) continue
    if (u < 0.6) { const p = along([[150, 100], [G1.x, G1.y]], sm(u / 0.6)); card(p.x, p.y, true) }
    else if (u < 0.9) card(G1.x + Math.sin(u * 60) * 3, G1.y, true)
    else { const v = sm((u - 0.9) / 0.5); card(lerp(G1.x, 80 + (piled % 3) * 18, v), lerp(G1.y, 360, v), true) }
  }
  for (let i = 0; i < piled; i++) card(80 + (i % 3) * 18, 368 - Math.floor(i / 3) * 10, true)
  pPerson(ctx, 148, 382, 0.6, C.warn)
  if (t > 4.2) pMark(ctx, 160, 340, 'q', sm((t - 4.2) / 0.4) * (0.9 + 0.08 * Math.sin(t * 6)))
  ctx.restore()

  // ---------- right: records with outcomes, then a learned boundary ----------
  ctx.save(); ctx.globalAlpha = rightA
  const X0 = 460, Y0 = 370, X1 = 745, Y1 = 70 // plot: income right, debt up
  ctx.strokeStyle = C.muted; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X0, Y0); ctx.lineTo(X1, Y0); ctx.stroke()
  // coins under the x axis, red bars beside the y axis
  ctx.fillStyle = C.good; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(X1 - 12, Y0 + 18 - i * 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = C.bad; ctx.fillRect(X0 - 22, Y1 + 4, 5, 10); ctx.fillRect(X0 - 15, Y1, 5, 14)
  const bx = (yy) => 520 + 0.0016 * (370 - yy) * (370 - yy) // boundary: x as a function of y
  // shaded regions after the boundary is learnt
  const reg = sm((t - 11.4) / 1.0)
  if (reg > 0) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(X0 + 1, Y1)
    for (let yy = Y1; yy <= Y0; yy += 6) ctx.lineTo(Math.min(X1, bx(yy)), yy)
    ctx.lineTo(X0 + 1, Y0); ctx.closePath(); ctx.fillStyle = `rgba(231,111,81,${0.10 * reg})`; ctx.fill()
    ctx.beginPath(); ctx.moveTo(X1, Y1)
    for (let yy = Y1; yy <= Y0; yy += 6) ctx.lineTo(Math.min(X1, bx(yy)), yy)
    ctx.lineTo(X1, Y0); ctx.closePath(); ctx.fillStyle = `rgba(42,157,143,${0.10 * reg})`; ctx.fill(); ctx.restore()
  }
  // step 3: past records land as coloured dots
  const pts = []
  for (let i = 0; i < 26; i++) {
    const y = 90 + rnd(i) * 260, side = rnd(i + 50) > 0.5 ? 1 : -1
    const x = clamp(bx(y) + side * (18 + rnd(i + 99) * 90), X0 + 12, X1 - 12)
    pts.push({ x, y, good: x > bx(y), t0: 6.6 + i * 0.11 })
  }
  for (const p of pts) {
    const u = (t - p.t0) / 0.35
    if (u <= 0) continue
    const s = u >= 1 ? 1 : 1 + 0.7 * (1 - u) * Math.sin(u * Math.PI)
    const yy = u >= 1 ? p.y : lerp(p.y - 30, p.y, sm(u))
    ctx.fillStyle = p.good ? C.good : C.bad; ctx.beginPath(); ctx.arc(p.x, yy, 6 * s, 0, Math.PI * 2); ctx.fill()
  }
  // step 4: the boundary sweeps into place
  const b = sm((t - 9.9) / 1.8)
  if (b > 0) {
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3; ctx.beginPath()
    const yEnd = lerp(Y1, Y0, b)
    for (let yy = Y1; yy <= yEnd; yy += 4) { const xx = Math.min(X1, bx(yy)); yy === Y1 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy) }
    ctx.stroke()
  }
  // step 5: new cases are scored; only the close one goes to a person
  const fresh = [{ x: 690, y: 300, t0: 13.1 }, { x: 500, y: 130, t0: 13.7 }, { x: 0, y: 240, t0: 14.3, edge: true }]
  fresh[2].x = bx(240) + 4
  for (const p of fresh) {
    const u = (t - p.t0) / 0.5
    if (u <= 0) continue
    const yy = lerp(Y1 - 20, p.y, sm(Math.min(1, u)))
    const col = p.edge ? C.warn : p.x > bx(p.y) ? C.good : C.bad
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillStyle = u > 1.2 ? col : '#FFFFFF'
    ctx.beginPath(); ctx.arc(p.x, yy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (u > 1.2) pMark(ctx, p.x + 16, yy - 14, p.edge ? 'q' : p.x > bx(p.y) ? 'ok' : 'no', sm((u - 1.2) / 0.4))
  }
  if (t > 15.0) { const a = sm((t - 15.0) / 0.5); ctx.globalAlpha = rightA * a; pPerson(ctx, 712, 250, 0.7, C.warn) }
  ctx.restore()
}

const SCENES = [
  { name: 'plain-rules-vs-learning', fn: renderPlainRulesVsLearningFrame, poster: 12.5 }]
const STILLS = [2.2, 5.8, 8.6, 12.3, 15.6]

async function main() {
  const stillsIdx = process.argv.indexOf('--stills')
  const stillsDir = stillsIdx > 0 ? path.resolve(process.argv[stillsIdx + 1]) : null
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
  const browser = await chromium.launch()
  for (const scene of SCENES.filter((s) => !only || s.name === only)) {
    const page = await browser.newPage()
    const result = await page.evaluate(async ({ fn, helpers, stills, posterAt, bps }) => {
      const W = 800, H = 450, FPS = 60, TOTAL = 16 * FPS
      const renderFrame = new Function('ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', `${helpers}\nreturn (${fn})(ctx, f, totalFrames, W, H, FPS);`)
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      if (stills) return { stills: stills.map((s) => { renderFrame(ctx, Math.round(s * FPS), TOTAL, W, H, FPS); return canvas.toDataURL('image/png') }) }
      const stream = canvas.captureStream(FPS)
      const rec = (mime) => { const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps }); const c = []; r.ondataavailable = (e) => e.data.size && c.push(e.data); r.start(100); return { r, c, mime } }
      const recs = [rec('video/webm;codecs=vp9')]
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) recs.push(rec('video/mp4;codecs=avc1'))
      let poster = null
      for (let f = 0; f < TOTAL; f++) {
        renderFrame(ctx, f, TOTAL, W, H, FPS)
        if (f === Math.round(posterAt * FPS)) poster = canvas.toDataURL('image/jpeg', 0.85)
        await new Promise((r) => setTimeout(r, 1000 / FPS))
      }
      const out = {}
      for (const { r, c, mime } of recs) { await new Promise((res) => { r.onstop = res; r.stop() }); out[mime.startsWith('video/webm') ? 'webm' : 'mp4'] = Array.from(new Uint8Array(await new Blob(c).arrayBuffer())) }
      return { ...out, poster }
    }, { fn: scene.fn.toString(), helpers: HELPERS, stills: stillsDir ? STILLS : null, posterAt: scene.poster, bps: scene.bps || 270_000 })
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
