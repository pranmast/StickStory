/* app.js - prompt -> storyboard -> play -> record
   Works with stickman-animator.js which provides playStoryboard(steps, options)
*/

const promptEl = document.getElementById('prompt');
const generateBtn = document.getElementById('generateBtn');
const renderBtn = document.getElementById('renderBtn');
const downloadBtn = document.getElementById('downloadBtn');
const log = document.getElementById('log');
const resSel = document.getElementById('resolution');
const durInput = document.getElementById('duration');

let currentStoryboard = null;
let lastBlob = null;

// Keyword groups for mapping
const KEY = {
  walk: ['walk', 'walks', 'walked', 'meet', 'approach', 'coming', 'go to', 'arrive'],
  quarrel: ['quarrel','argue','fight','shout','quarrel','row','disagree','yell'],
  kiss: ['kiss','make out','makeup','smooch','kissed'],
  makeup: ['make up','make-up','reconcile','apologize','forgive'],
  celebrate: ['celebrate','party','dance','blast','cheer','celebration'],
  bench: ['bench','seat','sitting','sit'],
  door: ['door','knock','enter','exit'],
  wink: ['wink','winks','winking'],
  hug: ['hug','embrace'],
  pick: ['pick','pick up','flower','flowers','rose']
};

// utility: whether prompt contains any of patterns
function containsAny(prompt, arr) {
  for (const a of arr) if (prompt.includes(a)) return true;
  return false;
}

// Main parsing: simple heuristic-based natural language parser to storyboard actions
function promptToStoryboard(prompt, totalSec = 8) {
  const s = prompt.toLowerCase();

  const steps = [];
  // step durations approximated; will be normalized
  // always start with an enter (actors approach into stage)
  steps.push({ action: 'enter', duration: Math.max(0.6, totalSec * 0.12) });

  if (containsAny(s, KEY.walk)) {
    // small walk / approach
    steps.push({ action: 'walk', duration: Math.max(0.6, totalSec * 0.14) });
  }

  if (containsAny(s, KEY.quarrel)) {
    steps.push({ action: 'quarrel', duration: Math.max(0.8, totalSec * 0.18) });
    // often followed by make up or kiss, if present in prompt
  }

  if (containsAny(s, KEY.kiss)) {
    steps.push({ action: 'kiss', duration: Math.max(0.6, totalSec * 0.12) });
  } else if (containsAny(s, KEY.makeup)) {
    // show reconciliation without explicit kiss
    steps.push({ action: 'reconcile', duration: Math.max(0.6, totalSec * 0.12) });
  }

  if (containsAny(s, KEY.hug)) {
    steps.push({ action: 'hug', duration: Math.max(0.6, totalSec * 0.12) });
  }

  if (containsAny(s, KEY.wink)) {
    steps.push({ action: 'wink', duration: Math.max(0.4, totalSec * 0.08) });
  }

  if (containsAny(s, KEY.pick)) {
    steps.push({ action: 'pick-flower', duration: Math.max(0.6, totalSec * 0.1) });
  }

  // props-driven actions
  if (containsAny(s, KEY.bench)) {
    steps.push({ action: 'sit-bench', duration: Math.max(0.8, totalSec * 0.12) });
  }
  if (containsAny(s, KEY.door)) {
    steps.push({ action: 'door-interaction', duration: Math.max(0.8, totalSec * 0.12) });
  }

  if (containsAny(s, KEY.celebrate)) {
    steps.push({ action: 'celebrate', duration: Math.max(0.7, totalSec * 0.18) });
  }

  // If parsing produced only enter -> fallback to small generic storyline
  if (steps.length <= 1) {
    // build a mini arc
    steps.push({ action: 'walk', duration: totalSec * 0.16 });
    steps.push({ action: 'quarrel', duration: totalSec * 0.18 });
    steps.push({ action: 'kiss', duration: totalSec * 0.12 });
    steps.push({ action: 'celebrate', duration: totalSec * 0.2 });
  }

  // Normalize durations to fit totalSec
  const sum = steps.reduce((a,b)=>a+b.duration,0);
  const scale = totalSec / Math.max(sum, totalSec);
  steps.forEach(s => s.duration = +(s.duration * scale).toFixed(2));

  // attach some metadata: actors & props parsed
  const plan = {
    steps,
    meta: {
      props: {
        bench: containsAny(s, KEY.bench),
        door: containsAny(s, KEY.door),
        flower: containsAny(s, KEY.pick)
      }
    }
  };

  return plan;
}

// UI wiring
generateBtn.addEventListener('click', () => {
  const prompt = promptEl.value.trim();
  if (!prompt) { log.textContent = 'Please enter a prompt.'; return; }
  const duration = Number(durInput.value) || 8;
  currentStoryboard = promptToStoryboard(prompt, duration);
  log.textContent = 'Storyboard: ' + currentStoryboard.steps.map(s=>s.action).join(' → ');
  renderBtn.disabled = false;
  downloadBtn.disabled = true;
  lastBlob = null;
});

renderBtn.addEventListener('click', async () => {
  if (!currentStoryboard) { log.textContent = 'Generate storyboard first.'; return; }
  renderBtn.disabled = true;
  generateBtn.disabled = true;
  log.textContent = 'Preparing...';

  // resolution
  const res = resSel.value.split('x').map(Number);
  const width = res[0], height = res[1];

  // start stage + animator
  await startAnimatorAndRecord(currentStoryboard, { width, height });
  renderBtn.disabled = false;
  generateBtn.disabled = false;
  downloadBtn.disabled = lastBlob ? false : true;
});

downloadBtn.addEventListener('click', () => {
  if (!lastBlob) return;
  const url = URL.createObjectURL(lastBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stickstory.mp4';
  a.click();
  URL.revokeObjectURL(url);
});

// startAnimatorAndRecord uses functions from stickman-animator.js
async function startAnimatorAndRecord(plan, size) {
  log.textContent = 'Rendering & recording...';

  // set canvas size
  const canvas = document.getElementById('scene');
  canvas.width = size.width;
  canvas.height = size.height;

  // play + capture using stickman-animator helper
  // returns a Blob (mp4/webm) when done
  try {
    const blob = await playAndRecord(plan, size, (p)=>{ log.textContent = p; });
    lastBlob = blob;
    log.textContent = `Recording done — size ${Math.round(blob.size/1024)} KB`;
    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    log.textContent = 'Recording failed: ' + err.message;
  }
}
