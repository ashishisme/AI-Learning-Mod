// SPEC: FR-UI-28, FR-CNT-13 (SPEC-014 clips), visual pass 2026-11-23.
// Plain English and Detailed clips, second style: calm adult look (warm paper, muted palette, flat shapes), motion timed to the
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

// Lesson 2: a loan decision tree, two applicants, and the audit trail of one route.
function renderPlainDecisionTreeFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  const N = { root: [400, 78], job: [220, 188], debt: [580, 188] }
  const L = { decline: [120, 300], reviewA: [320, 300], approve: [480, 300], reviewB: [680, 300] }
  const kinds = { decline: 'no', reviewA: 'q', approve: 'ok', reviewB: 'q' }
  // route of applicant B (for the audit highlight)
  const audit = sm((t - 13.1) / 0.8)
  const edge = (a, b, hot, col = C.line) => {
    ctx.strokeStyle = hot > 0 ? C.navy : col; ctx.lineWidth = hot > 0 ? 3 + 3 * hot : 3
    ctx.beginPath(); ctx.moveTo(a[0], a[1] + 28); ctx.bezierCurveTo(a[0], a[1] + 60, b[0], b[1] - 60, b[0], b[1] - 28); ctx.stroke()
  }
  edge(N.root, N.job, 0); edge(N.root, N.debt, audit)
  edge(N.job, L.decline, 0); edge(N.job, L.reviewA, 0); edge(N.debt, L.approve, audit); edge(N.debt, L.reviewB, 0)
  const lit = (t0) => sm((t - t0) / 0.4)
  const node = (p, icon, on) => {
    const [x, y] = p
    ctx.fillStyle = on > 0 ? '#FFFFFF' : C.panel; ctx.strokeStyle = on > 0 ? C.navy : C.line; ctx.lineWidth = 2 + on
    if (on > 0) { ctx.fillStyle = 'rgba(38,70,83,0.08)'; ctx.beginPath(); ctx.roundRect(x - 48, y - 36, 96, 72, 18); ctx.fill() }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(x - 40, y - 28, 80, 56, 12); ctx.fill(); ctx.stroke()
    icon(x, y)
  }
  const coins = (x, y) => { ctx.fillStyle = C.good; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x - 8, y + 12 - i * 6, 11, 4, 0, 0, Math.PI * 2); ctx.fill() } ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x - 24, y - 4); ctx.lineTo(x + 24, y - 4); ctx.stroke(); ctx.setLineDash([]) }
  const job = (x, y) => { ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(x - 26, y - 8, 26, 20, 3); ctx.fill(); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.strokeRect(x - 18, y - 13, 10, 5)
    ctx.strokeStyle = C.muted; ctx.strokeRect(x + 4, y - 14, 22, 26); for (let i = 0; i < 6; i++) { ctx.fillStyle = i < 5 ? C.good : C.line; ctx.fillRect(x + 7 + (i % 3) * 6, y - 6 + Math.floor(i / 3) * 8, 4, 4) } }
  const debt = (x, y) => { ctx.fillStyle = C.good; ctx.fillRect(x - 22, y - 12, 12, 26); ctx.fillStyle = C.bad; ctx.fillRect(x - 6, y + 2, 12, 12); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 24, y - 12); ctx.stroke() }
  node(N.root, coins, lit(0.3)); node(N.job, job, lit(4.4)); node(N.debt, debt, lit(7.4))
  // leaves
  for (const k of Object.keys(L)) {
    const [x, y] = L[k]
    const on = k === 'reviewA' || k === 'approve' ? lit(11.2) : lit(10.4) * 0.6
    ctx.fillStyle = C.soft; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.roundRect(x - 34, y - 22, 68, 44, 22); ctx.fill(); ctx.stroke()
    ctx.globalAlpha = 0.35 + 0.65 * on; pMark(ctx, x, y, kinds[k], 1.1); ctx.globalAlpha = 1
  }
  // applicants: a token with an income bar on top
  const token = (x, y, col, inc) => {
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = col; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    pPerson(ctx, x, y + 9, 0.45, col)
    ctx.fillStyle = C.soft; ctx.fillRect(x - 18, y - 30, 36, 6); ctx.fillStyle = C.good; ctx.fillRect(x - 18, y - 30, 36 * inc, 6)
  }
  const path = (pts, u) => {
    const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), v = sm(u * n - k)
    return [lerp(pts[k][0], pts[k + 1][0], v), lerp(pts[k][1], pts[k + 1][1], v)]
  }
  const at = (p, dx = 0) => [p[0] + dx, p[1] - 48]
  // A: low income, comes in at 0.6, waits at root, goes to job check (3.6), then to review (10.0)
  const posA = t < 0.6 ? null : t < 3.6 ? path([[300, -30], [320, 78]], clamp((t - 0.6) / 1.2)) : t < 10 ? path([[320, 78], at(N.job)], clamp((t - 3.6) / 1.4)) : path([at(N.job), [L.reviewA[0], L.reviewA[1] - 44]], clamp((t - 10) / 1.2))
  // B: high income, arrives at 2.0, goes right at 6.6, then to approve (10.6)
  const posB = t < 2.0 ? null : t < 6.6 ? path([[500, -30], [480, 78]], clamp((t - 2.0) / 1.2)) : t < 10.6 ? path([[480, 78], at(N.debt)], clamp((t - 6.6) / 1.4)) : path([at(N.debt), [L.approve[0], L.approve[1] - 44]], clamp((t - 10.6) / 1.2))
  if (posA) token(posA[0], posA[1], C.warn, 0.3)
  if (posB) token(posB[0], posB[1], C.navy, 0.85)
  // audit trail: the steps of B's route, ticked one after another
  const a = sm((t - 13.2) / 0.5)
  if (a > 0) {
    ctx.save(); ctx.globalAlpha = a
    pPanel(ctx, 210, 362, 380, 64)
    const icons = [coins, debt, (x, y) => pMark(ctx, x, y, 'ok', 1.4)]
    icons.forEach((ic, i) => {
      const s = sm((t - 13.6 - i * 0.55) / 0.35)
      if (s <= 0) return
      ctx.globalAlpha = a * s; const x = 270 + i * 130
      ctx.save(); ctx.translate(x, 394); ctx.scale(0.75, 0.75); ic(0, 0); ctx.restore()
      if (i < 2) { ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 32, 394); ctx.lineTo(x + 96, 394); ctx.moveTo(x + 88, 388); ctx.lineTo(x + 96, 394); ctx.lineTo(x + 88, 400); ctx.stroke() }
    })
    ctx.restore()
  }
}

// Lesson 3: a trial line between loyal and at-risk customers, corrected step by step.
function renderPlainLinearClassifierFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  pPanel(ctx, 120, 30, 560, 390)
  const X0 = 180, X1 = 640, Y0 = 380, Y1 = 60
  const px = (u) => lerp(X0, X1, u), py = (v) => lerp(Y0, Y1, v)
  // axes: engagement (pulse) to the right, tenure (calendar) upward
  ctx.strokeStyle = C.muted; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(X0, Y1); ctx.lineTo(X0, Y0); ctx.lineTo(X1, Y0); ctx.stroke()
  ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X1 - 40, Y0 + 20); ctx.lineTo(X1 - 30, Y0 + 20); ctx.lineTo(X1 - 25, Y0 + 11); ctx.lineTo(X1 - 19, Y0 + 28); ctx.lineTo(X1 - 14, Y0 + 20); ctx.lineTo(X1 - 4, Y0 + 20); ctx.stroke()
  ctx.strokeStyle = C.navy; ctx.strokeRect(X0 - 38, Y1, 22, 20); ctx.fillStyle = C.navy; ctx.fillRect(X0 - 38, Y1, 22, 6)
  // line: through (cx, cy) at angle a (normalised, y up); loyal side is where n·(p-c) > 0
  const iters = [{ cx: 0.5, cy: 0.72, a: 0 }, { cx: 0.5, cy: 0.64, a: -0.3 }, { cx: 0.5, cy: 0.56, a: -0.58 }, { cx: 0.5, cy: 0.5, a: -0.79 }]
  const k = clamp((t - 9.9) / 2.7) * 3, ki = Math.min(2, Math.floor(k)), kv = sm(k - ki)
  const L = { cx: lerp(iters[ki].cx, iters[ki + 1].cx, kv), cy: lerp(iters[ki].cy, iters[ki + 1].cy, kv), a: lerp(iters[ki].a, iters[ki + 1].a, kv) }
  if (t < 9.9) Object.assign(L, iters[0])
  const side = (u, v) => -Math.sin(L.a) * (u - L.cx) + Math.cos(L.a) * (v - L.cy)
  // step 5: shade the at-risk side
  const shade = sm((t - 13.1) / 0.6)
  if (shade > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y1, X1 - X0, Y0 - Y1); ctx.clip()
    const d = [Math.cos(L.a), Math.sin(L.a)], nrm = [-Math.sin(L.a), Math.cos(L.a)]
    ctx.beginPath()
    for (const [s1, s2] of [[-2, 0], [2, 0], [2, -2], [-2, -2]]) { const u = L.cx + d[0] * s1 + nrm[0] * s2, v = L.cy + d[1] * s1 + nrm[1] * s2; ctx.lineTo(px(u), py(v)) }
    ctx.fillStyle = `rgba(231,111,81,${0.12 * shade})`; ctx.fill(); ctx.restore()
  }
  // accounts
  const pts = []
  for (let i = 0; i < 30; i++) {
    const loyal = i % 2 === 0
    const r = 0.12 + rnd(i) * 0.36, th = rnd(i + 40) * Math.PI / 2
    const u = loyal ? 0.92 - r * Math.cos(th) : 0.08 + r * Math.cos(th)
    const v = loyal ? 0.92 - r * Math.sin(th) : 0.08 + r * Math.sin(th)
    pts.push({ u, v, loyal, t0: 0.3 + i * 0.09 })
  }
  // step 2: the trial line
  const draw = t < 3.6 ? 0 : sm((t - 3.6) / 1.2)
  for (const p of pts) {
    const s = sm((t - p.t0) / 0.3)
    if (s <= 0) continue
    const x = px(p.u), y = py(p.v)
    const wrong = draw >= 1 && (side(p.u, p.v) > 0) !== p.loyal
    if (wrong && t > 6.6) { const pulse = 0.5 + 0.5 * Math.sin(t * 7); ctx.strokeStyle = C.warn; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12 + 3 * pulse, 0, Math.PI * 2); ctx.stroke() }
    ctx.fillStyle = p.loyal ? C.good : C.bad; ctx.beginPath(); ctx.arc(x, y, 6.5 * s, 0, Math.PI * 2); ctx.fill()
    if (shade > 0 && !p.loyal) { const r = sm((t - 13.6 - p.u) / 0.4); if (r > 0) { ctx.strokeStyle = C.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 6 + 5 * r, 0, Math.PI * 2); ctx.stroke() } }
  }
  if (draw > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(X0, Y1, X1 - X0, Y0 - Y1); ctx.clip()
    const d = [Math.cos(L.a), Math.sin(L.a)], len = 1.2 * draw
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3.5; ctx.setLineDash(t < 9.9 ? [10, 8] : [])
    ctx.beginPath(); ctx.moveTo(px(L.cx - d[0] * len), py(L.cy - d[1] * len)); ctx.lineTo(px(L.cx + d[0] * len), py(L.cy + d[1] * len)); ctx.stroke()
    ctx.setLineDash([]); ctx.restore()
    // step 3: the errors push on the line (arrows at the pivot)
    const push = sm((t - 7.4) / 0.5) * (1 - sm((t - 12.6) / 0.5))
    if (push > 0) {
      ctx.save(); ctx.globalAlpha = push; ctx.translate(px(L.cx), py(L.cy)); ctx.strokeStyle = C.warn; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, 34, -2.6, -1.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(Math.cos(-1.5) * 34 - 8, Math.sin(-1.5) * 34 - 4); ctx.lineTo(Math.cos(-1.5) * 34, Math.sin(-1.5) * 34); ctx.lineTo(Math.cos(-1.5) * 34 - 6, Math.sin(-1.5) * 34 + 8); ctx.stroke()
      ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
  }
  // step 5: the team steps in
  const team = sm((t - 14.0) / 0.6)
  if (team > 0) { ctx.save(); ctx.globalAlpha = team; pPerson(ctx, 730, 330, 1, C.navy); pPerson(ctx, 760, 345, 0.8, C.good); ctx.restore() }
}

