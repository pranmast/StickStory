/* stickman-animator.js
   Provides: playAndRecord(plan, size, statusCallback) -> Blob
   Renders into <canvas id="scene"> element.
*/

function drawStick(ctx, x, y, color = '#000', options = {}) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y - 50, 18, 0, Math.PI*2); // head
  ctx.stroke();
  ctx.beginPath(); // body
  ctx.moveTo(x, y - 32);
  ctx.lineTo(x, y + 30);
  ctx.stroke();
  ctx.beginPath(); // arms
  ctx.moveTo(x - 26, y - 6);
  ctx.lineTo(x + 26, y - 6);
  ctx.stroke();
  ctx.beginPath(); // legs
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x - 20, y + 80);
  ctx.moveTo(x, y + 30);
  ctx.lineTo(x + 20, y + 80);
  ctx.stroke();
  // blush if requested
  if (options.blush) {
    ctx.fillStyle = 'rgba(255,100,100,0.6)';
    ctx.beginPath(); ctx.arc(x+10, y-56, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x-10, y-56, 4, 0, Math.PI*2); ctx.fill();
  }
}

// helper to render a frame state
function renderFrame(ctx, state, props) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  // clear
  ctx.clearRect(0,0,w,h);
  // background
  ctx.fillStyle = '#f7f7f7';
  ctx.fillRect(0,0,w,h);

  // ground line
  ctx.strokeStyle='#ddd'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0, h*0.8); ctx.lineTo(w, h*0.8); ctx.stroke();

  // props: bench
  if (props && props.bench) {
    ctx.fillStyle = '#c79b6b';
    const bx = w*0.55, by = h*0.8 - 18;
    ctx.fillRect(bx-60, by, 140, 12);
    // legs
    ctx.fillRect(bx-50, by+12, 8, 18);
    ctx.fillRect(bx+30, by+12, 8, 18);
  }

  // draw A and B
  drawStick(ctx, state.ax, state.ay, state.colorA, { blush: state.blushA });
  drawStick(ctx, state.bx, state.by, state.colorB, { blush: state.blushB });

  // small text debug (optional)
  // ctx.fillStyle = '#444'; ctx.fillText(state.note||'', 10, 20);
}

// helper to sleep
function sleep(ms) { return new Promise(r=>setTimeout(r, ms)); }

