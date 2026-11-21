const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'));

const W = 800;
const H = 450;
const FPS = 60;

// Easing helpers
const easeOutBack = t => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeOutBounce = x => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
};

// -------------------------------------------------------------
// CHIP DRAWING HELPER
// -------------------------------------------------------------
function drawChipAvatar(ctx, x, y, scale = 1, pose = 'wave', time = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Bobbing animation
  const bob = Math.sin(time * 4) * 3;
  ctx.translate(0, bob);

  // Antenna
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.roundRect(-3, -44, 6, 14, 3);
  ctx.fill();

  const glowOrb = (Math.sin(time * 8) + 1) / 2;
  ctx.fillStyle = '#F59E0B';
  ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
  ctx.shadowBlur = 10 * glowOrb;
  ctx.beginPath();
  ctx.arc(0, -46, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(0, -46, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ears
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.roundRect(-36, -14, 6, 16, 3);
  ctx.roundRect(30, -14, 6, 16, 3);
  ctx.fill();

  // Arms based on pose
  if (pose === 'cheer') {
    // Both arms up
    const armWave = Math.sin(time * 8) * 0.15;
    ctx.save();
    ctx.translate(-28, -8);
    ctx.rotate(-0.8 + armWave);
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-5, -24, 10, 24, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(28, -8);
    ctx.rotate(0.8 - armWave);
    ctx.beginPath();
    ctx.roundRect(-5, -24, 10, 24, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (pose === 'point') {
    // Left arm resting, Right arm pointing right
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.roundRect(-38, 8, 10, 18, 5);
    ctx.fill();

    ctx.save();
    ctx.translate(26, 4);
    ctx.rotate(0.3);
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(0, -5, 26, 10, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    // Default: Waving
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.roundRect(-38, 8, 10, 18, 5);
    ctx.fill();

    // Waving right arm
    const wave = Math.sin(time * 10) * 0.25;
    ctx.save();
    ctx.translate(30, -12);
    ctx.rotate(wave);
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-5, -20, 10, 22, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Head Chassis
  const grad = ctx.createLinearGradient(-30, -30, 30, 30);
  grad.addColorStop(0, '#38BDF8');
  grad.addColorStop(1, '#0284C7');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-30, -30, 60, 56, 16);
  ctx.fill();
  ctx.stroke();

  // Screen / Visor
  const screenGrad = ctx.createLinearGradient(-22, -18, 22, 18);
  screenGrad.addColorStop(0, '#0F172A');
  screenGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = screenGrad;
  ctx.beginPath();
  ctx.roundRect(-22, -18, 44, 34, 10);
  ctx.fill();

  // Eyes
  if (pose === 'cheer') {
    // Happy curved eyes ^_^
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-10, -2, 6, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(10, -2, 6, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    // Open round glowing eyes
    ctx.fillStyle = '#22D3EE';
    ctx.beginPath();
    ctx.arc(-10, -3, 4.5, 0, Math.PI * 2);
    ctx.arc(10, -3, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle reflection
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-9, -4.5, 1.5, 0, Math.PI * 2);
    ctx.arc(11, -4.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 5, 6, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

// -------------------------------------------------------------
// SCENE 1: CHIP DOG LEARNING (Module 1 Kids)
// -------------------------------------------------------------
function renderChipDogLearningFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Cheerful sky gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(0.5, '#1E293B');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Playful subtle dot grid
  ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
  for (let x = 30; x < W; x += 35) {
    for (let y = 25; y < H; y += 35) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Chip Mascot on Left
  const pose = time >= 12.8 ? 'cheer' : (time >= 6.4 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // Photos Gallery / Cards on Right
  const cards = [
    { label: 'DOG #1', sub: 'Golden (Fluffy)', icon: '🐕', color: '#F59E0B' },
    { label: 'DOG #2', sub: 'Dalmatian (Spots)', icon: '🐶', color: '#38BDF8' },
    { label: 'DOG #3', sub: 'Pug (Small & Wrinkly)', icon: '🐕‍🦺', color: '#10B981' },
    { label: 'DOG #4', sub: 'Husky (Pointy Ears)', icon: '🐺', color: '#A855F7' }
  ];

  const cardW = 115;
  const cardH = 150;
  const startX = 220;
  const startY = 120;

  // Reveal cards progressively in step 1 (3.2s - 6.4s)
  const numVisible = time < 3.2 ? 1 : (time < 6.4 ? 1 + Math.floor(((time - 3.2) / 3.2) * 3) : 4);

  for (let i = 0; i < numVisible; i++) {
    const cx = startX + i * 135;
    const card = cards[i];

    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = card.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = card.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(cx, startY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // Photo placeholder
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(cx + 10, startY + 12, cardW - 20, 75, 10);
    ctx.fill();

    // Emoji icon
    ctx.font = '36px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.icon, cx + cardW / 2, startY + 50);

    // Labels
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(card.label, cx + cardW / 2, startY + 105);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillText(card.sub, cx + cardW / 2, startY + 125);
    ctx.restore();
  }

  // Step 2: Shared Traits Scanner (6.4s - 9.6s)
  if (time >= 6.4) {
    ctx.save();
    const traits = ['🐾 4 LEGS', '👃 WET NOSE', '🐕 WAGGY TAIL'];
    const ty = 310;

    ctx.fillStyle = '#38BDF8';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('COMMON TRAITS FOUND:', startX, ty - 10);

    traits.forEach((trait, idx) => {
      const bx = startX + idx * 165;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, ty, 150, 32, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#E0F2FE';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(trait, bx + 75, ty + 16);
    });
    ctx.restore();
  }

  // Step 3 & 4: New Mystery Dog Test (9.6s - 16s)
  if (time >= 9.6) {
    const qx = W / 2;
    const qy = 380;

    ctx.save();
    ctx.fillStyle = time >= 12.8 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(245, 158, 11, 0.9)';
    ctx.strokeStyle = time >= 12.8 ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 2;
    ctx.shadowColor = time >= 12.8 ? '#10B981' : '#F59E0B';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(qx - 170, qy - 18, 340, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = time >= 12.8 ? '#FFFFFF' : '#0F172A';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(time >= 12.8 ? '🎉 NEW PHOTO: "IT\'S A DOG!" (LEARNED!)' : '🔍 TESTING NEW UNSEEN PHOTO...', qx, qy);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 2: CHIP RULE ROBOT (Module 2 Kids)
// -------------------------------------------------------------
function renderChipRuleRobotFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Cheerful background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0B132B');
  bgGrad.addColorStop(1, '#1C2541');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Chip Mascot
  const pose = time >= 12.8 ? 'cheer' : (time >= 6.4 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // Rulebook Container
  ctx.save();
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(220, 60, 520, 300, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('CHIP\'S RECIPE RULEBOOK 📖', 245, 95);

  // Rule 1 Box
  const r1Active = time >= 3.2;
  ctx.fillStyle = r1Active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)';
  ctx.strokeStyle = r1Active ? '#10B981' : '#475569';
  ctx.lineWidth = r1Active ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(245, 120, 470, 65, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = r1Active ? '#34D399' : '#94A3B8';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('RULE #1: IF (has feathers) AND (sings) THEN: BIRD 🐦', 265, 145);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = r1Active ? '#A7F3D0' : '#64748B';
  ctx.fillText(r1Active ? '✓ MATCHED! New Fact: "It is a bird!"' : 'Waiting for animal clues...', 265, 168);

  // Rule 2 Box
  const r2Active = time >= 9.6;
  ctx.fillStyle = r2Active ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)';
  ctx.strokeStyle = r2Active ? '#F59E0B' : '#475569';
  ctx.lineWidth = r2Active ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(245, 210, 470, 65, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = r2Active ? '#FBBF24' : '#94A3B8';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('RULE #2: IF (is a bird) AND (swims) THEN: DUCK 🦆', 265, 235);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = r2Active ? '#FDE68A' : '#64748B';
  ctx.fillText(r2Active ? '✓ MATCHED! Conclusion Unlocked!' : 'Waiting for swimming clue...', 265, 258);
  ctx.restore();

  // Step 4: Golden Badge Unlocked (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 400);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐ DUCK PROVEN STEP-BY-STEP! ⭐', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 3: CHIP FRUIT SORTER (Module 3 Kids)
// -------------------------------------------------------------
function renderChipFruitSorterFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Chip Mascot
  const pose = time >= 12.8 ? 'cheer' : (time >= 3.2 && time < 9.6 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // Sorting Table / Conveyor
  ctx.save();
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(240, 60, 500, 28, 8);
  ctx.fill();

  // Ramp Pivot
  const pivotX = 490;
  const pivotY = 160;

  // Ramp Angle: 0 at start, tilted wrong at 3.2s, nudged right at 9.6s
  let rampAngle = 0;
  if (time >= 3.2 && time < 6.4) {
    rampAngle = -0.15; // rolls left (wrong)
  } else if (time >= 6.4 && time < 9.6) {
    rampAngle = 0.18; // rolls right (correcting)
  } else if (time >= 9.6) {
    rampAngle = 0.24; // optimal sorting angle
  }

  // Draw Wooden Ramp
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(rampAngle);
  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-140, -8, 280, 16, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Crates
  // Left Crate: Apples (Red)
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(280, 240, 140, 90, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F87171';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍎 APPLES', 350, 270);

  // Right Crate: Lemons (Yellow)
  ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(560, 240, 140, 90, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FDE047';
  ctx.fillText('🍋 LEMONS', 630, 270);

  // Rolling fruit animations
  const rollCycle = (time % 2) / 2; // 0 to 1
  const fruitX = 350 + rollCycle * 280;
  const isApple = Math.floor(time / 2) % 2 === 0;

  ctx.font = '28px system-ui';
  ctx.fillText(isApple ? '🍎' : '🍋', fruitX, 120 + Math.sin(rollCycle * Math.PI) * -15);
  ctx.restore();

  // Step 4: Calibrated & Cheering (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 PERFECT SORTING! LINE HAS LEARNED!', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 4: CHIP MAGNIFYING GLASS (Module 4 Kids)
// -------------------------------------------------------------
function renderChipMagnifyingGlassFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Chip Mascot
  const pose = time >= 12.8 ? 'cheer' : (time >= 3.2 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // Easel / Photo Box
  const picX = 260;
  const picY = 70;
  const picW = 280;
  const picH = 260;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(picX, picY, picW, picH, 16);
  ctx.fill();
  ctx.stroke();

  // Cat silhouette drawing on canvas
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;

  // Cat face outline
  ctx.beginPath();
  ctx.arc(picX + picW / 2, picY + picH / 2 + 10, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Cat ears
  ctx.beginPath();
  ctx.moveTo(picX + picW / 2 - 45, picY + picH / 2 - 30);
  ctx.lineTo(picX + picW / 2 - 60, picY + picH / 2 - 80);
  ctx.lineTo(picX + picW / 2 - 15, picY + picH / 2 - 50);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(picX + picW / 2 + 45, picY + picH / 2 - 30);
  ctx.lineTo(picX + picW / 2 + 60, picY + picH / 2 - 80);
  ctx.lineTo(picX + picW / 2 + 15, picY + picH / 2 - 50);
  ctx.stroke();

  // Whiskers
  ctx.beginPath();
  ctx.moveTo(picX + picW / 2 - 25, picY + picH / 2 + 15); ctx.lineTo(picX + picW / 2 - 75, picY + picH / 2 + 5);
  ctx.moveTo(picX + picW / 2 - 25, picY + picH / 2 + 25); ctx.lineTo(picX + picW / 2 - 75, picY + picH / 2 + 30);
  ctx.moveTo(picX + picW / 2 + 25, picY + picH / 2 + 15); ctx.lineTo(picX + picW / 2 + 75, picY + picH / 2 + 5);
  ctx.moveTo(picX + picW / 2 + 25, picY + picH / 2 + 25); ctx.lineTo(picX + picW / 2 + 75, picY + picH / 2 + 30);
  ctx.stroke();

  // Magnifying Glass Sliding (Step 1 & 2: 3.2s - 9.6s)
  if (time >= 3.2 && time < 9.6) {
    const scanT = (time - 3.2) / 6.4;
    const lensX = picX + 50 + scanT * 180;
    const lensY = picY + 50 + Math.sin(scanT * Math.PI * 3) * 60;

    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(lensX, lensY, 35, 0, Math.PI * 2);
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.moveTo(lensX + 25, lensY + 25);
    ctx.lineTo(lensX + 55, lensY + 55);
    ctx.stroke();

    // Feature highlighter glow
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(lensX, lensY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Feature Checklist Panel (Right)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(570, 70, 180, 260, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FOUND FEATURES: 🐱', 585, 100);

  const feats = [
    { label: 'Triangle Ears', active: time >= 4.5 },
    { label: 'Nose & Whiskers', active: time >= 7.0 },
    { label: 'Round Head Shape', active: time >= 9.5 }
  ];

  feats.forEach((ft, idx) => {
    const fy = 135 + idx * 45;
    ctx.fillStyle = ft.active ? '#10B981' : '#475569';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText((ft.active ? '✓ ' : '○ ') + ft.label, 585, fy);
  });
  ctx.restore();

  // Step 4: Recognition Complete Badge (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱 CAT RECOGNIZED 99.4%! (VISION PROVEN)', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 5: CHIP WORD BLOCKS (Module 5 Kids)
// -------------------------------------------------------------
function renderChipWordBlocksFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Chip Mascot
  const pose = time >= 12.8 ? 'cheer' : (time >= 6.4 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // Toy Word Blocks
  const blocks = [
    { text: 'KING 👑', x: 260, y: 110, color: '#F59E0B' },
    { text: 'MAN 👦', x: 260, y: 210, color: '#38BDF8' },
    { text: 'WOMAN 👧', x: 440, y: 210, color: '#EC4899' },
    { text: 'QUEEN 👸', x: 440, y: 110, color: '#A855F7' }
  ];

  blocks.forEach(b => {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(b.x - 55, b.y - 22, 110, 44, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, b.x, b.y);
    ctx.restore();
  });

  // Connecting arrows in Step 1 (3.2s - 6.4s)
  if (time >= 3.2) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(260, 185); ctx.lineTo(260, 135);
    ctx.stroke();

    ctx.strokeStyle = '#A855F7';
    ctx.beginPath();
    ctx.moveTo(440, 185); ctx.lineTo(440, 135);
    ctx.stroke();
    ctx.restore();
  }

  // Sentence Train & Attention Beam (Step 2 & 3: 6.4s - 16s)
  const tokens = ['The', 'puppy', 'ran', 'because', 'it', 'was', 'happy'];
  const trainX = 220;
  const trainY = 310;

  tokens.forEach((tok, idx) => {
    const isTarget = tok === 'puppy' && time >= 9.6;
    const isQuery = tok === 'it' && time >= 6.4;

    ctx.save();
    ctx.fillStyle = isTarget ? '#10B981' : (isQuery ? '#F59E0B' : '#1E293B');
    if (isTarget || isQuery) {
      ctx.shadowColor = isTarget ? '#10B981' : '#F59E0B';
      ctx.shadowBlur = 12;
    }
    const bx = trainX + idx * 75;
    ctx.beginPath();
    ctx.roundRect(bx - 32, trainY - 16, 64, 32, 8);
    ctx.fill();

    ctx.fillStyle = isTarget || isQuery ? '#0F172A' : '#E2E8F0';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tok, bx, trainY);
    ctx.restore();
  });

  // Attention Arc from "it" to "puppy" (Step 3: 9.6s - 12.8s)
  if (time >= 9.6) {
    const qX = trainX + 4 * 75;
    const tX = trainX + 1 * 75;
    const topY = trainY - 16;

    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(qX, topY);
    ctx.bezierCurveTo(qX - 50, topY - 70, tX + 50, topY - 70, tX, topY);
    ctx.stroke();

    ctx.font = '20px system-ui';
    ctx.fillText('💖', (qX + tX) / 2, topY - 45);
    ctx.restore();
  }

  // Step 4: Attention Resolved (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ "IT" MEANS "PUPPY"! (ATTENTION RESOLVED)', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 6: CHIP PLAYGROUND SCALE (Module 7 Kids)
// -------------------------------------------------------------
function renderChipPlaygroundScaleFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0F172A');
  bgGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Chip Mascot
  const pose = time >= 12.8 ? 'cheer' : (time >= 3.2 && time < 9.6 ? 'point' : 'wave');
  drawChipAvatar(ctx, 110, 220, 1.3, pose, time);

  // See-Saw Center
  const centerX = 470;
  const centerY = 200;

  // See-saw angle: tilts left in step 1 & 2 (-14 deg), levels out in step 3 & 4
  let angle = 0;
  if (time >= 3.2 && time < 9.6) {
    angle = -0.22;
  } else if (time >= 9.6 && time < 12.8) {
    const rec = (time - 9.6) / 3.2;
    angle = -0.22 * (1 - rec);
  }

  // Fulcrum Triangle
  ctx.save();
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX - 30, centerY + 70);
  ctx.lineTo(centerX + 30, centerY + 70);
  ctx.closePath();
  ctx.fill();

  // Moving Plank
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);

  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-160, -6, 320, 12, 6);
  ctx.fill();
  ctx.stroke();

  // Left Seat (Team Blue)
  ctx.save();
  ctx.translate(-130, -25);
  ctx.rotate(-angle);
  ctx.fillStyle = '#38BDF8';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('👦🧢', 0, 0);
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('TEAM BLUE', 0, 18);
  ctx.restore();

  // Right Seat (Team Purple)
  ctx.save();
  ctx.translate(130, -25);
  ctx.rotate(-angle);
  ctx.fillStyle = '#C084FC';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(time < 9.6 ? '👧' : '👧🧢', 0, 0);
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('TEAM PURPLE', 0, 18);
  ctx.restore();
  ctx.restore();

  // Status Banner
  ctx.save();
  const bannerY = 50;
  let bannerText = '⚖️ PLAYGROUND BALANCE: EQUAL FUN FOR ALL!';
  let bannerBg = 'rgba(16, 185, 129, 0.2)';
  let bannerColor = '#34D399';

  if (time >= 3.2 && time < 9.6) {
    bannerText = '⚠ NOT FAIR YET: ONE TEAM IS LEFT OUT!';
    bannerBg = 'rgba(239, 68, 68, 0.2)';
    bannerColor = '#F87171';
  }

  ctx.fillStyle = bannerBg;
  ctx.strokeStyle = bannerColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 200, bannerY, 400, 32, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = bannerColor;
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bannerText, W / 2, bannerY + 16);
  ctx.restore();

  // Step 4: Fair Play Trophy Badge (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)';
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-160, -18, 320, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 FAIR RULES RESTORE BALANCED PLAY!', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// MAIN BATCH RENDERER
// -------------------------------------------------------------
async function renderScenes() {
  console.log('Launching Chromium for Kids Bespoke 60fps Video Rendering...');
  const browser = await chromium.launch();

  const scenes = [
    { name: 'chip-dog-learning', fn: renderChipDogLearningFrame.toString(), chipFn: drawChipAvatar.toString() },
    { name: 'chip-rule-robot', fn: renderChipRuleRobotFrame.toString(), chipFn: drawChipAvatar.toString() },
    { name: 'chip-fruit-sorter', fn: renderChipFruitSorterFrame.toString(), chipFn: drawChipAvatar.toString() },
    { name: 'chip-magnifying-glass', fn: renderChipMagnifyingGlassFrame.toString(), chipFn: drawChipAvatar.toString() },
    { name: 'chip-word-blocks', fn: renderChipWordBlocksFrame.toString(), chipFn: drawChipAvatar.toString() },
    { name: 'chip-playground-scale', fn: renderChipPlaygroundScaleFrame.toString(), chipFn: drawChipAvatar.toString() }
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

      const easeOutBounce = x => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (x < 1 / d1) {
          return n1 * x * x;
        } else if (x < 2 / d1) {
          return n1 * (x -= 1.5 / d1) * x + 0.75;
        } else if (x < 2.5 / d1) {
          return n1 * (x -= 2.25 / d1) * x + 0.9375;
        } else {
          return n1 * (x -= 2.625 / d1) * x + 0.984375;
        }
      };

      const renderFrame = new Function(
        'ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', 'easeOutBack',
        `
        const drawChipAvatar = ${sceneObj.chipFn};
        return (${sceneObj.fn})(ctx, f, totalFrames, W, H, FPS, easeOutBack);
        `
      );

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
  console.log('Kids Batch rendering complete!');
}

renderScenes().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