// Lesson 4: a camera's pixel grid, a sliding 3x3 filter, edges that outline a crack, then screening on a line.
function renderPlainImageFeatureScanFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  const COLS = 12, ROWS = 9, CS = 24
  const G1 = { x: 60, y: 76 }, G2 = { x: 452, y: 76 }
  const crackRow = (c) => 1.2 + c * 0.55 + 0.6 * Math.sin(c * 1.3)
  const isCrack = (r, c) => Math.abs(r - crackRow(c)) < 0.55
  const val = (r, c) => isCrack(r, c) ? 70 : 165 + Math.floor(rnd(r * 13 + c) * 40)
  const dim = 1 - 0.65 * sm((t - 13.0) / 0.6)
  ctx.save(); ctx.globalAlpha = dim
  pPanel(ctx, 40, 30, 330, 290); pPanel(ctx, 432, 30, 330, 290)
  // camera above the part, flash at 0.8 s
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(186, 40, 48, 26, 5); ctx.fill()
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(210, 53, 8, 0, Math.PI * 2); ctx.fill()
  const flash = Math.max(0, 1 - Math.abs(t - 0.9) / 0.3)
  // the part: a smooth plate that turns into pixels
  const pix = sm((t - 1.5) / 1.5)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = G1.x + c * CS, y = G1.y + r * CS
    const v = Math.round(lerp(isCrack(r, c) ? 120 : 185, val(r, c), pix))
    ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`; ctx.fillRect(x, y, CS, CS)
    if (pix > 0) { ctx.strokeStyle = `rgba(255,255,255,${0.7 * pix})`; ctx.lineWidth = 1; ctx.strokeRect(x, y, CS, CS) }
  }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.8 * flash})`; ctx.fillRect(G1.x, G1.y, COLS * CS, ROWS * CS) }
  // feature map frame (right)
  ctx.fillStyle = C.soft; ctx.fillRect(G2.x, G2.y, COLS * CS, ROWS * CS)
  // scan: 3x3 window over (ROWS-2) x (COLS-2) positions, 3.6 s .. 9.4 s
  const NP = (ROWS - 2) * (COLS - 2)
  const scanned = Math.floor(clamp((t - 3.6) / 5.8) * NP)
  const strength = (r, c) => { let k = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (isCrack(r + i, c + j)) k++; return isCrack(r + 1, c + 1) ? 1 : k > 0 ? 0.15 : 0 }
  for (let n = 0; n < scanned; n++) {
    const r = Math.floor(n / (COLS - 2)), c = n % (COLS - 2), s = strength(r, c)
    const x = G2.x + (c + 1) * CS, y = G2.y + (r + 1) * CS
    ctx.fillStyle = s > 0.5 ? C.warn : s > 0 ? '#F6EBD9' : '#FFFFFF'; ctx.fillRect(x + 1, y + 1, CS - 2, CS - 2)
  }
  if (t > 3.6 && scanned < NP) {
    const r = Math.floor(scanned / (COLS - 2)), c = scanned % (COLS - 2)
    ctx.strokeStyle = C.navy; ctx.lineWidth = 3
    ctx.strokeRect(G1.x + c * CS, G1.y + r * CS, CS * 3, CS * 3)
    ctx.strokeStyle = C.warn; ctx.strokeRect(G2.x + (c + 1) * CS, G2.y + (r + 1) * CS, CS, CS)
    ctx.strokeStyle = 'rgba(38,70,83,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath()
    ctx.moveTo(G1.x + (c + 3) * CS, G1.y + (r + 1.5) * CS); ctx.lineTo(G2.x + (c + 1) * CS, G2.y + (r + 1.5) * CS); ctx.stroke(); ctx.setLineDash([])
  }
  // step 4: the edges join into the crack outline, drawn on both grids
  const out = sm((t - 9.9) / 2.4)
  if (out > 0) for (const G of [G1, G2]) {
    ctx.strokeStyle = C.bad; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath()
    const end = 0.5 + (COLS - 1) * out
    for (let c = 0.5; c <= end; c += 0.25) { const x = G.x + c * CS, y = G.y + (crackRow(c - 0.5) + 0.5) * CS; c === 0.5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
    ctx.stroke()
  }
  ctx.restore()
  // step 5: parts on a line; the cracked one is routed to an engineer
  const line = sm((t - 13.0) / 0.6)
  if (line > 0) {
    ctx.save(); ctx.globalAlpha = line
    ctx.fillStyle = '#5B6675'; ctx.fillRect(0, 360, 640, 12)
    for (let x = (t * 80) % 40; x < 640; x += 40) { ctx.fillStyle = '#8A94A6'; ctx.beginPath(); ctx.arc(x, 378, 5, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(379, 296, 44, 24, 5); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(401, 308, 7, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = C.soft; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(660, 380, 110, 50, 8); ctx.fill(); ctx.stroke()
    pPerson(ctx, 740, 372, 0.8, C.warn)
    for (let i = 0; i < 6; i++) {
      const x0 = -60 + ((t - 13) * 150 + i * 120)
      const bad = i === 2
      let x = x0, y = 342
      if (bad && x0 > 600) { const u = clamp((x0 - 600) / 80); x = 600 + 80 * u; y = 342 + 55 * sm(u) }
      if (x < -50 || x > 700) continue
      ctx.fillStyle = '#B8C0CC'; ctx.strokeStyle = C.navy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - 22, y - 14, 44, 28, 4); ctx.fill(); ctx.stroke()
      if (bad) { ctx.strokeStyle = C.bad; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 14, y - 8); ctx.lineTo(x - 2, y + 2); ctx.lineTo(x + 4, y - 3); ctx.lineTo(x + 14, y + 9); ctx.stroke() }
      if (x0 > 400) pMark(ctx, x, y - 26, bad ? 'q' : 'ok', sm((x0 - 400) / 30) * 0.8)
    }
    ctx.restore()
  }
}

// Lesson 5: a clause split into word chips, attention links, and context telling two meanings apart.
function renderPlainTransformerContextFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  const wrench = (x, y, col) => { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7); ctx.fillStyle = col; ctx.fillRect(-2.5, -2, 5, 16); ctx.beginPath(); ctx.arc(0, -6, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-2.5, -14, 5, 8); ctx.restore() }
  const coin = (x, y, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke() }
  const rowOf = (widths, y) => { const gap = 12, tot = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1); let x = (W - tot) / 2; return widths.map((w) => { const c = { x: x + w / 2, y, w }; x += w + gap; return c }) }
  const A = rowOf([54, 72, 40, 92, 60, 46, 84], 150), FOCUS = 3
  const B = rowOf([64, 44, 92, 70, 52, 80], 300), FB = 2
  const relA = { 1: 0.9, 5: 0.7, 0: 0.25, 6: 0.2 }, relB = { 3: 0.9, 5: 0.75, 1: 0.2 }
  // step 1: the contract page, one line lifts off and splits into chips
  const page = 1 - sm((t - 3.0) / 0.5)
  if (page > 0) {
    ctx.save(); ctx.globalAlpha = page; pPanel(ctx, 250, 30, 300, 230)
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i === 3 ? C.navy : C.line; ctx.fillRect(280, 60 + i * 24, i % 3 === 2 ? 180 : 240, 8) }
    ctx.restore()
  }
  const split = sm((t - 1.2) / 1.8)
  const chip = (c, k, fill, a = 1) => {
    ctx.save(); ctx.globalAlpha = a
    ctx.fillStyle = fill; ctx.strokeStyle = k === 'focus' ? C.warn : C.line; ctx.lineWidth = k === 'focus' ? 3 : 1.5
    ctx.beginPath(); ctx.roundRect(c.x - c.w / 2, c.y - 17, c.w, 34, 17); ctx.fill(); ctx.stroke()
    ctx.fillStyle = k === 'focus' ? C.warn : C.muted; ctx.fillRect(c.x - c.w / 2 + 14, c.y - 3, c.w - 28, 6)
    ctx.restore()
  }
  const vec = sm((t - 13.1) / 0.7)
  const drawRow = (R, F, rel, tint, a0) => {
    R.forEach((c, i) => {
      const lineY = 60 + 3 * 24 + 4, fromX = 280 + (i + 0.5) * (240 / R.length)
      const x = R === A ? lerp(fromX, c.x, split) : c.x, y = R === A ? lerp(lineY, c.y, split) : c.y
      const w = R === A ? lerp(240 / R.length, c.w, split) : c.w
      const r = rel[i] || 0
      const fill = r > 0.5 && tint.on > 0 ? `rgba(${tint.rgb},${0.18 * tint.on})` : '#FFFFFF'
      chip({ x, y, w }, i === F ? 'focus' : '', fill, a0)
      if (vec > 0) { ctx.save(); ctx.globalAlpha = a0 * vec; for (let k = 0; k < 4; k++) { const h = 6 + 16 * rnd(i * 7 + k + (R === A ? 0 : 50)); ctx.fillStyle = [C.navy, C.good, C.warn, C.bad][k]; ctx.fillRect(x - 14 + k * 8, y - 26 - h, 6, h) } ctx.restore() }
    })
  }
  // step 2: a scanning glow spreads from the focus word
  const scan = t > 3.6 && t < 6.8 ? (t - 3.6) / 3.2 : -1
  if (scan >= 0) {
    const fx = A[FOCUS].x, reach = 360 * sm(scan * 1.3), a = 1 - sm((scan - 0.75) / 0.25)
    const g = ctx.createRadialGradient(fx, 150, 0, fx, 150, Math.max(1, reach))
    g.addColorStop(0, 'rgba(233,162,59,0)'); g.addColorStop(0.85, `rgba(233,162,59,${0.22 * a})`); g.addColorStop(1, 'rgba(233,162,59,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 90, W, 120)
  }
  // step 3: weighted links above the row
  const links = (R, F, rel, col, t0, up) => {
    for (const [i, wgt] of Object.entries(rel)) {
      const u = sm((t - t0 - i * 0.12) / 0.7)
      if (u <= 0) continue
      const a = R[F], b = R[i], hgt = 40 + Math.abs(a.x - b.x) * 0.25
      ctx.strokeStyle = col; ctx.globalAlpha = 0.35 + 0.65 * wgt; ctx.lineWidth = 1.5 + 7 * wgt; ctx.lineCap = 'round'
      ctx.beginPath()
      for (let s = 0; s <= u; s += 0.02) { const x = lerp(a.x, b.x, s), y = a.y + up * (17 + Math.sin(s * Math.PI) * hgt); s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
      ctx.stroke(); ctx.globalAlpha = 1
    }
  }
  const tA = { on: sm((t - 7.6) / 0.6), rgb: '42,157,143' }, tB = { on: sm((t - 11.0) / 0.6), rgb: '38,70,83' }
  links(A, FOCUS, relA, C.good, 6.6, -1)
  drawRow(A, FOCUS, relA, tA, split > 0 ? 1 : 0)
  // step 4: a second clause; the same word links elsewhere and means something else
  const bA = sm((t - 9.9) / 0.6)
  if (bA > 0) { links(B, FB, relB, C.navy, 10.3, 1); drawRow(B, FB, relB, tB, bA) }
  const mean = sm((t - 11.6) / 0.5)
  if (mean > 0) {
    ctx.save(); ctx.globalAlpha = mean
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.good; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(A[FOCUS].x, 190, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); wrench(A[FOCUS].x, 192, C.good)
    ctx.strokeStyle = C.navy; ctx.beginPath(); ctx.arc(B[FB].x, 226, 18, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.stroke(); coin(B[FB].x, 226, C.navy)
    ctx.restore()
  }
  // step 5: a magnifier searches the enriched clauses and finds the maintenance one
  const mg = sm((t - 13.8) / 1.4)
  if (mg > 0) {
    const x = lerp(820, A[FOCUS].x + 30, mg), y = lerp(330, 120, mg)
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x + 18, y + 18); ctx.lineTo(x + 40, y + 40); ctx.stroke()
    ctx.lineWidth = 4; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    pMark(ctx, A[0].x - 50, 150, 'ok', sm((t - 15.1) / 0.4))
  }
}

// Lesson 7: a hiring audit in an office lobby. Two queues pass a screening gate; marbles fill two glass jars.
function renderPlainDisparateImpactAuditFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  const INK = '#2B2F3A', GA = '#2A9D8F', GB = '#7B6CB3', SKIN = ['#C68B59', '#8D5B3A', '#E0B48A']
  // ---------- lobby ----------
  ctx.fillStyle = '#EEE7DA'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#D8CDBB'; ctx.fillRect(0, 330, W, 120)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x - 60, 450); ctx.lineTo(x - 50, 450); ctx.lineTo(x + 10, 330); ctx.fill() }
  ctx.fillStyle = '#C9BBA4'; ctx.fillRect(0, 320, W, 10)
  // plant and window
  ctx.fillStyle = '#CFE3E8'; ctx.fillRect(40, 40, 120, 90); ctx.strokeStyle = '#9C8A70'; ctx.lineWidth = 5; ctx.strokeRect(40, 40, 120, 90); ctx.beginPath(); ctx.moveTo(100, 40); ctx.lineTo(100, 130); ctx.stroke()
  // lane floor strips
  ctx.fillStyle = 'rgba(42,157,143,0.10)'; ctx.fillRect(0, 196, 360, 26); ctx.fillStyle = 'rgba(123,108,179,0.10)'; ctx.fillRect(0, 300, 360, 26)
  // ---------- the screening gate ----------
  const GX = 360
  const open = sm((t - 10.0) / 0.4) * (1 - sm((t - 11.4) / 0.4))
  ctx.fillStyle = '#5B6772'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(GX - 22, 140, 44, 200, 8); ctx.fill(); ctx.stroke()
  // the gate's criteria cogs in a panel on top
  ctx.fillStyle = '#E9E2D6'; ctx.beginPath(); ctx.roundRect(GX - 70, 64, 140, 66, 10); ctx.fill(); ctx.stroke()
  const cog = (x, y, kind, a = 1, spin = 0) => {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.save(); ctx.rotate(spin); ctx.fillStyle = '#B8862E'; for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -19, 6, 7) } ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    ctx.fillStyle = INK
    if (kind === 'cap') { ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(0, -6); ctx.lineTo(9, -1); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.fillRect(-4, 1, 8, 5) }
    if (kind === 'case') { ctx.fillRect(-8, -3, 16, 10); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-3.5, -6, 7, 3) }
    if (kind === 'pin') { ctx.fillStyle = '#C0392B'; ctx.beginPath(); ctx.arc(0, -3, 5, Math.PI, 0); ctx.lineTo(0, 7); ctx.closePath(); ctx.fill() }
    ctx.restore()
  }
  const spin = t * 1.5
  cog(GX - 42, 97, 'cap', 1, spin); cog(GX + 42, 97, 'case', 1, -spin)
  // the pin cog is pulled out in step 4 and dropped in a bin
  const pull = sm((t - 10.5) / 0.9)
  const pinX = lerp(GX, 470, pull), pinY = lerp(97, 300, pull) - Math.sin(pull * Math.PI) * 60
  if (t < 9.9 || pull < 1) { cog(pinX, pinY, 'pin', 1, t < 10.5 ? spin : spin * 3) }
  if (t > 9.9) { const a = sm((t - 9.9) / 0.4); ctx.save(); ctx.globalAlpha = a * (pull < 1 ? 1 : 0); ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pinX, pinY, 22, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
  ctx.fillStyle = '#7C8B96'; ctx.beginPath(); ctx.moveTo(452, 296); ctx.lineTo(488, 296); ctx.lineTo(484, 330); ctx.lineTo(456, 330); ctx.closePath(); ctx.fill()
  if (open > 0) { ctx.fillStyle = INK; ctx.save(); ctx.translate(GX - 70, 64); ctx.rotate(-1.2 * open); ctx.fillStyle = '#D5CBB8'; ctx.fillRect(0, -6, 140, 6); ctx.restore() }
  // ---------- candidates walking up to the gate ----------
  const person = (x, y, col, skin, a = 1, bob = 0) => {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + bob)
    ctx.fillStyle = '#3D4A52'; ctx.fillRect(-7, -4, 5, 22); ctx.fillRect(2, -4, 5, 22)
    ctx.fillStyle = '#E6E1D8'; ctx.beginPath(); ctx.roundRect(-11, -32, 22, 30, 8); ctx.fill()
    ctx.fillStyle = col; ctx.fillRect(-11, -30, 22, 7); ctx.fillRect(4, -28, 5, 14)
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, -42, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, -45, 9, Math.PI, 0); ctx.fill()
    ctx.restore()
  }
  // jar levels (selection rates)
  const fill = sm(t / 3.4)
  const rateA = 0.6 * fill, rateB = lerp(0.3 * fill, 0.5, sm((t - 11.4) / 1.6))
  // each candidate: lane, start time, passes?
  const walkers = []
  for (let i = 0; i < 14; i++) {
    for (const [lane, col] of [[0, GA], [1, GB]]) {
      const t0 = -0.6 + i * 1.15 + lane * 0.5
      const after = t0 + 1.6 > 11.0
      const rate = lane === 0 ? 0.6 : after ? 0.5 : 0.3
      const pass = rnd(i * 3 + lane * 17) < rate
      walkers.push({ lane, col, t0, pass, skin: SKIN[(i + lane) % 3] })
    }
  }
  for (const w of walkers) {
    const u = t - w.t0; if (u < 0) continue
    const y = w.lane === 0 ? 216 : 320
    let x = lerp(-20, GX - 34, clamp(u / 1.6)), a = 1, yy = y
    if (u > 1.6) {
      const v = clamp((u - 1.6) / 1.0)
      if (w.pass) { x = lerp(GX - 34, GX + 60, v); a = 1 - sm((v - 0.6) / 0.4) }
      else { x = GX - 34 - 40 * v; yy = y + (w.lane === 0 ? -50 : 50) * v; a = 1 - v }
      if (u > 1.6 && u < 2.0) { ctx.fillStyle = w.pass ? GA : '#C0392B'; ctx.beginPath(); ctx.arc(GX, w.lane === 0 ? 170 : 290, 7, 0, Math.PI * 2); ctx.fill() }
    }
    if (a > 0.02) person(x, yy, w.col, w.skin, a, u < 1.6 ? Math.abs(Math.sin(u * 9)) * -3 : 0)
    if (w.pass && u > 2.0 && u < 2.8) { const v = sm((u - 2.0) / 0.8), jx = w.lane === 0 ? 580 : 700
      const mx2 = lerp(GX + 50, jx, v), my2 = lerp(w.lane === 0 ? 190 : 290, 110, v) - Math.sin(v * Math.PI) * 70
      ctx.fillStyle = w.col; ctx.beginPath(); ctx.arc(mx2, my2, 6, 0, Math.PI * 2); ctx.fill() }
  }
  // ---------- jars on a shelf: marbles show each group's selection rate ----------
  ctx.fillStyle = '#9C7A54'; ctx.fillRect(520, 300, 250, 12)
  const jar = (x, rate, col) => {
    const top = 100, bot = 296, h = bot - top
    const lvl = bot - h * rate
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 38, top, 76, h, [6, 6, 14, 14]); ctx.clip()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 38, top, 76, h)
    for (let r = 0; r * 12 < h * rate; r++) for (let c = 0; c < 6; c++) { const yy = bot - 6 - r * 12, xx = x - 30 + c * 12 + (r % 2) * 6; if (yy < lvl) continue
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xx, yy, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(xx - 2, yy - 2, 1.6, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
    ctx.strokeStyle = '#7F98A3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 38, top, 76, h, [6, 6, 14, 14]); ctx.stroke()
    ctx.fillStyle = '#9C7A54'; ctx.fillRect(x - 42, top - 10, 84, 10)
    return lvl
  }
  const lA = jar(580, rateA, GA), lB = jar(700, rateB, GB)
  // ---------- the auditor ----------
  const walkIn = sm((t - 3.6) / 1.2)
  const AX = lerp(820, 640, walkIn), AY = 410
  ctx.fillStyle = '#3D4A52'; ctx.fillRect(AX - 9, AY - 30, 7, 30); ctx.fillRect(AX + 2, AY - 30, 7, 30)
  ctx.fillStyle = '#264653'; ctx.beginPath(); ctx.roundRect(AX - 16, AY - 74, 32, 46, 10); ctx.fill()
  ctx.fillStyle = SKIN[1]; ctx.beginPath(); ctx.arc(AX, AY - 88, 13, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#D9D2C3'; ctx.beginPath(); ctx.arc(AX, AY - 92, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.fill()
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillRect(AX - 30, AY - 62, 22, 28); ctx.strokeRect(AX - 30, AY - 62, 22, 28)
  ctx.fillStyle = '#B8862E'; ctx.fillRect(AX - 24, AY - 66, 10, 5)
  // step 2: the auditor sees the gap
  const gap = sm((t - 4.8) / 0.4) * (1 - sm((t - 6.8) / 0.4))
  if (gap > 0) { ctx.save(); ctx.globalAlpha = gap; ctx.strokeStyle = '#E9A23B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(624, lA); ctx.lineTo(656, lA); ctx.moveTo(640, lA); ctx.lineTo(640, lB); ctx.moveTo(624, lB); ctx.lineTo(656, lB); ctx.stroke(); ctx.restore(); pMark(ctx, AX + 4, AY - 122, 'q', gap) }
  // step 3: a brass ring at four-fifths of the teal level
  const ring = sm((t - 6.8) / 0.8)
  if (ring > 0) {
    const target = 296 - 196 * 0.6 * 0.8
    const y = lerp(60, target, ring)
    ctx.strokeStyle = '#B8862E'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(700, y, 44, 7, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = 'rgba(184,134,46,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(620, y); ctx.lineTo(656, y); ctx.stroke(); ctx.setLineDash([])
    if (ring >= 1) pMark(ctx, 754, target, lB <= target ? 'ok' : 'no', 1)
  }
  // step 5: the auditor stamps the log
  const stamp = t > 14.0 ? sm((t - 14.0) / 0.25) : 0
  if (stamp > 0) { const bounce = t < 14.4 ? Math.sin((t - 14.0) / 0.4 * Math.PI) * 10 : 0
    ctx.fillStyle = '#7A3E2B'; ctx.fillRect(AX - 26, AY - 80 - bounce, 14, 12); ctx.fillStyle = 'rgba(42,157,143,0.9)'; ctx.beginPath(); ctx.arc(AX - 19, AY - 48, 7 * stamp, 0, Math.PI * 2); ctx.fill() }
}

// Detailed lesson 1: the imitation game as a cutaway of three rooms. Notes travel as paper planes.
function renderTuringTestFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  const INK = '#2B2F3A', SKIN = '#C68B59', SKIN2 = '#8D5B3A'
  // ---------- rooms ----------
  ctx.fillStyle = '#EDE3D3'; ctx.fillRect(0, 0, 300, H) // study
  ctx.fillStyle = '#F4DCC6'; ctx.fillRect(320, 0, 480, 220) // human room (warm)
  ctx.fillStyle = '#D9E3EA'; ctx.fillRect(320, 232, 480, 218) // machine room (cool)
  // wallpaper stripes
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < 300; x += 28) ctx.fillRect(x, 0, 10, 330)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 330; x < 800; x += 36) ctx.fillRect(x, 0, 14, 180)
  // floors
  ctx.fillStyle = '#B89B7A'; ctx.fillRect(0, 330, 300, 120); ctx.fillStyle = '#A8896A'; for (let x = 0; x < 300; x += 50) ctx.fillRect(x, 330, 2, 120)
  ctx.fillStyle = '#C9A27E'; ctx.fillRect(320, 180, 480, 40); ctx.fillStyle = '#A9B7C2'; ctx.fillRect(320, 400, 480, 50)
  // partition wall with two letter slots; the slab between the right rooms
  ctx.fillStyle = '#7A6656'; ctx.fillRect(300, 0, 20, H); ctx.fillStyle = '#5E4E42'; ctx.fillRect(320, 220, 480, 12)
  const slot = (y) => { ctx.fillStyle = '#3A2F28'; ctx.fillRect(300, y - 4, 20, 8); ctx.fillStyle = '#C9A227'; ctx.fillRect(298, y - 7, 24, 3) }
  slot(120); slot(330)
  // wall clocks: human time ticks steadily; the robot's clock appears when it starts faking pauses
  const clock = (x, y, a) => { ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * 13, y - Math.cos(a) * 13); ctx.moveTo(x, y); ctx.lineTo(x + 7, y); ctx.stroke() }
  clock(420, 52, t * 0.9)
  clock(420, 282, 9.9 < t ? (t - 9.9) * 0.9 : 0)
  // ---------- the study: lamp, desk, evaluator ----------
  const glow = ctx.createRadialGradient(200, 250, 10, 200, 250, 170); glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 80, 300, 300)
  ctx.fillStyle = '#6B4B34'; ctx.fillRect(110, 290, 180, 14); ctx.fillRect(120, 304, 10, 60); ctx.fillRect(270, 304, 10, 60)
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(250, 290); ctx.lineTo(240, 230); ctx.lineTo(205, 205); ctx.stroke()
  ctx.fillStyle = '#2A9D8F'; ctx.beginPath(); ctx.moveTo(190, 196); ctx.lineTo(222, 206); ctx.lineTo(205, 226); ctx.closePath(); ctx.fill()
  // trays on the desk, marked circle (top room) and square (bottom room)
  const tray = (x, mark) => { ctx.fillStyle = '#8C6A4F'; ctx.fillRect(x - 22, 280, 44, 10); ctx.fillStyle = INK; mark === 'c' ? (ctx.beginPath(), ctx.arc(x, 285, 3.5, 0, Math.PI * 2), ctx.fill()) : ctx.fillRect(x - 3.5, 281.5, 7, 7) }
  tray(170, 'c'); tray(225, 's')
  // evaluator: seated, facing right; in step 5 raises both hands
  const shrug = sm((t - 13.2) / 0.5)
  ctx.fillStyle = '#4A3B30'; ctx.fillRect(40, 300, 60, 10); ctx.fillRect(46, 310, 8, 54); ctx.fillRect(86, 310, 8, 54); ctx.fillRect(40, 220, 10, 90)
  ctx.fillStyle = '#264653'; ctx.beginPath(); ctx.roundRect(52, 232, 54, 72, 16); ctx.fill()
  ctx.fillStyle = SKIN2; ctx.beginPath(); ctx.arc(84, 208, 20, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(80, 200, 20, Math.PI * 1.05, Math.PI * 1.95); ctx.fill()
  ctx.fillStyle = INK; ctx.fillRect(94, 206, 10, 3) // glasses hint
  ctx.strokeStyle = '#264653'; ctx.lineWidth = 11; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(98, 250); ctx.lineTo(lerp(140, 118, shrug), lerp(282, 200, shrug)); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(72, 250); ctx.lineTo(lerp(118, 60, shrug), lerp(285, 196, shrug)); ctx.stroke()
  // ---------- human room: desk, typewriter, tea, person ----------
  ctx.fillStyle = '#8A5A3C'; ctx.fillRect(480, 140, 170, 10); ctx.fillRect(490, 150, 8, 32); ctx.fillRect(632, 150, 8, 32)
  ctx.fillStyle = '#3D4A52'; ctx.beginPath(); ctx.roundRect(510, 118, 64, 22, 4); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(522, 98, 40, 22)
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(598, 126, 16, 14, 3); ctx.fill(); ctx.stroke()
  const sip = t > 4.4 && t < 5.4 ? sm((t - 4.4) / 0.25) * (1 - sm((t - 5.15) / 0.25)) : 0
  // steam
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { ctx.beginPath(); for (let k = 0; k < 14; k++) ctx.lineTo(603 + i * 6 + Math.sin(t * 3 + k * 0.6 + i) * 2, 122 - k) ; ctx.stroke() }
  const think = t > 3.6 && t < 4.4 || (t > 5.4 && t < 6.0)
  // person: chair, body, head (tilts while thinking)
  ctx.fillStyle = '#6E4B36'; ctx.fillRect(670, 150, 50, 8); ctx.fillRect(712, 90, 8, 68)
  ctx.fillStyle = '#C0504D'; ctx.beginPath(); ctx.roundRect(650, 96, 50, 60, 16); ctx.fill()
  ctx.save(); ctx.translate(660, 76); ctx.rotate(think ? -0.18 : 0)
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#3B2A20'; ctx.beginPath(); ctx.arc(4, -4, 19, Math.PI * 1.1, Math.PI * 2.05); ctx.fill(); ctx.beginPath(); ctx.arc(14, 2, 9, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#C0504D'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(656, 112)
  if (think) ctx.lineTo(648, 92); else if (sip > 0) ctx.lineTo(lerp(612, 640, sip), lerp(132, 92, sip)); else ctx.lineTo(574 + Math.sin(t * 25) * (t > 1.8 && t < 3.6 || t > 6.0 && t < 6.4 ? 3 : 0), 116)
  ctx.stroke()
  if (sip > 0) { ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(lerp(598, 628, sip), lerp(126, 84, sip), 16, 14, 3); ctx.fill(); ctx.stroke() }
  if (think) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, dy, r] of [[-22, -30, 4], [-32, -44, 6], [-46, -62, 12]]) { ctx.beginPath(); ctx.arc(660 + dx, 76 + dy, r, 0, Math.PI * 2); ctx.fill() } }
  // bin and crumpled paper
  ctx.fillStyle = '#7C8B96'; ctx.beginPath(); ctx.moveTo(740, 150); ctx.lineTo(772, 150); ctx.lineTo(768, 182); ctx.lineTo(744, 182); ctx.closePath(); ctx.fill()
  const ball = (t0, from, to) => { const u = (t - t0) / 0.6; if (u < 0) return; const v = clamp(u); const x = lerp(from[0], to[0], v), y = lerp(from[1], to[1], v) - Math.sin(v * Math.PI) * 50
    if (u > 1) return; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, r = 8 + (k % 2) * 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) } ctx.closePath(); ctx.fill(); ctx.stroke() }
  ball(5.5, [542, 96], [756, 150])
  // ---------- machine room: robot, keyboard; in step 4 a cardigan and glasses ----------
  ctx.fillStyle = '#5D6D7A'; ctx.fillRect(480, 360, 170, 10); ctx.fillRect(490, 370, 8, 32); ctx.fillRect(632, 370, 8, 32)
  ctx.fillStyle = '#2F3B45'; ctx.beginPath(); ctx.roundRect(512, 348, 70, 12, 3); ctx.fill()
  const dress = sm((t - 9.9) / 0.8)
  ctx.fillStyle = '#9AA8B4'; ctx.beginPath(); ctx.roundRect(650, 318, 54, 64, 14); ctx.fill()
  if (dress > 0) { ctx.save(); ctx.globalAlpha = dress; ctx.fillStyle = '#B5835A'; ctx.beginPath(); ctx.roundRect(648, 318 - 20 * (1 - dress), 58, 60, 14); ctx.fill(); ctx.fillStyle = '#F4EBDD'; ctx.fillRect(672, 320, 10, 56); ctx.restore() }
  const bow = sm((t - 14.6) / 0.4) * (1 - sm((t - 15.5) / 0.3))
  ctx.save(); ctx.translate(676, 296); ctx.rotate(-0.35 * bow)
  ctx.fillStyle = '#7F8F9C'; ctx.beginPath(); ctx.roundRect(-24, -22, 48, 40, 10); ctx.fill()
  ctx.fillStyle = '#1F2A33'; ctx.beginPath(); ctx.roundRect(-18, -15, 36, 22, 6); ctx.fill()
  const lookClock = t > 10.8 && t < 12.0
  ctx.fillStyle = '#7FE3D5'; const ex = lookClock ? -6 : -3; ctx.fillRect(-11 + ex, -8, 6, 6); ctx.fillRect(5 + ex, -8, 6, 6)
  ctx.fillStyle = '#7F8F9C'; ctx.fillRect(-2, -32, 4, 10); ctx.beginPath(); ctx.arc(0, -34, 4, 0, Math.PI * 2); ctx.fill()
  if (dress > 0) { ctx.globalAlpha = dress; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-6, -5, 8, 0, Math.PI * 2); ctx.moveTo(18, -5); ctx.arc(10, -5, 8, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
  // robot arm: blur-fast typing in step 3, slow in step 4
  const fast = t > 6.6 && t < 7.0, slow = t > 12.0 && t < 12.6
  ctx.strokeStyle = dress > 0.5 ? '#B5835A' : '#9AA8B4'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(656, 336)
  ctx.lineTo(580 + (fast ? Math.sin(t * 90) * 6 : slow ? Math.sin(t * 20) * 3 : 0), 346); ctx.stroke()
  ctx.fillStyle = '#7C8B96'; ctx.beginPath(); ctx.moveTo(740, 370); ctx.lineTo(772, 370); ctx.lineTo(768, 402); ctx.lineTo(744, 402); ctx.closePath(); ctx.fill()
  ball(12.6, [600, 330], [756, 370])
  // ---------- paper planes ----------
  const plane = (x, y, dir, s = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s); ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-12, -9); ctx.lineTo(-6, 0); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, 0); ctx.stroke(); ctx.restore() }
  const fly = (t0, dur, pts, dir) => { const u = (t - t0) / dur; if (u < 0 || u > 1) return; const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)), v = sm(u * n - k)
    plane(lerp(pts[k][0], pts[k + 1][0], v), lerp(pts[k][1], pts[k + 1][1], v) - Math.sin(v * Math.PI) * 14, dir) }
  // 1: the question goes to both rooms
  fly(0.6, 1.4, [[230, 270], [310, 120], [520, 104]], 1)
  fly(0.8, 1.4, [[230, 270], [310, 330], [530, 336]], 1)
  // 2: the human's reply, after thinking and a crumpled draft
  fly(6.0, 1.0, [[540, 104], [310, 120], [170, 274]], -1)
  // 3: the robot's reply, immediately
  fly(6.9, 0.45, [[560, 336], [310, 330], [225, 274]], -1)
  // 4: the next reply, now with a fake pause and a fake crumple
  fly(12.8, 1.0, [[560, 336], [310, 330], [225, 274]], -1)
  // planes that landed wait in the trays
  if (t > 7.0 && shrug <= 0) plane(170, 272, -1, 0.8)
  if ((t > 7.35 && t < 12.8 || t > 13.8) && shrug <= 0) plane(225, 272, -1, 0.8)
  // 5: the evaluator holds up two identical planes; a spotlight finds the robot, which bows
  if (shrug > 0) {
    plane(lerp(170, 118, shrug), lerp(272, 186, shrug), -1, 0.9); plane(lerp(225, 60, shrug), lerp(272, 182, shrug), -1, 0.9)
    ctx.save(); ctx.globalAlpha = shrug; ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = INK; ctx.lineWidth = 2
    ctx.beginPath(); ctx.ellipse(150, 120, 34, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    for (const [dx, dy, r] of [[-30, 32, 5], [-40, 46, 3]]) { ctx.beginPath(); ctx.arc(150 + dx, 120 + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
    ctx.fillStyle = INK; ctx.font = '700 30px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 150, 122); ctx.restore()
    const spot = sm((t - 14.2) / 0.5)
    if (spot > 0) { ctx.save(); ctx.fillStyle = `rgba(255,236,170,${0.35 * spot})`; ctx.beginPath(); ctx.moveTo(660, 232); ctx.lineTo(700, 232); ctx.lineTo(740, 400); ctx.lineTo(610, 400); ctx.closePath(); ctx.fill(); ctx.restore()
      pMark(ctx, 740, 262, 'ok', sm((t - 15.0) / 0.4) * 1.3) }
  }
}

// Detailed lesson 2: forward chaining inside the Mars rover. Facts on a corkboard feed rule machines.
function renderForwardChainingFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  const INK = '#2B2F3A', RED = '#C0392B'
  // ---------- icons ----------
  const icon = (k, x, y, s = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (k === 'dust') { ctx.strokeStyle = '#A0522D'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-4 + i * 4, -4 + i * 5, 6 + i * 2, Math.PI * 0.1, Math.PI * 1.3); ctx.stroke() } }
    if (k === 'plow' || k === 'dirty' || k === 'shake') {
      if (k === 'shake') ctx.rotate(-0.3)
      ctx.fillStyle = '#2E5E8C'; ctx.fillRect(-14, -9, 28, 18); ctx.strokeStyle = '#9EC3E6'; ctx.lineWidth = 1.2
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 9.3, -9); ctx.lineTo(-14 + i * 9.3, 9); ctx.stroke() } ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.stroke()
      if (k === 'plow') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(18, -6); ctx.lineTo(18, 8); ctx.moveTo(14, 4); ctx.lineTo(18, 8); ctx.lineTo(22, 4); ctx.stroke() }
      if (k === 'dirty') { ctx.fillStyle = '#A0522D'; for (const [a, b, r] of [[-8, -3, 3.5], [3, 4, 3], [9, -5, 2.5], [-2, 5, 2]]) { ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill() } }
      if (k === 'shake') { ctx.strokeStyle = INK; ctx.lineWidth = 2; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 19, -6); ctx.lineTo(d * 22, 0); ctx.lineTo(d * 19, 6); ctx.stroke() } }
    }
    if (k === 'batt') { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(-13, -8, 24, 16); ctx.fillStyle = INK; ctx.fillRect(11, -3, 4, 6); ctx.fillStyle = RED; ctx.fillRect(-10, -5, 6, 10) }
    if (k === 'wheel') { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.stroke() }
    if (k === 'rock') { ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-8, -6); ctx.lineTo(4, -9); ctx.lineTo(12, 8); ctx.closePath(); ctx.fill() }
    if (k === 'cold') { ctx.strokeStyle = '#3A7CA5'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * -11, Math.sin(a) * -11); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.stroke() } }
    if (k === 'night') { ctx.fillStyle = '#4A4E8C'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#EDE3D3'; ctx.beginPath(); ctx.arc(5, -4, 9, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  const card = (k, x, y, a = 1, tilt = 0, pin = true) => {
    if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(tilt)
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-25, -18, 52, 40)
    ctx.fillStyle = '#FFFDF5'; ctx.fillRect(-27, -21, 52, 40); icon(k, -1, 0, 1)
    if (pin) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(-1, -18, 4, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  // ---------- Mars window ----------
  const sky = ctx.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#E8A27C'); sky.addColorStop(1, '#F3CBA5')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 340, H)
  ctx.fillStyle = '#FFF3D6'; ctx.beginPath(); ctx.arc(270, 70, 16, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#C8724A'; ctx.beginPath(); ctx.moveTo(0, 250); ctx.lineTo(70, 210); ctx.lineTo(140, 240); ctx.lineTo(220, 200); ctx.lineTo(340, 245); ctx.lineTo(340, H); ctx.lineTo(0, H); ctx.fill()
  ctx.fillStyle = '#B5603C'; ctx.fillRect(0, 300, 340, H)
  // dust storm drifting in, cleared at the end
  const storm = sm(t / 1.5) * (1 - 0.7 * sm((t - 13.6) / 1.2))
  ctx.fillStyle = `rgba(160,82,45,${0.22 * storm})`; ctx.fillRect(0, 0, 340, H)
  ctx.strokeStyle = `rgba(120,60,30,${0.5 * storm})`; ctx.lineWidth = 2
  ctx.lineCap = 'round'; for (let i = 0; i < 18; i++) { const x = ((i * 71 + t * (90 + (i % 4) * 25)) % 440) - 60, y = 30 + (i * 41) % 260; ctx.lineWidth = 1.5 + (i % 3); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + (i % 5) * 8, y + 3); ctx.stroke() }
  // rover
  const shake = t > 13.4 && t < 15 ? Math.sin(t * 50) * 3 : 0
  ctx.save(); ctx.translate(150, 300)
  ctx.fillStyle = '#ECEFF1'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-55, -40, 110, 34, 6); ctx.fill(); ctx.stroke()
  for (const x of [-42, 0, 42]) { ctx.fillStyle = '#37474F'; ctx.beginPath(); ctx.arc(x, 4, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#90A4AE'; ctx.beginPath(); ctx.arc(x, 4, 5, 0, Math.PI * 2); ctx.fill() }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, -40); ctx.lineTo(30, -70); ctx.stroke()
  ctx.fillStyle = '#ECEFF1'; ctx.beginPath(); ctx.roundRect(18, -86, 26, 16, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(37, -78, 4, 0, Math.PI * 2); ctx.fill()
  // solar panel on a hinge, tilting and shaking in step 5
  const tilt = -0.15 - 0.45 * sm((t - 13.2) / 0.5)
  ctx.save(); ctx.translate(-20, -42 + shake); ctx.rotate(tilt + shake * 0.02)
  ctx.fillStyle = '#2E5E8C'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(-60, -10, 80, 10); ctx.strokeRect(-60, -10, 80, 10)
  const dirt = 1 - sm((t - 13.6) / 1.2)
  ctx.fillStyle = `rgba(160,82,45,${0.85 * dirt * sm(t / 2)})`; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-54 + i * 11, -5 + (i % 2) * 2, 3.5, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  if (t > 13.6 && t < 15.6) { ctx.fillStyle = 'rgba(160,82,45,0.7)'; for (let i = 0; i < 8; i++) { const u = ((t - 13.6) * 1.5 + i * 0.13) % 1; ctx.beginPath(); ctx.arc(-70 + i * 9, -40 + u * 50, 2.5, 0, Math.PI * 2); ctx.fill() } }
  ctx.restore()
  // battery gauge on the rover side
  const charge = 0.2 + 0.7 * sm((t - 14.4) / 1.2)
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(120, 330, 40, 18); ctx.fillStyle = charge > 0.5 ? '#2A9D8F' : RED; ctx.fillRect(123, 333, 34 * charge, 12)
  // window frame
  ctx.strokeStyle = '#5E4E42'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 326, H - 14)
  // ---------- the rover's mind: workshop wall ----------
  ctx.fillStyle = '#E9E2D6'; ctx.fillRect(340, 0, 460, H)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; for (let y = 20; y < H; y += 40) ctx.fillRect(340, y, 460, 2)
  // corkboard
  ctx.fillStyle = '#7A5A3C'; ctx.fillRect(372, 22, 236, 196); ctx.fillStyle = '#C9A06B'; ctx.fillRect(380, 30, 220, 180)
  ctx.fillStyle = 'rgba(120,80,40,0.25)'; for (let i = 0; i < 60; i++) { ctx.fillRect(382 + rnd(i) * 214, 32 + rnd(i + 9) * 174, 2, 2) }
  const slot = { dust: [420, 78], plow: [490, 78], batt: [560, 78], dirty: [440, 160], shake: [540, 160] }
  // machines
  const M = [{ x: 400, in: ['dust', 'plow'], fire: 7.0 }, { x: 500, in: ['wheel', 'rock'] }, { x: 600, in: ['cold', 'night'] }, { x: 700, in: ['dirty', 'batt'], fire: 10.4 }]
  const MY = 330
  const known = (k) => ({ dust: 0.9, plow: 1.6, batt: 2.3, dirty: 8.6, shake: 12.0 }[k])
  const scanX = t > 3.6 && t < 6.6 ? lerp(380, 760, (t - 3.6) / 3.0) : -999
  for (const [i, m] of M.entries()) {
    const firing = m.fire && t > m.fire && t < m.fire + 1.6
    ctx.fillStyle = '#7D8B96'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(m.x - 42, MY - 40, 84, 80, 8); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#5B6772'; ctx.fillRect(m.x - 10, MY + 40, 20, 26)
    // rule number as dots
    for (let d = 0; d <= i; d++) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(m.x - 30 + d * 8, MY + 30, 2.5, 0, Math.PI * 2); ctx.fill() }
    // gear
    ctx.save(); ctx.translate(m.x, MY + 6); ctx.rotate(firing ? (t - m.fire) * 8 : 0); ctx.fillStyle = '#B0BEC5'
    for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -15, 6, 7) } ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7D8B96'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    // sockets: lit when the scan has passed and the fact is on the board
    m.in.forEach((k, j) => {
      const sx = m.x - 20 + j * 40, sy = MY - 58
      const have = known(k) !== undefined && t > known(k) + 0.8
      const matched = have && (t > 4 + i * 0.75 || (m.fire && t > m.fire - 0.6))
      ctx.fillStyle = matched ? '#FFF3C4' : '#F4F1EA'; ctx.strokeStyle = matched ? '#E9A23B' : INK; ctx.lineWidth = matched ? 3 : 2
      ctx.beginPath(); ctx.roundRect(sx - 18, sy - 14, 36, 28, 5); ctx.fill(); ctx.stroke()
      ctx.globalAlpha = matched ? 1 : 0.45; icon(k, sx, sy, 0.7); ctx.globalAlpha = 1
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(sx, MY - 40); ctx.stroke()
    })
    if (m.fire && t > m.fire && t < m.fire + 0.6) { ctx.fillStyle = `rgba(233,162,59,${0.5 * (1 - (t - m.fire) / 0.6)})`; ctx.beginPath(); ctx.arc(m.x, MY, 60, 0, Math.PI * 2); ctx.fill() }
  }
  // scanning lamp
  if (scanX > 0) { ctx.fillStyle = 'rgba(255,240,180,0.45)'; ctx.beginPath(); ctx.moveTo(scanX - 6, 232); ctx.lineTo(scanX + 6, 232); ctx.lineTo(scanX + 40, 300); ctx.lineTo(scanX - 40, 300); ctx.closePath(); ctx.fill()
    ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(scanX - 12, 226, 24, 10, 3); ctx.fill() }
  // facts arriving from the sensors (from the window) and from the machines
  const arrive = (k, t0, from) => {
    const [x, y] = slot[k], u = sm((t - t0) / 0.8)
    if (u <= 0) return
    card(k, lerp(from[0], x, u), lerp(from[1], y, u) - Math.sin(u * Math.PI) * 30, 1, (1 - u) * 0.6 + (k.length % 2 ? 0.05 : -0.05), u >= 1)
  }
  arrive('dust', known('dust'), [200, 200]); arrive('plow', known('plow'), [120, 250]); arrive('batt', known('batt'), [140, 340])
  arrive('dirty', known('dirty') - 0.6, [400, MY + 60]); arrive('shake', known('shake') - 0.6, [700, MY + 60])
  // the explanation trail: red thread from the facts through the rules to the goal
  const trail = sm((t - 13.0) / 2.0)
  if (trail > 0) {
    const path = [slot.dust, [400, MY - 58], slot.plow, [400, MY - 58], slot.dirty, [700, MY - 58], slot.batt, [700, MY - 58], slot.shake]
    const segs = path.length - 1, upto = trail * segs
    ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1] - 18)
    for (let i = 0; i < segs && i < upto; i++) { const v = Math.min(1, upto - i); const a = path[i], b = path[i + 1]; ctx.lineTo(lerp(a[0], b[0], v), lerp(a[1] - 18, b[1] - 18, v)) }
    ctx.stroke()
  }
  if (t > 12.4) pMark(ctx, 572, 136, 'ok', sm((t - 12.4) / 0.4))
}

