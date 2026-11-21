const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'));

const W = 800;
const H = 450;
const FPS = 60;

// Easing helpers
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// -------------------------------------------------------------
// SCENE 1: TURING TEST (Module 1)
// -------------------------------------------------------------
function renderTuringTestFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid dots
  ctx.fillStyle = '#1E293B';
  for (let x = 40; x < W - 20; x += 40) {
    for (let y = 30; y < H - 20; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Interrogator Terminal Box (Left)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.25)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(40, 140, 210, 170, 14);
  ctx.fill();
  ctx.stroke();

  // Terminal Header
  ctx.fillStyle = '#0284C7';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('TERMINAL C • EVALUATOR', 55, 165);

  ctx.fillStyle = '#38BDF8';
  ctx.font = '600 13px "Courier New", monospace';
  ctx.fillText('> SEND "Are you human?"', 55, 195);
  ctx.fillText('> A: "Of course..."', 55, 230);
  ctx.fillText('> B: "Naturally..."', 55, 255);

  // Blinking cursor
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillRect(55, 275, 8, 14);
  }
  ctx.restore();

  // Room A Box (Top Right: Human)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#A855F7';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(168, 85, 247, 0.25)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(550, 60, 210, 130, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C084FC';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('ROOM A • HIDDEN ENTITY', 565, 85);
  ctx.font = '600 12px "Courier New", monospace';
  ctx.fillStyle = '#E9D5FF';
  ctx.fillText('Typing... (pauses, typos)', 565, 115);

  // Typing cadence indicator
  const typingPulse = (Math.sin(time * 8) + 1) / 2;
  ctx.fillStyle = `rgba(168, 85, 247, ${0.3 + typingPulse * 0.7})`;
  ctx.beginPath();
  ctx.arc(730, 80, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Room B Box (Bottom Right: Machine)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(16, 185, 129, 0.25)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(550, 260, 210, 130, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('ROOM B • STATISTICAL AI', 565, 285);

  // Token probability bars
  const p1 = 0.82;
  const p2 = 0.14;
  ctx.fillStyle = '#065F46';
  ctx.fillRect(565, 310, 150, 8);
  ctx.fillStyle = '#10B981';
  ctx.fillRect(565, 310, 150 * p1, 8);

  ctx.fillStyle = '#065F46';
  ctx.fillRect(565, 330, 150, 8);
  ctx.fillStyle = '#34D399';
  ctx.fillRect(565, 330, 150 * p2, 8);

  ctx.fillStyle = '#6EE7B7';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('P(next_token) = 0.82', 565, 360);
  ctx.restore();

  // Traveling Signal Pulses (Center transmission channels)
  const pulseT = (time * 0.8) % 1;
  const pulseX = 250 + (550 - 250) * pulseT;

  // Channel lines
  ctx.save();
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(250, 180);
  ctx.lineTo(550, 120);
  ctx.moveTo(250, 270);
  ctx.lineTo(550, 320);
  ctx.stroke();
  ctx.restore();

  // Outbound pulses (0 - 6s)
  if (time < 7.0) {
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#0284C7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pulseX, 180 + (120 - 180) * pulseT, 6, 0, Math.PI * 2);
    ctx.arc(pulseX, 270 + (320 - 270) * pulseT, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Inbound response pulses (7s - 13s)
    const inT = ((time - 7.0) * 0.8) % 1;
    const inX = 550 - (550 - 250) * inT;
    ctx.save();
    ctx.fillStyle = '#A855F7';
    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(inX, 120 + (180 - 120) * inT, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10B981';
    ctx.shadowColor = '#34D399';
    ctx.beginPath();
    ctx.arc(inX, 320 + (270 - 320) * inT, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Central Confidence Meter (Evaluator cannot tell!)
  ctx.save();
  const meterCX = 390;
  const meterCY = 225;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(meterCX, meterCY, 50, Math.PI, 0);
  ctx.stroke();

  // Gauge needle
  let needleAngle = -Math.PI / 2; // center 50/50
  if (time >= 8.0 && time < 13.0) {
    needleAngle = -Math.PI / 2 + Math.sin((time - 8.0) * 4) * 0.5 * Math.exp(-(time - 8.0) * 0.35);
  }

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(meterCX, meterCY);
  ctx.lineTo(meterCX + Math.cos(needleAngle) * 42, meterCY + Math.sin(needleAngle) * 42);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.fillText('HUMAN', meterCX - 55, meterCY + 15);
  ctx.fillText('AI', meterCX + 25, meterCY + 15);
  ctx.restore();

  // Lock Banner (13.5s - 16s)
  if (time >= 13.5) {
    const tBadge = Math.min(1, (time - 13.5) / 0.5);
    const scale = easeOutBack(tBadge);
    ctx.save();
    ctx.translate(W / 2, 45);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(8, 47, 73, 0.9)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-140, -18, 280, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ 50/50 EQUILIBRIUM • INDISTINGUISHABLE', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 2: FORWARD CHAINING (Module 2)
// -------------------------------------------------------------
function renderForwardChainingFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid dots
  ctx.fillStyle = '#1E293B';
  for (let x = 40; x < W - 20; x += 40) {
    for (let y = 30; y < H - 20; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Nodes Definition
  const nodes = {
    feathers: { x: 120, y: 110, label: 'HAS FEATHERS', active: time >= 1.0 },
    wings: { x: 120, y: 225, label: 'HAS WINGS', active: time >= 1.0 },
    cannotFly: { x: 120, y: 340, label: 'CANNOT FLY', active: time >= 7.0 },
    bird: { x: 400, y: 167, label: 'IS A BIRD', active: time >= 4.5 },
    swims: { x: 400, y: 340, label: 'CAN SWIM', active: time >= 9.5 },
    penguin: { x: 670, y: 250, label: 'PENGUIN', active: time >= 12.0 }
  };

  // Draw Edges (Rules)
  function drawEdge(from, to, active, pulseProgress) {
    ctx.save();
    ctx.strokeStyle = active ? '#38BDF8' : '#334155';
    ctx.lineWidth = active ? 2.5 : 1.5;
    if (active) {
      ctx.shadowColor = '#0284C7';
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Pulse along edge when firing
    if (pulseProgress > 0 && pulseProgress < 1) {
      const px = from.x + (to.x - from.x) * pulseProgress;
      const py = from.y + (to.y - from.y) * pulseProgress;
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Rule 1 pulses (1.5s - 4.5s)
  const r1Pulse = time >= 2.0 && time < 4.5 ? (time - 2.0) / 2.5 : 0;
  drawEdge(nodes.feathers, nodes.bird, nodes.bird.active, r1Pulse);
  drawEdge(nodes.wings, nodes.bird, nodes.bird.active, r1Pulse);

  // Rule 2 pulses (9.5s - 12.0s)
  const r2Pulse = time >= 9.5 && time < 12.0 ? (time - 9.5) / 2.5 : 0;
  drawEdge(nodes.bird, nodes.penguin, nodes.penguin.active, r2Pulse);
  drawEdge(nodes.cannotFly, nodes.penguin, nodes.penguin.active, r2Pulse);
  drawEdge(nodes.swims, nodes.penguin, nodes.penguin.active, r2Pulse);

  // Draw Nodes
  Object.values(nodes).forEach(n => {
    ctx.save();
    const isTarget = n.label === 'PENGUIN';
    ctx.fillStyle = n.active
      ? (isTarget ? '#065F46' : 'rgba(15, 23, 42, 0.95)')
      : 'rgba(15, 23, 42, 0.5)';
    ctx.strokeStyle = n.active
      ? (isTarget ? '#10B981' : '#38BDF8')
      : '#334155';
    ctx.lineWidth = n.active ? 2.5 : 1.5;

    if (n.active) {
      ctx.shadowColor = isTarget ? '#10B981' : '#0284C7';
      ctx.shadowBlur = 14;
    }

    const rw = isTarget ? 150 : 130;
    const rh = 40;
    ctx.beginPath();
    ctx.roundRect(n.x - rw / 2, n.y - rh / 2, rw, rh, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = n.active ? '#F8FAFC' : '#64748B';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);
    ctx.restore();
  });

  // Proof Audit Trail Banner (13.0s - 16s)
  if (time >= 13.0) {
    const tBadge = Math.min(1, (time - 13.0) / 0.5);
    const scale = easeOutBack(tBadge);
    ctx.save();
    ctx.translate(W / 2, 45);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-150, -18, 300, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ EXPLAINABLE DEDUCTION TRAIL PROVEN', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 3: CONVOLUTION SCAN (Module 4)
// -------------------------------------------------------------
function renderConvolutionScanFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.fillStyle = '#1E293B';
  for (let x = 40; x < W - 20; x += 40) {
    for (let y = 30; y < H - 20; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 8x8 Input Image Matrix
  const inGridX = 60;
  const inGridY = 110;
  const inCell = 26; // 8 * 26 = 208px
  const matrixData = [
    [10, 15, 20, 220, 240, 25, 10, 5],
    [12, 18, 22, 215, 235, 30, 15, 8],
    [15, 20, 25, 225, 245, 35, 20, 10],
    [10, 14, 20, 210, 230, 28, 12, 6],
    [8,  12, 18, 205, 225, 25, 10, 4],
    [14, 18, 24, 218, 238, 32, 16, 7],
    [11, 15, 21, 212, 232, 29, 13, 5],
    [9,  13, 19, 208, 228, 26, 11, 4]
  ];

  // Draw Input Matrix
  ctx.save();
  ctx.fillStyle = '#64748B';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('INPUT IMAGE MATRIX (8×8)', inGridX, inGridY - 15);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const val = matrixData[r][c];
      const cx = inGridX + c * inCell;
      const cy = inGridY + r * inCell;
      const brightness = val / 255;

      ctx.fillStyle = `rgba(${Math.round(56 * brightness + 15)}, ${Math.round(189 * brightness + 23)}, ${Math.round(248 * brightness + 42)}, ${0.15 + brightness * 0.75})`;
      ctx.fillRect(cx, cy, inCell - 2, inCell - 2);

      ctx.fillStyle = brightness > 0.5 ? '#0F172A' : '#94A3B8';
      ctx.font = '600 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), cx + inCell / 2 - 1, cy + inCell / 2 - 1);
    }
  }
  ctx.restore();

  // Kernel Animation (Steps 1 & 2: 3.2s - 9.6s)
  // 3x3 filter scanning positions (0 to 5)
  const outGridX = 460;
  const outGridY = 95;
  const outCell = 24; // 6 * 24 = 144px

  let scanCol = 0;
  let scanRow = 0;
  if (time >= 3.2 && time < 9.6) {
    const scanProgress = (time - 3.2) / 6.4; // 0 to 1
    const totalSteps = 36;
    const currentStep = Math.min(35, Math.floor(scanProgress * totalSteps));
    scanRow = Math.floor(currentStep / 6);
    scanCol = currentStep % 6;
  } else if (time >= 9.6) {
    scanRow = 5;
    scanCol = 5;
  }

  // Draw 3x3 Kernel bounding box over input matrix if time >= 3.2
  if (time >= 3.2 && time < 9.6) {
    const kx = inGridX + scanCol * inCell;
    const ky = inGridY + scanRow * inCell;
    const kw = 3 * inCell - 2;
    const kh = 3 * inCell - 2;

    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowBlur = 12;
    ctx.strokeRect(kx - 1, ky - 1, kw + 2, kh + 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fillRect(kx - 1, ky - 1, kw + 2, kh + 2);

    // Connecting beam from Kernel to Feature Map output cell
    const destX = outGridX + scanCol * outCell + outCell / 2;
    const destY = outGridY + scanRow * outCell + outCell / 2;

    ctx.beginPath();
    ctx.moveTo(kx + kw, ky + kh / 2);
    ctx.lineTo(destX, destY);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }

  // Draw Kernel weights banner in middle
  ctx.save();
  const kMidX = 330;
  const kMidY = 175;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(kMidX - 45, kMidY - 50, 90, 100, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F59E0B';
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('3×3 FILTER', kMidX, kMidY - 32);

  // Kernel values
  const kWeights = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = kWeights[r][c] > 0 ? '#38BDF8' : (kWeights[r][c] < 0 ? '#EF4444' : '#64748B');
      ctx.font = '700 10px monospace';
      ctx.fillText(String(kWeights[r][c]), kMidX - 22 + c * 22, kMidY - 10 + r * 20);
    }
  }
  ctx.restore();

  // Draw 6x6 Feature Map
  ctx.save();
  ctx.fillStyle = '#64748B';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('FEATURE MAP (6×6)', outGridX, outGridY - 15);

  const revealedMax = time < 3.2 ? 0 : (time >= 9.6 ? 36 : Math.floor(((time - 3.2) / 6.4) * 36));

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const idx = r * 6 + c;
      const cx = outGridX + c * outCell;
      const cy = outGridY + r * outCell;

      if (idx <= revealedMax) {
        // High activation when col is 2 or 3 (vertical edge)
        const isEdge = (c === 1 || c === 2);
        const actVal = isEdge ? 420 : 15;
        const normAct = isEdge ? 1.0 : 0.1;

        ctx.fillStyle = isEdge ? 'rgba(16, 185, 129, 0.85)' : 'rgba(30, 41, 59, 0.6)';
        if (isEdge) {
          ctx.shadowColor = '#10B981';
          ctx.shadowBlur = 8;
        }
        ctx.fillRect(cx, cy, outCell - 2, outCell - 2);

        ctx.fillStyle = isEdge ? '#FFFFFF' : '#64748B';
        ctx.font = '600 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(actVal), cx + outCell / 2 - 1, cy + outCell / 2 - 1);
      } else {
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(cx, cy, outCell - 2, outCell - 2);
      }
    }
  }
  ctx.restore();

  // Step 3: Max Pooling (9.6s - 12.8s)
  if (time >= 9.6) {
    const poolX = outGridX;
    const poolY = 280;
    const poolCell = 32;

    ctx.save();
    ctx.fillStyle = '#64748B';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('MAX POOLING (3×3)', poolX, poolY - 12);

    const poolValues = [
      [35, 420, 20],
      [30, 420, 18],
      [28, 420, 16]
    ];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const val = poolValues[r][c];
        const cx = poolX + c * poolCell;
        const cy = poolY + r * poolCell;
        const isMax = val === 420;

        ctx.fillStyle = isMax ? '#10B981' : '#1E293B';
        if (isMax) {
          ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(cx, cy, poolCell - 2, poolCell - 2);

        ctx.fillStyle = isMax ? '#FFFFFF' : '#94A3B8';
        ctx.font = '700 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(val), cx + poolCell / 2 - 1, cy + poolCell / 2 - 1);
      }
    }
    ctx.restore();
  }

  // Step 4: Recognition Hierarchy Banner (12.8s - 16s)
  if (time >= 12.8) {
    const tBadge = Math.min(1, (time - 12.8) / 0.5);
    const scale = easeOutBack(tBadge);
    ctx.save();
    ctx.translate(W / 2, 410);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ ROBUST VISUAL FEATURE HIERARCHY', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 4: VECTOR ATTENTION (Module 5)
// -------------------------------------------------------------
function renderVectorAttentionFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle coordinate grid
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 60; x < W; x += 60) {
    ctx.moveTo(x, 20); ctx.lineTo(x, H - 20);
  }
  for (let y = 40; y < H; y += 40) {
    ctx.moveTo(20, y); ctx.lineTo(W - 20, y);
  }
  ctx.stroke();

  // Part 1: Vector Arithmetic (0.0s - 6.4s)
  // King - Man + Woman = Queen
  const points = {
    king:  { x: 180, y: 100, label: 'KING' },
    man:   { x: 180, y: 220, label: 'MAN' },
    queen: { x: 380, y: 100, label: 'QUEEN' },
    woman: { x: 380, y: 220, label: 'WOMAN' }
  };

  // Draw points
  Object.entries(points).forEach(([key, pt]) => {
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText(pt.label, pt.x + 12, pt.y + 4);
    ctx.restore();
  });

  // Vector arrow Man -> King
  ctx.save();
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(points.man.x, points.man.y);
  ctx.lineTo(points.king.x, points.king.y);
  ctx.stroke();

  // Vector arrow Woman -> Queen
  ctx.strokeStyle = '#A855F7';
  ctx.beginPath();
  ctx.moveTo(points.woman.x, points.woman.y);
  ctx.lineTo(points.queen.x, points.queen.y);
  ctx.stroke();

  // Vector subtraction arrow Man -> Woman
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(points.man.x, points.man.y);
  ctx.lineTo(points.woman.x, points.woman.y);
  ctx.stroke();
  ctx.restore();

  // Part 2 & 3: Transformer Sentence & Self-Attention (6.4s - 16s)
  const tokens = [
    { text: 'The', x: 50 },
    { text: 'animal', x: 120, key: 'animal' },
    { text: 'didn\'t', x: 200 },
    { text: 'cross', x: 275 },
    { text: 'the', x: 345 },
    { text: 'street', x: 405, key: 'street' },
    { text: 'because', x: 485 },
    { text: 'it', x: 580, isQuery: true },
    { text: 'was', x: 635 },
    { text: 'tired', x: 695, key: 'tired' }
  ];

  const tokY = 320;

  // Draw Tokens
  tokens.forEach(tok => {
    ctx.save();
    const isQ = tok.isQuery && time >= 6.4;
    const isTarget = (tok.key === 'animal') && time >= 9.6;

    ctx.fillStyle = isQ ? '#F59E0B' : (isTarget ? '#10B981' : '#1E293B');
    if (isQ || isTarget) {
      ctx.shadowColor = isQ ? '#F59E0B' : '#10B981';
      ctx.shadowBlur = 12;
    }
    const tw = ctx.measureText(tok.text).width + 20;
    ctx.beginPath();
    ctx.roundRect(tok.x - tw / 2, tokY - 16, tw, 32, 8);
    ctx.fill();

    ctx.fillStyle = isQ || isTarget ? '#0F172A' : '#E2E8F0';
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tok.text, tok.x, tokY);
    ctx.restore();
  });

  // Self-attention Arcs (Step 3: 9.6s - 12.8s)
  if (time >= 9.6) {
    const qX = 580; // "it"
    const qY = tokY - 16;

    // Arc to "animal" (weight 0.88 - Strong)
    const animalX = 120;
    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(qX, qY);
    ctx.bezierCurveTo(qX - 100, qY - 120, animalX + 100, qY - 120, animalX, qY);
    ctx.stroke();

    // Weight badge
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect((qX + animalX) / 2 - 25, qY - 95, 50, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('w=0.88', (qX + animalX) / 2, qY - 84);
    ctx.restore();

    // Arc to "street" (weight 0.09 - Faint)
    const streetX = 405;
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(qX, qY);
    ctx.bezierCurveTo(qX - 40, qY - 50, streetX + 40, qY - 50, streetX, qY);
    ctx.stroke();
    ctx.restore();
  }

  // Step 4: Contextualized Representation Badge (12.8s - 16s)
  if (time >= 12.8) {
    const tBadge = Math.min(1, (time - 12.8) / 0.5);
    const scale = easeOutBack(tBadge);
    ctx.save();
    ctx.translate(W / 2, 410);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-170, -18, 340, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ CONTEXTUALIZED ATTENTION RESOLVED', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 5: FAIRNESS CALIBRATION (Module 7)
// -------------------------------------------------------------
function renderFairnessCalibrationFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.fillStyle = '#1E293B';
  for (let x = 40; x < W - 20; x += 40) {
    for (let y = 30; y < H - 20; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Balance Scale Center
  const scaleCenterX = W / 2;
  const scaleCenterY = 160;

  // Balance angle: tilts left in step 1 & 2 (-14 deg), returns to 0 in step 3 & 4
  let angle = 0;
  if (time >= 3.2 && time < 9.6) {
    angle = -0.22; // tilted
  } else if (time >= 9.6 && time < 12.8) {
    const recal = (time - 9.6) / 3.2;
    angle = -0.22 * (1 - recal);
  }

  // Draw Balance Scale Fulcrum & Beam
  ctx.save();
  ctx.translate(scaleCenterX, scaleCenterY);

  // Stand
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, 0, 12, 100);
  ctx.beginPath();
  ctx.moveTo(-40, 100);
  ctx.lineTo(40, 100);
  ctx.lineTo(25, 90);
  ctx.lineTo(-25, 90);
  ctx.fill();

  // Pivot point
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  // Beam
  ctx.rotate(angle);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-160, -4, 320, 8);

  // Left Pan (Group A)
  ctx.save();
  ctx.translate(-140, 0);
  ctx.rotate(-angle);
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-25, 45);
  ctx.moveTo(0, 0); ctx.lineTo(25, 45);
  ctx.stroke();

  ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-40, 45, 80, 20, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GROUP A', 0, 60);
  ctx.restore();

  // Right Pan (Group B)
  ctx.save();
  ctx.translate(140, 0);
  ctx.rotate(-angle);
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-25, 45);
  ctx.moveTo(0, 0); ctx.lineTo(25, 45);
  ctx.stroke();

  ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
  ctx.strokeStyle = '#A855F7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-40, 45, 80, 20, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C084FC';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GROUP B', 0, 60);
  ctx.restore();
  ctx.restore();

  // Disparate Impact Ratio Banner
  ctx.save();
  const ratioY = 40;
  let ratioText = 'DISPARATE IMPACT: 0.92 (PARITY BALANCED)';
  let ratioBg = 'rgba(16, 185, 129, 0.2)';
  let ratioBorder = '#10B981';
  let ratioColor = '#34D399';

  if (time < 3.2) {
    ratioText = 'BASE POPULATION DISTRIBUTION';
    ratioBg = 'rgba(56, 189, 248, 0.15)';
    ratioBorder = '#38BDF8';
    ratioColor = '#38BDF8';
  } else if (time >= 3.2 && time < 9.6) {
    ratioText = '⚠ DISPARATE IMPACT: 0.44 < 0.80 (FOUR-FIFTHS VIOLATION)';
    ratioBg = 'rgba(239, 68, 68, 0.2)';
    ratioBorder = '#EF4444';
    ratioColor = '#F87171';
  }

  ctx.fillStyle = ratioBg;
  ctx.strokeStyle = ratioBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 220, ratioY, 440, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = ratioColor;
  ctx.font = '700 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ratioText, W / 2, ratioY + 16);
  ctx.restore();

  // Threshold Bars & Recalibration Gauges (280px to 380px)
  const barY = 285;
  const barW = 280;

  // Group A Gauge
  ctx.save();
  ctx.fillStyle = '#64748B';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('GROUP A SELECTION RATE (68%)', 100, barY - 10);

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(100, barY, barW, 14);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(100, barY, barW * 0.68, 14);

  // Group B Gauge
  ctx.fillStyle = '#64748B';
  ctx.fillText(time < 9.6 ? 'GROUP B SELECTION RATE (30%)' : 'GROUP B CALIBRATED RATE (62%)', 440, barY - 10);

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(440, barY, barW, 14);

  const bRate = time < 9.6 ? 0.30 : (0.30 + Math.min(1, (time - 9.6) / 2) * 0.32);
  ctx.fillStyle = '#A855F7';
  ctx.fillRect(440, barY, barW * bRate, 14);
  ctx.restore();

  // Step 4: Calibrated & Audited Badge (12.8s - 16s)
  if (time >= 12.8) {
    const tBadge = Math.min(1, (time - 12.8) / 0.5);
    const scale = easeOutBack(tBadge);
    ctx.save();
    ctx.translate(W / 2, 410);
    ctx.scale(scale, scale);

    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ CALIBRATED EQUAL OPPORTUNITY AUDITED', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// MAIN BATCH RENDERER
// -------------------------------------------------------------
async function renderScenes() {
  console.log('Launching Chromium for Batch 60fps Video Rendering...');
  const browser = await chromium.launch();

  const scenes = [
    { name: 'turing-test', fn: renderTuringTestFrame.toString() },
    { name: 'forward-chaining', fn: renderForwardChainingFrame.toString() },
    { name: 'convolution-scan', fn: renderConvolutionScanFrame.toString() },
    { name: 'vector-attention', fn: renderVectorAttentionFrame.toString() },
    { name: 'fairness-calibration', fn: renderFairnessCalibrationFrame.toString() }
  ];

  for (const scene of scenes) {
    console.log(`Rendering scene: ${scene.name}...`);
    const page = await browser.newPage();

    const result = await page.evaluate(async (sceneObj) => {
      const W = 800;
      const H = 450;
      const FPS = 60;
      const TOTAL_SECONDS = 16;
      const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

      const easeOutBack = t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const renderFrame = new Function('ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', 'easeOutBack', `return (${sceneObj.fn})(ctx, f, totalFrames, W, H, FPS, easeOutBack)`);

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      // FR-016: no words in the video, the captions carry them. Text with letters keeps only its emoji; numbers and symbols stay.
      for (const m of ['fillText', 'strokeText']) { const draw = ctx[m].bind(ctx); ctx[m] = (s, ...a) => { s = String(s); if (/\p{L}/u.test(s)) s = (s.match(/\p{Extended_Pictographic}/gu) || []).join(''); if (s) draw(s, ...a); }; }

      const stream = canvas.captureStream(FPS);
      const mimeWebm = 'video/webm;codecs=vp9';
      const mimeMp4 = 'video/mp4;codecs=avc1';

      const recWebm = new MediaRecorder(stream, { mimeType: mimeWebm, videoBitsPerSecond: 380_000 });
      const chunksWebm = [];
      recWebm.ondataavailable = e => { if (e.data && e.data.size > 0) chunksWebm.push(e.data); };

      let recMp4 = null;
      const chunksMp4 = [];
      if (MediaRecorder.isTypeSupported(mimeMp4)) {
        recMp4 = new MediaRecorder(stream, { mimeType: mimeMp4, videoBitsPerSecond: 450_000 });
        recMp4.ondataavailable = e => { if (e.data && e.data.size > 0) chunksMp4.push(e.data); };
        recMp4.start(100);
      }

      recWebm.start(100);

      let posterData = null;

      for (let f = 0; f < TOTAL_FRAMES; f++) {
        renderFrame(ctx, f, TOTAL_FRAMES, W, H, FPS, easeOutBack);

        if (f === 180) { // capture poster at 3.0s
          posterData = canvas.toDataURL('image/jpeg', 0.85);
        }

        await new Promise(r => setTimeout(r, 1000 / FPS));
      }

      recWebm.stop();
      if (recMp4) recMp4.stop();

      await new Promise(r => recWebm.onstop = r);
      if (recMp4) await new Promise(r => recMp4.onstop = r);

      const blobWebm = new Blob(chunksWebm, { type: mimeWebm });
      const bufWebm = await blobWebm.arrayBuffer();

      let bufMp4 = null;
      if (chunksMp4.length > 0) {
        const blobMp4 = new Blob(chunksMp4, { type: mimeMp4 });
        bufMp4 = await blobMp4.arrayBuffer();
      }

      return {
        webm: Array.from(new Uint8Array(bufWebm)),
        mp4: bufMp4 ? Array.from(new Uint8Array(bufMp4)) : null,
        poster: posterData
      };
    }, scene);

    await page.close();

    const publicVidDir = path.resolve(__dirname, '../web/public/brand/videos');
    const sourceVidDir = path.resolve(__dirname, '../design/brand/source/videos');

    const webmPath = path.join(publicVidDir, `${scene.name}.webm`);
    fs.writeFileSync(webmPath, Buffer.from(result.webm));
    fs.writeFileSync(path.join(sourceVidDir, `${scene.name}.webm`), Buffer.from(result.webm));
    console.log(`✔ WebM saved: ${webmPath} (${(result.webm.length / 1024).toFixed(1)} KB)`);

    if (result.mp4) {
      const mp4Path = path.join(publicVidDir, `${scene.name}.mp4`);
      fs.writeFileSync(mp4Path, Buffer.from(result.mp4));
      fs.writeFileSync(path.join(sourceVidDir, `${scene.name}.mp4`), Buffer.from(result.mp4));
      console.log(`✔ MP4 saved: ${mp4Path} (${(result.mp4.length / 1024).toFixed(1)} KB)`);
    }

    if (result.poster) {
      const base64Data = result.poster.replace(/^data:image\/jpeg;base64,/, '');
      const posterPath = path.join(publicVidDir, `${scene.name}-poster.jpg`);
      fs.writeFileSync(posterPath, Buffer.from(base64Data, 'base64'));
      fs.writeFileSync(path.join(sourceVidDir, `${scene.name}-poster.jpg`), Buffer.from(base64Data, 'base64'));
      console.log(`✔ Poster saved: ${posterPath}`);
    }
  }

  await browser.close();
  console.log('Batch rendering complete!');
}

renderScenes().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
