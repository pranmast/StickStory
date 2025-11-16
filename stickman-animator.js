let ctx = null;
let canvas = null;
let frames = [];
let capturing = false;
let capturer = null;

window.onload = () => {
    canvas = document.getElementById("scene");
    ctx = canvas.getContext("2d");
};

function drawStickman(x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;

    // head
    ctx.beginPath();
    ctx.arc(x, y - 50, 20, 0, Math.PI * 2);
    ctx.stroke();

    // body
    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x, y + 50);
    ctx.stroke();

    // arms
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(x + 30, y);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x - 25, y + 110);
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x + 25, y + 110);
    ctx.stroke();
}

async function runStickmanAnimation(plan) {
    let Acolor = document.getElementById("charAcolor").value;
    let Bcolor = document.getElementById("charBcolor").value;

    frames = []; // reset

    let index = 0;
    const interval = setInterval(() => {
        if (index >= plan.length) {
            clearInterval(interval);
            if (capturing) capturer.stop();
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let step = plan[index];
        drawStickman(step.a.x, step.a.y, Acolor);
        drawStickman(step.b.x, step.b.y, Bcolor);

        if (capturing) capturer.capture(canvas);

        index++;
    }, 500);
}