// Detailed lesson 3: a perceptron at a market stall. A bamboo divider on a checked cloth, a brass scale for weights.
function renderPerceptronLearningFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  const INK = '#2B2F3A'
  // ---------- stall ----------
  ctx.fillStyle = '#E9DCC6'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#8B5E3C'; ctx.fillRect(196, 60, 10, H); ctx.fillRect(0, 300, 200, 12)
  // cloth with checks
  ctx.fillStyle = '#FBF6EC'; ctx.fillRect(210, 84, 580, 350)
  ctx.fillStyle = 'rgba(70,130,180,0.12)'; for (let x = 210; x < 790; x += 40) ctx.fillRect(x, 84, 20, 350); for (let y = 84; y < 434; y += 40) ctx.fillRect(210, y, 580, 20)
  ctx.strokeStyle = '#D7C8AE'; ctx.lineWidth = 2; ctx.strokeRect(210, 84, 580, 350)
  // awning
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#F7EBD8' : '#C8553D'; ctx.fillRect(i * 68, 0, 68, 52); ctx.beginPath(); ctx.arc(i * 68 + 34, 52, 34, 0, Math.PI); ctx.fill() }
  // ---------- line states (pivot, angle), apple side = cross < 0 ----------
  const S = [[490, 280, 0], [490, 250, 0.5], [490, 208, -0.42]]
  const k1 = sm((t - 8.0) / 1.0), k2 = sm((t - 11.7) / 1.0)
  const st = k2 > 0 ? S[1].map((v, i) => lerp(v, S[2][i], k2)) : S[0].map((v, i) => lerp(v, S[1][i], k1))
  const cr = (x, y) => Math.cos(st[2]) * (y - st[1]) - Math.sin(st[2]) * (x - st[0])
  // ---------- fruit ----------
  const apples = [[584, 129], [367, 147], [481, 133], [442, 177], [423, 127], [521, 162], [305, 115], [380, 240]]
  const lemons = [[483, 393], [253, 355], [395, 382], [504, 338], [599, 388], [308, 325], [381, 308], [420, 255]]
  const apple = (x, y, r) => { ctx.fillStyle = '#D64535'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r * 0.7); ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.35, y + r * 0.2, x, y + r); ctx.bezierCurveTo(x - r * 1.35, y + r * 0.2, x - r * 0.9, y - r * 1.25, x, y - r * 0.7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#5E9E3A'; ctx.beginPath(); ctx.ellipse(x + r * 0.35, y - r * 1.0, r * 0.32, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill() }
  const lemon = (x, y, r) => { ctx.fillStyle = '#F2CF3C'; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - r * 1.25, y); ctx.quadraticCurveTo(x - r, y - r * 0.95, x, y - r * 0.85); ctx.quadraticCurveTo(x + r, y - r * 0.95, x + r * 1.25, y); ctx.quadraticCurveTo(x + r, y + r * 0.95, x, y + r * 0.85); ctx.quadraticCurveTo(x - r, y + r * 0.95, x - r * 1.25, y); ctx.fill(); ctx.stroke() }
  const drop = (i) => sm((t - 0.1 - i * 0.07) / 0.35)
  const all = [...apples.map((p, i) => ({ p, a: true, i })), ...lemons.map((p, i) => ({ p, a: false, i: i + 8 }))]
  const wrongL = t > 3.6 && t < 9.0, wrongA = t > 9.9 && t < 12.7
  for (const o of all) {
    const d = drop(o.i); if (d <= 0) continue
    let [x, y] = o.p; y -= (1 - d) * 40
    const star = (o.a && o.i === 7 && wrongA) || (!o.a && o.i === 15 && wrongL)
    if (star) { x += Math.sin(t * 22) * 2.5; ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
    ctx.globalAlpha = d; (o.a ? apple : lemon)(x, y, 14); ctx.globalAlpha = 1
    if (star) pMark(ctx, x + 22, y - 22, 'no', 0.9)
  }
  // ---------- bamboo divider, laid by a hand at the start ----------
  const place = sm((t - 0.6) / 1.0)
  ctx.save(); ctx.beginPath(); ctx.rect(210, 84, 580, 350); ctx.clip()
  ctx.translate(st[0], st[1] - (1 - place) * 200); ctx.rotate(st[2])
  ctx.fillStyle = '#C9A55C'; ctx.strokeStyle = '#7A5C24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-340, -5, 680, 10, 5); ctx.fill(); ctx.stroke()
  for (let x = -320; x < 340; x += 70) { ctx.strokeStyle = '#8D6E2F'; ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x, 5); ctx.stroke() }
  ctx.restore()
  ctx.fillStyle = '#7A5C24'; ctx.beginPath(); ctx.arc(st[0], st[1] - (1 - place) * 200, 7, 0, Math.PI * 2); ctx.fill()
  if (place < 1 || t < 2.0) { const a = 1 - sm((t - 1.6) / 0.4); ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#B07A52'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(560, -20); ctx.lineTo(560, st[1] - (1 - place) * 200 - 12); ctx.stroke(); ctx.restore() }
  // ---------- brass scale on the shelf: two pans hold the two weights ----------
  const wA = 3 - (t > 7.4 ? 1 : 0), wB = 2 + (t > 11.1 ? 1 : 0)
  const beam = clamp((wB - wA) * 0.12 + (t > 7.4 && t < 7.9 ? 0.04 * Math.sin((t - 7.4) * 30) : 0), -0.3, 0.3)
  ctx.save(); ctx.translate(100, 160)
  ctx.fillStyle = '#B8862E'; ctx.fillRect(-4, 0, 8, 140); ctx.fillRect(-30, 136, 60, 8)
  ctx.rotate(beam); ctx.fillRect(-80, -4, 160, 8)
  for (const [side, n, ic] of [[-1, wA, 'red'], [1, wB, 'round']]) {
    const px = side * 74
    ctx.save(); ctx.translate(px, 0); ctx.rotate(-beam)
    ctx.strokeStyle = '#8D6420'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 60); ctx.moveTo(0, 0); ctx.lineTo(22, 60); ctx.stroke()
    ctx.fillStyle = '#C99A3C'; ctx.beginPath(); ctx.ellipse(0, 62, 28, 7, 0, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < n; i++) { ctx.fillStyle = '#6D6F78'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-11, 44 - i * 14, 22, 13, 3); ctx.fill(); ctx.stroke() }
    // feature tag under the pan: redness or roundness
    if (ic === 'red') { ctx.fillStyle = '#D64535'; ctx.beginPath(); ctx.moveTo(0, 74); ctx.quadraticCurveTo(10, 88, 0, 92); ctx.quadraticCurveTo(-10, 88, 0, 74); ctx.fill() }
    else { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 84, 8, 0, Math.PI * 2); ctx.stroke() }
    ctx.restore()
  }
  ctx.restore()
  // weight leaving (step 3) and arriving (step 4)
  const flyW = (t0, from, to) => { const u = sm((t - t0) / 0.7); if (u <= 0 || u >= 1) return; const x = lerp(from[0], to[0], u), y = lerp(from[1], to[1], u) - Math.sin(u * Math.PI) * 40; ctx.fillStyle = '#6D6F78'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x - 11, y - 6, 22, 13, 3); ctx.fill(); ctx.stroke() }
  flyW(7.4, [26, 175], [20, 330]); flyW(10.4, [20, 330], [174, 190])
  // error tokens fly from the wrong fruit to the scale
  const token = (t0, from, txt, col) => { const u = sm((t - t0) / 0.8); if (u <= 0 || u >= 1) return; const x = lerp(from[0], 100, u), y = lerp(from[1], 150, u) - Math.sin(u * Math.PI) * 60
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y + 1) }
  token(6.6, [420, 255], '−1', '#C0392B'); token(9.9, [380, 240], '+1', '#2A9D8F')
  // ---------- step 5: every fruit is on its own side ----------
  if (t > 13.1) all.forEach((o, i) => { const ok = (cr(o.p[0], o.p[1]) < 0) === o.a; pMark(ctx, o.p[0] + 16, o.p[1] - 16, ok ? 'ok' : 'no', 0.7 * sm((t - 13.1 - i * 0.08) / 0.3)) })
}