// playAndRecord: high-level flow
async function playAndRecord(plan, size, statusCallback = ()=>{}) {
  // get canvas
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  // set sizes
  canvas.width = size.width;
  canvas.height = size.height;

  // initial actor positions
  let state = {
    ax: size.width * 0.2, ay: size.height * 0.72,
    bx: size.width * 0.8, by: size.height * 0.72,
    colorA: '#0077ff', colorB: '#ff3366',
    blushA: false, blushB: false,
    note: ''
  };

  // create MediaRecorder from canvas capture stream
  const stream = canvas.captureStream(30); // 30fps
  const mime = 'video/webm;codecs=vp9';
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const data = [];
  rec.ondataavailable = ev => { if (ev.data && ev.data.size) data.push(ev.data); };

  rec.start(100); // timeslice

  // iterate plan steps; each step has action & duration (sec)
  statusCallback('Playing animation...');
  for (const step of plan.steps) {
    statusCallback('Action: ' + step.action);
    if (step.action === 'enter' || step.action === 'walk') {
      // both move closer smoothly
      const frames = Math.max(8, Math.round(step.duration * 30));
      const targetAx = size.width * 0.4;
      const targetBx = size.width * 0.6;
      for (let f=0; f<frames; f++) {
        const t = (f+1)/frames;
        state.ax = lerp(state.ax, targetAx, 0.15);
        state.bx = lerp(state.bx, targetBx, 0.15);
        renderFrame(ctx, state, plan.meta.props);
        await sleep(1000/30);
      }
    } else if (step.action === 'quarrel') {
      // jitter back and forth
      const repeats = Math.max(6, Math.round(step.duration * 6));
      for (let i=0;i<repeats;i++) {
        state.ax -= 12; state.bx += 12; renderFrame(ctx,state,plan.meta.props); await sleep(80);
        state.ax += 20; state.bx -= 20; renderFrame(ctx,state,plan.meta.props); await sleep(80);
      }
    } else if (step.action === 'kiss' || step.action === 'makeup' || step.action === 'reconcile') {
      // come close and blush
      const frames = Math.max(10, Math.round(step.duration * 30));
      for (let f=0; f<frames; f++) {
        state.ax = lerp(state.ax, size.width*0.48, 0.12);
        state.bx = lerp(state.bx, size.width*0.52, 0.12);
        if (f > frames*0.6) { state.blushA = true; state.blushB = true; }
        renderFrame(ctx,state,plan.meta.props);
        await sleep(1000/30);
      }
    } else if (step.action === 'hug') {
      // close + small rotate effect simulation (blush)
      for (let f=0; f<30; f++) {
        state.ax = lerp(state.ax, size.width*0.46, 0.08);
        state.bx = lerp(state.bx, size.width*0.54, 0.08);
        state.blushA = state.blushB = (f%6>2);
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
    } else if (step.action === 'pick-flower') {
      // B picks a flower: small animation of hand indicated by blush and prop
      // simulate a small bend (move down/up)
      const origBy = state.by;
      for (let f=0; f<24; f++) {
        state.by = origBy + (f<12 ? 6 : -6);
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
    } else if (step.action === 'sit-bench') {
      // actors move to bench pos
      const benchX = size.width*0.55 - 20;
      const frames = Math.max(12, Math.round(step.duration * 30));
      for (let f=0; f<frames; f++) {
        state.ax = lerp(state.ax, benchX - 30, 0.12);
        state.bx = lerp(state.bx, benchX + 30, 0.12);
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
    } else if (step.action === 'celebrate') {
      // jump and wave (wiggle)
      for (let f=0; f<Math.round(step.duration*30); f++) {
        state.ay = size.height*0.72 + ( (f%12<6) ? -14 : 0 );
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
      state.ay = size.height*0.72;
    } else if (step.action === 'door-interaction') {
      // simulate door: actor A moves to left, actor B stands by door, small knock (visual not too complex)
      const frames = Math.round(step.duration * 30);
      for (let f=0; f<frames; f++) {
        state.ax = lerp(state.ax, size.width*0.35, 0.08);
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
    } else if (step.action === 'wink') {
      // simulate a wink by small head tilt / quick blush
      for (let f=0; f<12; f++) {
        state.blushA = (f%12>6);
        renderFrame(ctx,state,plan.meta.props); await sleep(1000/30);
      }
      state.blushA = false;
    } else {
      // default standby - render some frames
      const frames = Math.round(step.duration * 30);
      for (let f=0; f<frames; f++) { renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    }

    // small pause between steps
    for (let p=0;p<6;p++) { renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    // reset blush
    state.blushA = state.blushB = false;
  }

  // stop recorder
  const stopPromise = new Promise(resolve => {
    setTimeout(()=>{ resolve(); }, 200); // tiny wait to ensure capture pushed
  });

  // Collect recorded chunks and return a Blob
  // MediaRecorder used earlier; we need to stop it and collect data
  // However inside this function we didn't create the MediaRecorder object globally.
  // To simplify: use canvas.captureStream and MediaRecorder here:

  // Create new recording (we must re-record the exact frames? No - better approach:)
  // Simpler: Use CCapture for full fidelity; but CCapture requires animation loop.
  // For compatibility: we will record via MediaRecorder from canvas.captureStream
  // Note: to capture the frames we already drew, we must have been capturing while drawing.
  // So the simplest practical approach: start MediaRecorder at beginning, which we did above.
  // To keep modularity, we will do new recording approach: re-run the animation while capturing.
  // For simplicity in this implementation, we will re-run the same plan but capture into a fresh MediaRecorder:

  // Re-run animation while capturing into MediaRecorder and push data -> This is manageable but duplicates CPU work.
  // Implementation below does rerun but captures.

  // Rerun capture: (create new stream from an offscreen canvas)
  const captureCanvas = canvas;
  const stream = captureCanvas.captureStream(30);
  const mimeType = 'video/webm;codecs=vp9';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
  recorder.start();

  // re-run the plan quickly to capture final video (same animation)
  // We'll replay action sequence once more (faster), replicating the same operations:
  // For reliability, we should ideally do the capture in the first run, but here we'll re-run the sequence:

  // Re-initialize state for capture-run
  state = {
    ax: size.width * 0.2, ay: size.height * 0.72,
    bx: size.width * 0.8, by: size.height * 0.72,
    colorA: '#0077ff', colorB: '#ff3366',
    blushA: false, blushB: false,
    note: ''
  };

  // replay loop (synchronous with earlier logic)
  for (const step of plan.steps) {
    if (step.action === 'enter' || step.action === 'walk') {
      const frames = Math.max(8, Math.round(step.duration * 30));
      const targetAx = size.width * 0.4;
      const targetBx = size.width * 0.6;
      for (let f=0; f<frames; f++) { state.ax = lerp(state.ax, targetAx, 0.15); state.bx = lerp(state.bx, targetBx, 0.15); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'quarrel') {
      for (let i=0;i<Math.max(6, Math.round(step.duration * 6));i++){ state.ax-=12;state.bx+=12; renderFrame(ctx,state,plan.meta.props); await sleep(80); state.ax+=20;state.bx-=20; renderFrame(ctx,state,plan.meta.props); await sleep(80); }
    } else if (step.action === 'kiss' || step.action === 'makeup' || step.action === 'reconcile') {
      const frames = Math.max(10, Math.round(step.duration * 30));
      for (let f=0; f<frames; f++){ state.ax = lerp(state.ax, size.width*0.48, 0.12); state.bx = lerp(state.bx, size.width*0.52, 0.12); if (f>frames*0.6){ state.blushA=true; state.blushB=true; } renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'hug') {
      for (let f=0; f<30; f++){ state.ax = lerp(state.ax, size.width*0.46, 0.08); state.bx = lerp(state.bx, size.width*0.54, 0.08); state.blushA = state.blushB = (f%6>2); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'pick-flower') {
      const origBy = state.by;
      for (let f=0; f<24; f++){ state.by = origBy + (f<12 ? 6 : -6); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'sit-bench') {
      const benchX = size.width*0.55 - 20;
      const frames = Math.max(12, Math.round(step.duration * 30));
      for (let f=0; f<frames; f++){ state.ax = lerp(state.ax, benchX - 30, 0.12); state.bx = lerp(state.bx, benchX + 30, 0.12); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'celebrate') {
      for (let f=0; f<Math.round(step.duration*30); f++){ state.ay = size.height*0.72 + ( (f%12<6) ? -14 : 0 ); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); } state.ay = size.height*0.72;
    } else if (step.action === 'door-interaction') {
      const frames = Math.round(step.duration * 30); for (let f=0; f<frames; f++){ state.ax = lerp(state.ax, size.width*0.35, 0.08); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    } else if (step.action === 'wink') {
      for (let f=0; f<12; f++){ state.blushA = (f%12>6); renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); } state.blushA=false;
    } else {
      const frames = Math.round(step.duration * 30);
      for (let f=0; f<frames; f++){ renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    }
    for (let p=0;p<6;p++){ renderFrame(ctx,state,plan.meta.props); await sleep(1000/30); }
    state.blushA = state.blushB = false;
  }

  // stop recorder
  recorder.stop();

  // wait for data
  await new Promise(resolve => setTimeout(resolve, 300));
  const blob = new Blob(chunks, { type: 'video/webm' });
  // optionally convert or return webm. we'll return the webm blob.
  return blob;
}

// linear interpolate
function lerp(a,b,t){ return a + (b-a)*t; }
