// ----------------------
// GLOBALS
// ----------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let animationFrames = [];
let recorderFrames = [];
let currentFrame = 0;
let recording = false;

// ----------------------
// MAIN EXPORT FUNCTION
// ----------------------
function playAndRecord() {
    if (animationFrames.length === 0) {
        alert("Generate an animation first!");
        return;
    }

    recording = true;
    recorderFrames = [];

    currentFrame = 0;
    playFrames();
}

// ----------------------
// DRAW STICKMAN
// ----------------------
function drawStickman(x, y) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;

    // head
    ctx.beginPath();
    ctx.arc(x, y - 30, 15, 0, Math.PI * 2);
    ctx.stroke();

    // body
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 40);
    ctx.stroke();

    // arms
    ctx.beginPath();
    ctx.moveTo(x - 30, y + 5);
    ctx.lineTo(x + 30, y + 5);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x - 25, y + 80);
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x + 25, y + 80);
    ctx.stroke();
}

// ----------------------
// PROMPT → ACTIONS
// ----------------------
function interpretPrompt(prompt) {
    prompt = prompt.toLowerCase();

    if (prompt.includes("kiss")) {
        return kissScene();
    }
    if (prompt.includes("fight") || prompt.includes("quarrel")) {
        return quarrelScene();
    }

    return idleScene();
}

// ----------------------
// SCENES (FRAME ARRAYS)
// ----------------------
function kissScene() {
    let frames = [];
    for (let i = 0; i < 60; i++) {
        frames.push({ a: 200 + i, b: 300 - i }); // moving toward each other
    }
    return frames;
}

function quarrelScene() {
    let frames = [];
    for (let i = 0; i < 60; i++) {
        frames.push({ a: 220, b: 280, shake: i % 10 < 5 });
    }
    return frames;
}

function idleScene() {
    return [{ a: 200, b: 300 }];
}

// ----------------------
// ANIMATION PLAYER
// ----------------------
function playFrames() {
    if (currentFrame >= animationFrames.length) {
        if (recording) exportVideo();
        recording = false;
        return;
    }

    const frame = animationFrames[currentFrame];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStickman(frame.a, 250);
    drawStickman(frame.b, 250);

    if (recording) {
        recorderFrames.push(canvas.toDataURL("image/webp", 0.9));
    }

    currentFrame++;
    requestAnimationFrame(playFrames);
}

// ----------------------
// START ANIMATION
// ----------------------
function startAnimation() {
    const prompt = document.getElementById("prompt").value;
    animationFrames = interpretPrompt(prompt);
    currentFrame = 0;
    playFrames();
}

// ----------------------
// EXPORT MP4
// ----------------------
function exportVideo() {
    const whammy = new Whammy.Video(30);

    recorderFrames.forEach(f => whammy.add(f));

    const webmBlob = whammy.compile();

    const file = new Blob([webmBlob], { type: "video/webm" });
    const url = URL.createObjectURL(file);

    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.webm";
    a.click();

    alert("Exported animation!");
}
