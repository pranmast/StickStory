// StickStory — app.js
// Self-contained client-side animation + MediaRecorder export

// Utility: parse resolution string
function parseRes(val) {
  const [w,h] = val.split('x').map(Number);
  return {w,h};
}

// Simple prompt -> storyboard heuristics
function promptToStoryboard(prompt, totalSec) {
  // lower-case, basic keyword matching
  const p = prompt.toLowerCase();
  const steps = [];
  // default intro walk
  steps.push({ action: 'enter', duration: Math.max(0.8, totalSec * 0.12) });

  if (p.includes('quarrel') || p.includes('argue') || p.includes('fight')) {
    steps.push({ action: 'quarrel', duration: Math.max(0.8, totalSec * 0.2) });
  }

  if (p.includes('kiss') || p.includes('make up') || p.includes('makeup')) {
    steps.push({ action: 'makeup', duration: Math.max(0.7, totalSec * 0.18) });
  }

  if (p.includes('celebrate') || p.includes('blast') || p.includes('party')) {
    steps.push({ action: 'celebrate', duration: Math.max(0.8, totalSec * 0.2) });
  }

  if (steps.length === 1) {
    // not much in prompt -> generic mini-story
    steps.push({ action: 'quarrel', duration: Math.max(0.8, totalSec * 0.18) });
    steps.push({ action: 'makeup', duration: Math.max(0.7, totalSec * 0.12) });
    steps.push({ action: 'celebrate', duration: Math.max(0.8, totalSec * 0.2) });
  }

  // ensure total duration roughly equals requested
  const sum = steps.reduce((s,x)=>s+x.duration,0);
  const scale = totalSec / Math.max(sum, totalSec);
  steps.forEach(s => s.duration *= scale);

  return steps;
}

// Konva stage + simple stickman actors
let stage, layer, leftActor, rightActor, ground;

function createStage(w, h) {
  // remove old stage if exists
  const container = document.getElementById('stage-container');
  container.innerHTML = ''; // empties previous
  stage = new Konva.Stage({ container: 'stage-container', width: w, height: h });
  layer = new Konva.Layer();
  stage.add(layer);

  // ground line
  ground = new Konva.Line({
    points: [0, h*0.8, w, h*0.8], stroke: '#ddd', strokeWidth: 2
  });
  layer.add(ground);

  // left actor (x,y are center)
  leftActor = makeStick( w*0.3, h*0.72 );
  rightActor = makeStick( w*0.7, h*0.72 );
  layer.add(leftActor.group);
  layer.add(rightActor.group);
  layer.draw();
}

function makeStick(x,y) {
  const g = new Konva.Group({ x, y, draggable: false });

  const head = new Konva.Circle({ x:0, y:-45, radius:14, stroke: 'black', strokeWidth:2 });
  const body = new Konva.Line({ points:[0,-30,0,10], stroke:'black', strokeWidth:3, lineCap:'round' });
  const leftArm = new Konva.Line({ points:[0,-10,-18,0], stroke:'black', strokeWidth:3, lineCap:'round' });
  const rightArm = new Konva.Line({ points:[0,-10,18,0], stroke:'black', strokeWidth:3, lineCap:'round' });
  const leftLeg = new Konva.Line({ points:[0,10,-14,35], stroke:'black', strokeWidth:3, lineCap:'round' });
  const rightLeg = new Konva.Line({ points:[0,10,14,35], stroke:'black', strokeWidth:3, lineCap:'round' });

  const blush = new Konva.Circle({ x:10, y:-50, radius:3, fill:'#ffb3b3', opacity:0 });

  g.add(head, body, leftArm, rightArm, leftLeg, rightLeg, blush);

  return { group: g, head, body, leftArm, rightArm, leftLeg, rightLeg, blush };
}

// Helper animations
function moveActor(actor, x, y, duration=0.6) {
  actor.group.to({ x, y, duration, easing: Konva.Easings.EaseInOut });
}

function animateQuarrel(left, right, duration) {
  // jitter move
  left.group.to({ x: left.group.x()-20, duration: duration/3, y: left.group.y(), easing: Konva.Easings.EaseInOut });
  right.group.to({ x: right.group.x()+20, duration: duration/3, easing: Konva.Easings.EaseInOut });
  setTimeout(()=> {
    left.group.to({ x: left.group.x()+10, duration: duration/2, easing: Konva.Easings.EaseInOut });
    right.group.to({ x: right.group.x()-10, duration: duration/2, easing: Konva.Easings.EaseInOut });
  }, (duration/3)*1000);
}