// Detailed lesson 4: convolution in a mosaic workshop. A 3x3 brass lens frame scans tiles; beads fill a 6x6 tray; a 2x2 sieve pools.
function renderConvolutionScanFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  const INK = '#2B2F3A', DARK = '#2F4858', LIGHT = '#F2E8CF', BEAD = [233, 162, 59]
  // ---------- workshop wall ----------
  ctx.fillStyle = '#E6D9C3'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 2, H)
  ctx.fillStyle = '#9C7A54'; ctx.fillRect(0, 300, W, 10); ctx.fillStyle = '#B89470'; ctx.fillRect(0, 310, W, H)
  // ---------- the 8x8 mosaic on an easel ----------
  const img = (r, c) => { const win = r >= 2 && r <= 3 && c >= 1 && c <= 2; return c < 4 && !win ? 0.15 : 0.92 }
  const T = 26, MX = 40, MY = 50
  ctx.fillStyle = '#7A5A3C'; ctx.beginPath(); ctx.moveTo(80, 270); ctx.lineTo(60, 300); ctx.lineTo(70, 300); ctx.lineTo(95, 270); ctx.fill(); ctx.beginPath(); ctx.moveTo(210, 270); ctx.lineTo(232, 300); ctx.lineTo(222, 300); ctx.lineTo(195, 270); ctx.fill()
  ctx.fillStyle = '#7A5A3C'; ctx.fillRect(MX - 10, MY - 10, 8 * T + 20, 8 * T + 20); ctx.fillStyle = '#CFC4B0'; ctx.fillRect(MX, MY, 8 * T, 8 * T)
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const v = img(r, c), j = (rnd(r * 8 + c) - 0.5) * 0.08
    ctx.fillStyle = v < 0.5 ? `hsl(200,30%,${26 + j * 100}%)` : `hsl(43,55%,${88 + j * 60}%)`
    ctx.beginPath(); ctx.roundRect(MX + c * T + 1.5, MY + r * T + 1.5, T - 3, T - 3, 3); ctx.fill()
  }
  // brightness values appear on the tiles in step 1
  const nums = sm((t - 1.2) / 0.6) * (1 - sm((t - 3.4) / 0.4))
  if (nums > 0) { ctx.save(); ctx.globalAlpha = nums; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const v = img(r, c); ctx.fillStyle = v < 0.5 ? '#E6EEF2' : '#6B5A3A'; ctx.fillText(v < 0.5 ? '0' : '9', MX + c * T + T / 2, MY + r * T + T / 2 + 1) } ctx.restore() }
  // ---------- feature map: vertical-edge filter [-1 0 1] on each row, absolute value ----------
  const act = []
  let mx = 0
  for (let r = 0; r < 6; r++) { act.push([]); for (let c = 0; c < 6; c++) { let s2 = 0; for (let i = 0; i < 3; i++) s2 += img(r + i, c + 2) - img(r + i, c); act[r].push(Math.abs(s2)); mx = Math.max(mx, Math.abs(s2)) } }
  for (const row of act) for (let c = 0; c < 6; c++) row[c] /= mx
  // tray 6x6
  const FX = 300, FY = 76, B = 28
  ctx.fillStyle = '#8B6440'; ctx.beginPath(); ctx.roundRect(FX - 10, FY - 10, 6 * B + 20, 6 * B + 20, 8); ctx.fill()
  ctx.fillStyle = '#6E4E31'; for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { ctx.beginPath(); ctx.arc(FX + c * B + B / 2, FY + r * B + B / 2, 9, 0, Math.PI * 2); ctx.fill() }
  const bead = (x, y, a, s = 1) => { const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11 * s); const l = 0.25 + 0.75 * a
    g.addColorStop(0, `rgba(255,250,230,${l})`); g.addColorStop(0.5, `rgba(${BEAD.join(',')},${0.15 + 0.85 * a})`); g.addColorStop(1, `rgba(120,80,30,${0.4 + 0.4 * a})`)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10 * s, 0, Math.PI * 2); ctx.fill()
    if (a > 0.6) { ctx.fillStyle = `rgba(255,200,90,${0.25 * a})`; ctx.beginPath(); ctx.arc(x, y, 16 * s, 0, Math.PI * 2); ctx.fill() } }
  const N = 36, scanT0 = 3.6, per = 6.0 / N
  const cur = Math.floor((t - scanT0) / per)
  for (let n = 0; n < N; n++) {
    const r = Math.floor(n / 6), c = n % 6, u = (t - scanT0 - n * per) / per
    if (u <= 0) continue
    const x = FX + c * B + B / 2, y = FY + r * B + B / 2
    if (u < 1) { const sx = MX + (c + 1.5) * T, sy = MY + (r + 1.5) * T, v = sm(u); bead(lerp(sx, x, v), lerp(sy, y, v) - Math.sin(v * Math.PI) * 30, act[r][c], 0.8) }
    else bead(x, y, act[r][c])
  }
  // the brass lens frame over the mosaic
  if (t > scanT0 - 0.4 && cur < N) {
    const n = Math.max(0, cur), r = Math.floor(n / 6), c = n % 6
    const x = MX + c * T, y = MY + r * T
    ctx.strokeStyle = '#B8862E'; ctx.lineWidth = 5; ctx.strokeRect(x - 2, y - 2, 3 * T + 4, 3 * T + 4)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { ctx.strokeStyle = '#D9A94A'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + (j + 0.5) * T, y + (i + 0.5) * T, 10, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = j === 0 ? 'rgba(192,57,43,0.25)' : j === 2 ? 'rgba(42,157,143,0.25)' : 'rgba(255,255,255,0.12)'; ctx.fill() }
    ctx.fillStyle = '#B8862E'; ctx.fillRect(x + 3 * T + 2, y + 1.5 * T - 3, 16, 6)
  }
  // ---------- pooling: a 2x2 sieve keeps the brightest bead ----------
  const PX = 540, PY = 118, PB = 32
  ctx.fillStyle = '#8B6440'; ctx.beginPath(); ctx.roundRect(PX - 10, PY - 10, 3 * PB + 20, 3 * PB + 20, 8); ctx.fill()
  ctx.fillStyle = '#6E4E31'; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { ctx.beginPath(); ctx.arc(PX + c * PB + PB / 2, PY + r * PB + PB / 2, 11, 0, Math.PI * 2); ctx.fill() }
  const poolT0 = 9.9, pper = 2.9 / 9
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3), bc = b % 3, u = (t - poolT0 - b * pper) / pper
    if (u <= 0) continue
    let best = 0, bi = 0, bj = 0
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (act[br * 2 + i][bc * 2 + j] >= best) { best = act[br * 2 + i][bc * 2 + j]; bi = i; bj = j }
    const sx = FX + (bc * 2 + bj) * B + B / 2, sy = FY + (br * 2 + bi) * B + B / 2, tx = PX + bc * PB + PB / 2, ty = PY + br * PB + PB / 2
    if (u < 1) {
      ctx.strokeStyle = '#5E4E42'; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.strokeRect(FX + bc * 2 * B, FY + br * 2 * B, 2 * B, 2 * B); ctx.setLineDash([])
      const v = sm(u); bead(lerp(sx, tx, v), lerp(sy, ty, v) - Math.sin(v * Math.PI) * 26, best, 1.05)
    } else bead(tx, ty, best, 1.1)
  }
  // ---------- step 5: stacked glass panes combine features ----------
  const pane = (x, i, draw) => {
    const a = sm((t - 13.1 - i * 0.7) / 0.5); if (a <= 0) return
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, 380)
    ctx.fillStyle = 'rgba(200,230,240,0.55)'; ctx.strokeStyle = '#5E7C8A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-55, -45, 110, 90, 8); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; draw(); ctx.restore()
    if (i > 0) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#B8862E'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 85, 380); ctx.lineTo(x - 62, 380); ctx.moveTo(x - 70, 373); ctx.lineTo(x - 62, 380); ctx.lineTo(x - 70, 387); ctx.stroke(); ctx.restore() }
  }
  pane(300, 0, () => { for (const x of [-30, -10, 10, 30]) { ctx.beginPath(); ctx.moveTo(x, -25); ctx.lineTo(x, 25); ctx.stroke() } })
  pane(450, 1, () => { for (const [x, y, sx, sy] of [[-28, -20, 1, 1], [28, -20, -1, 1], [-28, 22, 1, -1], [28, 22, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x + sx * 14, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * 14); ctx.stroke() } })
  pane(600, 2, () => { ctx.fillStyle = 'rgba(233,162,59,0.35)'; ctx.beginPath(); ctx.moveTo(-30, 28); ctx.lineTo(-30, -4); ctx.lineTo(0, -30); ctx.lineTo(30, -4); ctx.lineTo(30, 28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeRect(-8, 8, 16, 20) })
  if (t > 15.0) pMark(ctx, 672, 336, 'ok', sm((t - 15.0) / 0.4) * 1.2)
}

const SCENES = [
  { name: 'plain-rules-vs-learning', fn: renderPlainRulesVsLearningFrame, poster: 12.5 },
  { name: 'plain-decision-tree', fn: renderPlainDecisionTreeFrame, poster: 11.8 },
  { name: 'plain-linear-classifier', fn: renderPlainLinearClassifierFrame, poster: 8.4 },
  { name: 'plain-image-feature-scan', fn: renderPlainImageFeatureScanFrame, poster: 7.0 },
  { name: 'plain-transformer-context', fn: renderPlainTransformerContextFrame, poster: 12.4 },
  { name: 'plain-disparate-impact-audit', fn: renderPlainDisparateImpactAuditFrame, poster: 8.4 },
  { name: 'turing-test', fn: renderTuringTestFrame, poster: 7.6 },
  { name: 'forward-chaining', fn: renderForwardChainingFrame, poster: 11.0 },
  { name: 'perceptron-learning', fn: renderPerceptronLearningFrame, poster: 5.2, bps: 225_000 },
  { name: 'convolution-scan', fn: renderConvolutionScanFrame, poster: 8.0 }]
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
