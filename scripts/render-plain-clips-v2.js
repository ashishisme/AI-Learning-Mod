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

// Lesson 7: selection rates for two groups, the four-fifths check, dropping a proxy, and the re-check.
function renderPlainDisparateImpactAuditFrame(ctx, f, totalFrames, W, H, FPS) {
  const t = f / FPS
  pBg(ctx, W, H)
  const GA = C.good, GB = '#7B6CB3'
  pPanel(ctx, 30, 30, 360, 390); pPanel(ctx, 410, 30, 360, 390)
  // ---------- left: screening gate with three criteria ----------
  const fix = sm((t - 10.0) / 0.8)
  const chips = [
    { x: 120, icon: 'cap' }, { x: 210, icon: 'pin', proxy: true }, { x: 300, icon: 'case' }]
  ctx.fillStyle = C.soft; ctx.fillRect(50, 176, 320, 54)
  for (const c of chips) {
    const out = c.proxy ? fix : 0
    if (out >= 1) continue
    ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(c.x, 203 - 40 * out)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = c.proxy && t > 9.9 ? C.bad : C.navy; ctx.lineWidth = 2
    ctx.beginPath(); ctx.roundRect(-34, -18, 68, 36, 10); ctx.fill(); ctx.stroke()
    ctx.fillStyle = C.navy
    if (c.icon === 'cap') { ctx.beginPath(); ctx.moveTo(-16, -2); ctx.lineTo(0, -10); ctx.lineTo(16, -2); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill(); ctx.fillRect(-8, 0, 16, 8) }
    if (c.icon === 'case') { ctx.beginPath(); ctx.roundRect(-14, -6, 28, 18, 3); ctx.fill(); ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.strokeRect(-6, -11, 12, 5) }
    if (c.icon === 'pin') { ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(0, -4, 8, Math.PI, 0); ctx.lineTo(0, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, -4, 3, 0, Math.PI * 2); ctx.fill() }
    if (c.proxy && t > 9.9) { ctx.strokeStyle = C.bad; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, 12); ctx.lineTo(26, -12); ctx.stroke() }
    ctx.restore()
  }
  // candidates: ten per group; selected ones rise above the gate
  const rateA = 0.6, rateB = lerp(0.3, 0.5, sm((t - 11.0) / 1.4))
  const grow = sm((t - 0.6) / 2.6)
  const person = (x, y, col, on) => { ctx.save(); ctx.globalAlpha = on ? 1 : 0.35; pPerson(ctx, x, y, 0.55, col); ctx.restore() }
  for (const [g, col, rate, x0] of [[0, GA, rateA, 62], [1, GB, rateB, 222]]) {
    const n = Math.round(10 * rate * grow * 10) / 10
    for (let i = 0; i < 10; i++) {
      const k = Math.floor(n + 1e-6), sel = i < k, slot = sel ? i : i - k
      const cx = x0 + (slot % 5) * 26, row = Math.floor(slot / 5)
      const y = sel ? 100 + row * 34 : 300 + row * 34
      person(cx + 8, y, col, sel)
    }
  }
  // ---------- right: selection-rate bars and the four-fifths gauge ----------
  const bars = sm((t - 3.6) / 1.0)
  const BY = 250, BH = 180
  const bar = (x, rate, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, BY - BH * rate * bars, 56, BH * rate * bars, [6, 6, 0, 0]); ctx.fill() }
  ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(450, BY); ctx.lineTo(620, BY); ctx.stroke()
  bar(470, rateA, GA); bar(550, rateB, GB)
  pPerson(ctx, 498, BY + 30, 0.5, GA); pPerson(ctx, 578, BY + 30, 0.5, GB)
  // step 2: the gap and an audit flag
  const gap = sm((t - 5.0) / 0.5) * (1 - sm((t - 12.4) / 0.5))
  if (gap > 0) {
    ctx.save(); ctx.globalAlpha = gap; ctx.strokeStyle = C.warn; ctx.lineWidth = 2.5
    const yA = BY - BH * rateA, yB = BY - BH * rateB
    ctx.beginPath(); ctx.moveTo(612, yA); ctx.lineTo(622, yA); ctx.lineTo(622, yB); ctx.lineTo(612, yB); ctx.stroke()
    pMark(ctx, 640, (yA + yB) / 2, 'q', 0.9 + 0.08 * Math.sin(t * 6)); ctx.restore()
  }
  // step 3: dashed four-fifths line over group B
  const ff = sm((t - 6.6) / 0.6)
  if (ff > 0) {
    ctx.save(); ctx.globalAlpha = ff; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 5])
    const y = BY - BH * rateA * 0.8; ctx.beginPath(); ctx.moveTo(540, y); ctx.lineTo(616, y); ctx.stroke(); ctx.restore()
  }
  // the gauge: ratio B / A against the 0.8 mark
  const gx = 690, gy = 330, gr = 44, ratio = rateB / rateA
  if (ff > 0) {
    ctx.save(); ctx.globalAlpha = ff
    ctx.lineWidth = 12; ctx.strokeStyle = C.soft; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 2 * Math.PI); ctx.stroke()
    ctx.strokeStyle = ratio >= 0.8 ? C.good : C.bad; ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, Math.PI + Math.PI * ratio * ff); ctx.stroke()
    const m = Math.PI + Math.PI * 0.8; ctx.strokeStyle = C.ink; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(gx + Math.cos(m) * (gr - 12), gy + Math.sin(m) * (gr - 12)); ctx.lineTo(gx + Math.cos(m) * (gr + 12), gy + Math.sin(m) * (gr + 12)); ctx.stroke()
    pMark(ctx, gx, gy - 8, ratio >= 0.8 ? 'ok' : 'no', t > 7.4 ? 1 : 0)
    ctx.restore()
  }
  // step 5: the audit log is signed off
  const log = sm((t - 13.6) / 0.5)
  if (log > 0) {
    ctx.save(); ctx.globalAlpha = log; ctx.translate(500, 340)
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = C.navy; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-30, -36, 60, 74, 6); ctx.fill(); ctx.stroke()
    ctx.fillStyle = C.navy; ctx.fillRect(-12, -42, 24, 10)
    for (let i = 0; i < 3; i++) { ctx.fillStyle = C.line; ctx.fillRect(-18, -18 + i * 14, 36, 5) }
    pMark(ctx, 22, 28, 'ok', sm((t - 14.2) / 0.4)); ctx.restore()
  }
}

const SCENES = [
  { name: 'plain-rules-vs-learning', fn: renderPlainRulesVsLearningFrame, poster: 12.5 },
  { name: 'plain-decision-tree', fn: renderPlainDecisionTreeFrame, poster: 11.8 },
  { name: 'plain-linear-classifier', fn: renderPlainLinearClassifierFrame, poster: 8.4 },
  { name: 'plain-image-feature-scan', fn: renderPlainImageFeatureScanFrame, poster: 7.0 },
  { name: 'plain-transformer-context', fn: renderPlainTransformerContextFrame, poster: 12.4 },
  { name: 'plain-disparate-impact-audit', fn: renderPlainDisparateImpactAuditFrame, poster: 8.4 }]
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
