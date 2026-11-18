const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'));

const W = 800;
const H = 450;
const FPS = 60;

// Easing helper
const easeOutBack = t => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// -------------------------------------------------------------
// SCENE 1: PLAIN RULES VS LEARNING (Module 1 Plain English)
// -------------------------------------------------------------
function renderPlainRulesVsLearningFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.fillStyle = '#1E293B';
  for (let x = 40; x < W; x += 40) {
    for (let y = 30; y < H; y += 40) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Left Column: Traditional Software (Fixed Rules)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(40, 80, 330, 260, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('TRADITIONAL SOFTWARE (MANUAL RULES)', 60, 110);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '600 11px monospace';
  ctx.fillText('1. IF customer_age > 18 THEN...', 60, 145);
  ctx.fillText('2. IF purchase_amount > 5000 THEN...', 60, 175);
  ctx.fillText('3. IF country != "UK" THEN...', 60, 205);

  if (time >= 3.2 && time < 9.6) {
    // Edge case failure alert in traditional
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(60, 235, 290, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F87171';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText('⚠ UNFORESEEN EDGE CASE: FAILS SILENTLY', 75, 262);
  } else {
    ctx.fillStyle = '#64748B';
    ctx.fillText('4. Rigid rule branches stop at unknowns', 60, 245);
  }
  ctx.restore();

  // Right Column: Machine Learning (Learned Patterns)
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.2)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.roundRect(430, 80, 330, 260, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.fillText('MODERN AI (PATTERN LEARNING)', 450, 110);

  // Data records training animation (Step 1 & 2: 3.2s - 9.6s)
  const records = [
    { text: 'Transaction #1042: Legitimate (99.8%)', color: '#10B981' },
    { text: 'Transaction #1043: Fraudulent (94.2%)', color: '#EF4444' },
    { text: 'Transaction #1044: Legitimate (98.9%)', color: '#10B981' }
  ];

  const revealed = time < 3.2 ? 1 : (time < 6.4 ? 2 : 3);
  for (let i = 0; i < revealed; i++) {
    const rec = records[i];
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.roundRect(450, 135 + i * 40, 290, 32, 6);
    ctx.fill();

    ctx.fillStyle = rec.color;
    ctx.font = '700 11px monospace';
    ctx.fillText(rec.text, 465, 155 + i * 40);
  }

  // Generalization banner (Step 3 & 4: 9.6s - 16s)
  if (time >= 9.6) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(450, 265, 290, 48, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.fillText('✓ ADAPTS TO NEW UNSEEN PATTERNS', 465, 295);
  }
  ctx.restore();

  // Bottom Summary Ribbon (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.roundRect(-170, -18, 340, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ PATTERNS FROM DATA BEAT RIGID MANUAL RULES', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 2: PLAIN DECISION TREE (Module 2 Plain English)
// -------------------------------------------------------------
function renderPlainDecisionTreeFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Header Box: Incoming Customer Request
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 160, 40, 320, 50, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INCOMING CUSTOMER TICKET #8491', W / 2, 60);
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 11px monospace';
  ctx.fillText('"Urgent: Billing discrepancy on invoice"', W / 2, 78);
  ctx.restore();

  // Branch Decision Nodes
  const nodes = {
    urgency: { x: W / 2, y: 160, label: 'CHECK URGENCY: HIGH?', active: time >= 3.2 },
    billing: { x: W / 2 - 160, y: 260, label: 'CATEGORY: BILLING?', active: time >= 6.4 },
    general: { x: W / 2 + 160, y: 260, label: 'CATEGORY: GENERAL?', active: false },
    specialist: { x: W / 2 - 160, y: 350, label: 'ACTION: ROUTE TO BILLING LEAD', active: time >= 9.6 }
  };

  // Connecting Lines
  ctx.save();
  ctx.lineWidth = 2;

  // Root to Urgency
  ctx.strokeStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(W / 2, 90); ctx.lineTo(nodes.urgency.x, nodes.urgency.y - 20);
  ctx.stroke();

  // Urgency to Billing
  ctx.strokeStyle = nodes.billing.active ? '#10B981' : '#334155';
  ctx.beginPath();
  ctx.moveTo(nodes.urgency.x - 30, nodes.urgency.y + 20);
  ctx.lineTo(nodes.billing.x, nodes.billing.y - 20);
  ctx.stroke();

  // Urgency to General
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(nodes.urgency.x + 30, nodes.urgency.y + 20);
  ctx.lineTo(nodes.general.x, nodes.general.y - 20);
  ctx.stroke();

  // Billing to Specialist
  ctx.strokeStyle = nodes.specialist.active ? '#10B981' : '#334155';
  ctx.beginPath();
  ctx.moveTo(nodes.billing.x, nodes.billing.y + 20);
  ctx.lineTo(nodes.specialist.x, nodes.specialist.y - 20);
  ctx.stroke();
  ctx.restore();

  // Draw Nodes
  Object.values(nodes).forEach(n => {
    ctx.save();
    ctx.fillStyle = n.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = n.active ? '#10B981' : '#475569';
    ctx.lineWidth = n.active ? 2 : 1;
    if (n.active) {
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.roundRect(n.x - 120, n.y - 20, 240, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = n.active ? '#34D399' : '#94A3B8';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y);
    ctx.restore();
  });

  // Audit Trail Stamp (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2 + 160, 350);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-120, -20, 240, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓ AUDIT TRAIL RECORDED', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 3: PLAIN LINEAR CLASSIFIER (Module 3 Plain English)
// -------------------------------------------------------------
function renderPlainLinearClassifierFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Scatter plot area
  const chartX = 140;
  const chartY = 60;
  const chartW = 520;
  const chartH = 280;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(chartX, chartY, chartW, chartH, 12);
  ctx.fill();
  ctx.stroke();

  // Axis Labels
  ctx.fillStyle = '#64748B';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANNUAL INCOME →', chartX + chartW / 2, chartY + chartH + 25);

  ctx.save();
  ctx.translate(chartX - 25, chartY + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('CREDIT HISTORY SCORE →', 0, 0);
  ctx.restore();

  // Data Points: Approved (Green) vs Denied (Coral)
  const approved = [
    { x: 380, y: 120 }, { x: 440, y: 100 }, { x: 480, y: 140 }, { x: 550, y: 90 }, { x: 590, y: 130 }
  ];
  const denied = [
    { x: 190, y: 270 }, { x: 230, y: 240 }, { x: 270, y: 290 }, { x: 310, y: 220 }, { x: 220, y: 190 }
  ];

  approved.forEach(pt => {
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  denied.forEach(pt => {
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Decision Boundary Line Adaptation (Steps 1, 2, 3: 3.2s - 12.8s)
  // Step 0: flat horizontal line
  // Step 1: tilts when mistake observed
  // Step 3: calibrated diagonal line cleanly separating the groups
  let lineAngle = 0;
  if (time >= 3.2 && time < 6.4) {
    lineAngle = -0.25;
  } else if (time >= 6.4 && time < 9.6) {
    lineAngle = -0.55;
  } else if (time >= 9.6) {
    lineAngle = -0.78; // calibrated
  }

  ctx.save();
  ctx.translate(chartX + chartW / 2, chartY + chartH / 2);
  ctx.rotate(lineAngle);

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-chartW / 2, 0);
  ctx.lineTo(chartW / 2, 0);
  ctx.stroke();

  // Boundary Label
  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DECISION BOUNDARY CUTOFF', chartW / 2 - 20, -10);
  ctx.restore();
  ctx.restore();

  // Success Banner (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 400);
    ctx.scale(scale, scale);

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
    ctx.fillText('✓ CALIBRATED DECISION THRESHOLD STABILIZED', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 4: PLAIN IMAGE FEATURE SCAN (Module 4 Plain English)
// -------------------------------------------------------------
function renderPlainImageFeatureScanFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Left Side: Inspection Component
  const compX = 60;
  const compY = 80;
  const compW = 280;
  const compH = 260;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(compX, compY, compW, compH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('INDUSTRIAL COMPONENT SURFACE', compX + 15, compY + 25);

  // Micro-crack contour
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(compX + 80, compY + 180);
  ctx.lineTo(compX + 130, compY + 120);
  ctx.lineTo(compX + 170, compY + 150);
  ctx.lineTo(compX + 220, compY + 90);
  ctx.stroke();

  // Sliding Scanner Frame (Step 1 & 2: 3.2s - 9.6s)
  if (time >= 3.2 && time < 9.6) {
    const scanT = (time - 3.2) / 6.4;
    const filterX = compX + 30 + scanT * 160;
    const filterY = compY + 50 + scanT * 120;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(filterX, filterY, 60, 60);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.fillRect(filterX, filterY, 60, 60);

    // Connecting beam
    ctx.beginPath();
    ctx.moveTo(filterX + 60, filterY + 30);
    ctx.lineTo(460, 160);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
  }
  ctx.restore();

  // Right Side: Diagnostic Feature Map
  const mapX = 460;
  const mapY = 80;
  const mapW = 280;
  const mapH = 260;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34D399';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('ANOMALY DETECTION HEATMAP', mapX + 15, mapY + 25);

  // Heatmap anomaly activation
  if (time >= 6.4) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(mapX + 70, mapY + 90, 140, 70, 10);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACK ANOMALY DETECTED', mapX + 140, mapY + 125);
    ctx.font = '600 10px monospace';
    ctx.fillText('CONFIDENCE: 99.2%', mapX + 140, mapY + 142);
  }
  ctx.restore();

  // Step 4: Quality Inspection Certified Badge (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 395);
    ctx.scale(scale, scale);

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
    ctx.fillText('✓ DEFECT ISOLATED FOR HUMAN VERIFICATION', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 5: PLAIN TRANSFORMER CONTEXT (Module 5 Plain English)
// -------------------------------------------------------------
function renderPlainTransformerContextFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Contract Document Container
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(60, 60, 680, 260, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('LEGAL CONTRACT DISAMBIGUATION PIPELINE', 85, 90);

  // Token pills
  const tokens = [
    { text: 'The', x: 100 },
    { text: 'indemnity', x: 175, isTarget: true },
    { text: 'clause', x: 260 },
    { text: 'protects', x: 340 },
    { text: 'the', x: 410 },
    { text: 'client', x: 470 },
    { text: 'because', x: 550 },
    { text: 'it', x: 625, isQuery: true },
    { text: 'applies', x: 690 }
  ];

  const tokY = 160;

  tokens.forEach(tok => {
    ctx.save();
    const isQ = tok.isQuery && time >= 6.4;
    const isT = tok.isTarget && time >= 9.6;

    ctx.fillStyle = isQ ? '#F59E0B' : (isT ? '#10B981' : '#1E293B');
    if (isQ || isT) {
      ctx.shadowColor = isQ ? '#F59E0B' : '#10B981';
      ctx.shadowBlur = 12;
    }
    const tw = ctx.measureText(tok.text).width + 20;
    ctx.beginPath();
    ctx.roundRect(tok.x - tw / 2, tokY - 16, tw, 32, 8);
    ctx.fill();

    ctx.fillStyle = isQ || isT ? '#0F172A' : '#E2E8F0';
    ctx.font = '700 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tok.text, tok.x, tokY);
    ctx.restore();
  });

  // Relevance Attention Arc from "it" to "indemnity" (Step 3: 9.6s - 12.8s)
  if (time >= 9.6) {
    const qX = 625;
    const tX = 175;
    const topY = tokY - 16;

    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(qX, topY);
    ctx.bezierCurveTo(qX - 100, topY - 80, tX + 100, topY - 80, tX, topY);
    ctx.stroke();

    // Weight Badge
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect((qX + tX) / 2 - 45, topY - 70, 90, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RELEVANCE: 0.94', (qX + tX) / 2, topY - 59);
    ctx.restore();
  }
  ctx.restore();

  // Step 4: Disambiguated Summary Output (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 385);
    ctx.scale(scale, scale);

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
    ctx.fillText('✓ CONTEXT RESOLVED: "IT" → INDEMNITY CLAUSE', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// SCENE 6: PLAIN DISPARATE IMPACT AUDIT (Module 7 Plain English)
// -------------------------------------------------------------
function renderPlainDisparateImpactAuditFrame(ctx, f, totalFrames, W, H, FPS, easeOutBack) {
  const time = f / FPS;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Conversion Funnel Metrics Box
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(60, 50, 680, 280, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('HR RECRUITMENT PIPELINE COMPLIANCE AUDIT', 85, 80);

  // Group A Funnel Bar
  const aW = 480;
  const aY = 110;
  ctx.fillStyle = '#64748B';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('GROUP A CONVERSION RATE (72%)', 85, aY);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(85, aY + 10, aW, 16);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(85, aY + 10, aW * 0.72, 16);

  // Group B Funnel Bar
  const bY = 175;
  const bRate = time < 9.6 ? 0.30 : (0.30 + Math.min(1, (time - 9.6) / 2) * 0.35); // 30% -> 65%
  ctx.fillStyle = '#64748B';
  ctx.fillText(time < 9.6 ? 'GROUP B UNCALIBRATED RATE (30%)' : 'GROUP B RECALIBRATED RATE (65%)', 85, bY);
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(85, bY + 10, aW, 16);
  ctx.fillStyle = '#A855F7';
  ctx.fillRect(85, bY + 10, aW * bRate, 16);

  // Compliance Metric Badge
  const ratio = (bRate / 0.72).toFixed(2);
  const isViolation = ratio < 0.80;

  ctx.fillStyle = isViolation ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  ctx.strokeStyle = isViolation ? '#EF4444' : '#10B981';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(85, 240, 500, 36, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isViolation ? '#F87171' : '#34D399';
  ctx.font = '700 12px monospace';
  ctx.fillText(
    isViolation
      ? `⚠ DISPARATE IMPACT RATIO: ${ratio} (FOUR-FIFTHS BENCHMARK BREACH)`
      : `✓ DISPARATE IMPACT RATIO: ${ratio} (COMPLIANCE AUDIT CERTIFIED)`,
    105, 263
  );
  ctx.restore();

  // Governance Audit Shield (12.8s - 16s)
  if (time >= 12.8) {
    const scale = easeOutBack(Math.min(1, (time - 12.8) / 0.5));
    ctx.save();
    ctx.translate(W / 2, 385);
    ctx.scale(scale, scale);

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
    ctx.fillText('✓ EQUALIZED OPPORTUNITY AUDIT CERTIFIED', 0, 0);
    ctx.restore();
  }
}

// -------------------------------------------------------------
// MAIN BATCH RENDERER
// -------------------------------------------------------------
async function renderScenes() {
  console.log('Launching Chromium for Plain English Bespoke 60fps Video Rendering...');
  const browser = await chromium.launch();

  const scenes = [
    { name: 'plain-rules-vs-learning', fn: renderPlainRulesVsLearningFrame.toString() },
    { name: 'plain-decision-tree', fn: renderPlainDecisionTreeFrame.toString() },
    { name: 'plain-linear-classifier', fn: renderPlainLinearClassifierFrame.toString() },
    { name: 'plain-image-feature-scan', fn: renderPlainImageFeatureScanFrame.toString() },
    { name: 'plain-transformer-context', fn: renderPlainTransformerContextFrame.toString() },
    { name: 'plain-disparate-impact-audit', fn: renderPlainDisparateImpactAuditFrame.toString() }
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

      const renderFrame = new Function(
        'ctx', 'f', 'totalFrames', 'W', 'H', 'FPS', 'easeOutBack',
        `return (${sceneObj.fn})(ctx, f, totalFrames, W, H, FPS, easeOutBack);`
      );

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

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
  console.log('Plain English Batch rendering complete!');
}

renderScenes().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
