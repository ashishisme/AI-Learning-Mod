const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../web/node_modules/@playwright/test'));

async function renderVideo() {
  console.log('Launching Chromium for video rendering (WebM + MP4 + Poster)...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const result = await page.evaluate(async () => {
    const W = 800;
    const H = 450;
    const FPS = 60;
    const TOTAL_SECONDS = 17;
    const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

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

    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutBack = t => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const apples = [
      { x: 530, y: 130 },
      { x: 590, y: 80 },
      { x: 670, y: 140 },
      { x: 720, y: 85 },
      { x: 610, y: 190 },
      { x: 490, y: 160 }
    ];

    const lemons = [
      { x: 140, y: 350 },
      { x: 210, y: 390 },
      { x: 290, y: 340 },
      { x: 360, y: 390 },
      { x: 230, y: 280 },
      { x: 400, y: 240 } // initially misclassified lemon
    ];

    function drawGrid() {
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#1E293B';
      for (let x = 40; x < W - 20; x += 40) {
        for (let y = 30; y < H - 20; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(50, 30);
      ctx.lineTo(50, 410);
      ctx.lineTo(770, 410);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('X₁ (Feature 1)', 700, 430);
      ctx.save();
      ctx.translate(35, 90);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('X₂ (Feature 2)', 0, 0);
      ctx.restore();
    }

    function drawPoints(frameProgress) {
      const pointAlpha = Math.min(1, frameProgress / (1.5 * FPS));

      lemons.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pointAlpha;
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(pt.x - 2, pt.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      apples.forEach((pt) => {
        ctx.save();
        ctx.globalAlpha = pointAlpha;
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - 8);
        ctx.quadraticCurveTo(pt.x + 2, pt.y - 12, pt.x + 5, pt.y - 13);
        ctx.stroke();

        ctx.fillStyle = '#FECACA';
        ctx.beginPath();
        ctx.arc(pt.x - 2, pt.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    let posterData = null;

    for (let f = 0; f < TOTAL_FRAMES; f++) {
      const time = f / FPS;
      drawGrid();
      drawPoints(f);

      let p1 = { x: 50, y: 310 };
      let p2 = { x: 750, y: 220 };
      let ghostLine = null;

      if (time >= 2.5) {
        const lineEntrance = Math.min(1, (time - 2.5) / 1.0);

        if (time < 6.5) {
          p1 = { x: 50, y: 310 };
          p2 = { x: 750, y: 220 };
        } else if (time >= 6.5 && time < 9.5) {
          const tTilt = easeInOutCubic((time - 6.5) / 3.0);
          ghostLine = { p1: { x: 50, y: 310 }, p2: { x: 750, y: 220 } };
          p1 = { x: 50 + (300 - 50) * tTilt, y: 310 + (410 - 310) * tTilt };
          p2 = { x: 750 + (680 - 750) * tTilt, y: 220 + (30 - 220) * tTilt };
        } else if (time >= 9.5 && time < 13.0) {
          ghostLine = { p1: { x: 300, y: 410 }, p2: { x: 680, y: 30 } };
          const tTilt2 = easeInOutCubic((time - 9.5) / 3.0);
          p1 = { x: 300 + (190 - 300) * tTilt2, y: 410 + (410 - 410) * tTilt2 };
          p2 = { x: 680 + (740 - 680) * tTilt2, y: 30 + (80 - 30) * tTilt2 };
        } else {
          p1 = { x: 190, y: 410 };
          p2 = { x: 740, y: 80 };
        }

        ctx.save();
        ctx.globalAlpha = Math.min(0.85, lineEntrance);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(W, 0);
        ctx.lineTo(p1.x > 0 ? W : 0, 0);
        ctx.closePath();
        const posGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, 0);
        posGrad.addColorStop(0, 'rgba(16, 185, 129, 0.04)');
        posGrad.addColorStop(1, 'rgba(16, 185, 129, 0.16)');
        ctx.fillStyle = posGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.lineTo(0, p1.y);
        ctx.closePath();
        const negGrad = ctx.createLinearGradient(p2.x, p2.y, 0, H);
        negGrad.addColorStop(0, 'rgba(245, 158, 11, 0.04)');
        negGrad.addColorStop(1, 'rgba(245, 158, 11, 0.16)');
        ctx.fillStyle = negGrad;
        ctx.fill();
        ctx.restore();

        if (ghostLine) {
          ctx.save();
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(ghostLine.p1.x, ghostLine.p1.y);
          ctx.lineTo(ghostLine.p2.x, ghostLine.p2.y);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = time >= 13.0 ? '#10B981' : '#06B6D4';
        ctx.shadowBlur = time >= 13.0 ? 16 : 10;
        ctx.strokeStyle = time >= 13.0 ? '#34D399' : '#38BDF8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len;
        const ny = dx / len;
        ctx.strokeStyle = time >= 13.0 ? '#34D399' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + nx * 24, midY + ny * 24);
        ctx.stroke();
        ctx.restore();
      }

      if (time >= 4.0 && time < 8.0) {
        const pulseCycle = ((time - 4.0) * 1.5) % 1;
        const pulseRadius = 10 + pulseCycle * 28;
        const pulseAlpha = Math.max(0, 1 - pulseCycle);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(400, 240, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText('Error = −1', 415, 230);
        ctx.restore();
      }

      if (time >= 8.5 && time < 11.5) {
        const pulseCycle2 = ((time - 8.5) * 1.8) % 1;
        const pulseRadius2 = 10 + pulseCycle2 * 26;
        const pulseAlpha2 = Math.max(0, 1 - pulseCycle2);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${pulseAlpha2})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(490, 160, pulseRadius2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText('Error = +1', 505, 150);
        ctx.restore();
      }

      if (time >= 13.0) {
        const tBadge = Math.min(1, (time - 13.0) / 0.5);
        const scale = easeOutBack(tBadge);
        ctx.save();
        ctx.translate(W / 2, 50);
        ctx.scale(scale, scale);

        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-100, -18, 200, 36, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#34D399';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓ ZERO ERRORS • CONVERGED', 0, 0);
        ctx.restore();
      }

      if (f === 200) {
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
  });

  await browser.close();

  const publicVidDir = path.resolve(__dirname, '../web/public/brand/videos');
  const sourceVidDir = path.resolve(__dirname, '../design/brand/source/videos');
  fs.mkdirSync(publicVidDir, { recursive: true });
  fs.mkdirSync(sourceVidDir, { recursive: true });

  const webmPath = path.join(publicVidDir, 'perceptron-learning.webm');
  fs.writeFileSync(webmPath, Buffer.from(result.webm));
  fs.writeFileSync(path.join(sourceVidDir, 'perceptron-learning.webm'), Buffer.from(result.webm));
  console.log(`WebM saved: ${webmPath} (${result.webm.length} bytes / ${(result.webm.length / 1024).toFixed(1)} KB)`);

  if (result.mp4) {
    const mp4Path = path.join(publicVidDir, 'perceptron-learning.mp4');
    fs.writeFileSync(mp4Path, Buffer.from(result.mp4));
    fs.writeFileSync(path.join(sourceVidDir, 'perceptron-learning.mp4'), Buffer.from(result.mp4));
    console.log(`MP4 saved: ${mp4Path} (${result.mp4.length} bytes / ${(result.mp4.length / 1024).toFixed(1)} KB)`);
  }

  if (result.poster) {
    const base64Data = result.poster.replace(/^data:image\/jpeg;base64,/, '');
    const posterPath = path.join(publicVidDir, 'perceptron-learning-poster.jpg');
    fs.writeFileSync(posterPath, Buffer.from(base64Data, 'base64'));
    fs.writeFileSync(path.join(sourceVidDir, 'perceptron-learning-poster.jpg'), Buffer.from(base64Data, 'base64'));
    console.log(`Poster saved: ${posterPath}`);
  }
}

renderVideo().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