function animateMakeup(left, right, duration) {
  // move close + tiny blush
  left.group.to({ x: left.group.x()+80, duration: duration/2, easing: Konva.Easings.EaseInOut });
  right.group.to({ x: right.group.x()-80, duration: duration/2, easing: Konva.Easings.EaseInOut });
  setTimeout(()=> {
    left.blush.to({ opacity:0.9, duration:0.2 });
    right.blush.to({ opacity:0.9, duration:0.2 });
  }, (duration/2)*1000);
}

function animateCelebrate(left, right, duration) {
  // jump-and-wiggle
  left.group.to({ y: left.group.y()-18, duration: 0.25, easing: Konva.Easings.EaseInOut });
  right.group.to({ y: right.group.y()-18, duration: 0.25, easing: Konva.Easings.EaseInOut });
  setTimeout(()=> {
    left.group.to({ y: left.group.y(), duration: 0.25 });
    right.group.to({ y: right.group.y(), duration: 0.25 });
  }, 300);
}

// main function to play steps sequentially
async function playStoryboard(steps) {
  const w = stage.width(), h = stage.height();
  // ensure actors at default pos
  layer.draw();
  let time = 0;
  for (const step of steps) {
    const dur = Math.max(0.3, step.duration);
    if (step.action === 'enter') {
      // small approach
      moveActor(leftActor, stage.width()*0.4, leftActor.group.y(), dur);
      moveActor(rightActor, stage.width()*0.6, rightActor.group.y(), dur);
    } else if (step.action === 'quarrel') {
      animateQuarrel(leftActor, rightActor, dur);
    } else if (step.action === 'makeup') {
      animateMakeup(leftActor, rightActor, dur);
    } else if (step.action === 'celebrate') {
      animateCelebrate(leftActor, rightActor, dur);
    }
    // wait for duration to pass
    await sleep(dur*1000 + 150);
    layer.draw();
  }
}

// small helpers
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

// Recording: capture stage container -> canvas (via stage.toCanvas)
async function recordAnimation(steps, durationSeconds, w, h) {
  // we will use an offscreen canvas that Konva can render into by using toCanvas()
  // But Konva stage renders into DOM; simpler: capture the stage container element using captureStream if possible
  const canvas = stage.toCanvas();
  const stream = canvas.captureStream(30); // 30 fps
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

  rec.start();
  // play while recording
  await playStoryboard(steps);
  // ensure remaining time to reach durationSeconds
  await sleep(200);
  rec.stop();

  // wait for stop event small promise
  await new Promise(resolve => {
    rec.onstop = () => resolve();
  });

  const blob = new Blob(chunks, { type: 'video/webm' });
  return blob;
}

// UI wiring
document.addEventListener('DOMContentLoaded', () => {
  const promptEl = document.getElementById('prompt');
  const generateBtn = document.getElementById('generateBtn');
  const renderBtn = document.getElementById('renderBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const log = document.getElementById('log');
  const resSel = document.getElementById('resolution');
  const durationInput = document.getElementById('duration');

  let currentSteps = null;
  let lastBlob = null;

  generateBtn.addEventListener('click', () => {
    const prompt = promptEl.value.trim();
    const duration = Number(durationInput.value) || 6;
    currentSteps = promptToStoryboard(prompt || 'small scene', duration);
    log.innerText = 'Storyboard generated: ' + JSON.stringify(currentSteps.map(s=>s.action));
    renderBtn.disabled = false;
    downloadBtn.disabled = true;
  });

  renderBtn.addEventListener('click', async () => {
    if (!currentSteps) {
      log.innerText = 'Generate a storyboard first.';
      return;
    }
    renderBtn.disabled = true;
    generateBtn.disabled = true;
    log.innerText = 'Preparing stage...';

    const { w, h } = parseRes(resSel.value);
    createStage(w, h);

    // center actors positions
    leftActor.group.x(w*0.25);
    rightActor.group.x(w*0.75);
    leftActor.group.y(h*0.72);
    rightActor.group.y(h*0.72);

    layer.draw();

    log.innerText = 'Recording...' ;
    const blob = await recordAnimation(currentSteps, Number(durationInput.value), w, h);
    lastBlob = blob;
    downloadBtn.disabled = false;
    renderBtn.disabled = false;
    generateBtn.disabled = false;
    log.innerText = `Done recording — ${Math.round(blob.size/1024)} KB. Click Download.`;
  });

  downloadBtn.addEventListener('click', () => {
    if (!lastBlob) return;
    const url = URL.createObjectURL(lastBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stickstory.webm';
    a.click();
    URL.revokeObjectURL(url);
  });

});
