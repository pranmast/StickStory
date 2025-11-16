async function createAnimation() {
    const prompt = document.getElementById("prompt").value;
    if (!prompt.trim()) return alert("Enter a story!");

    // --- 1. Convert story → stickman script ---
    const animationPlan = await generateStickmanScript(prompt);

    // --- 2. Run animator ---
    runStickmanAnimation(animationPlan);
}

// mock AI to show system working — you can plug in LLM later
async function generateStickmanScript(text) {
    return [
        { a: {x:100, y:350}, b: {x:800, y:350}, action:"walk-towards" },
        { a: {x:300, y:350}, b: {x:600, y:350}, action:"argue" },
        { a: {x:450, y:350}, b: {x:450, y:350}, action:"kiss" }
    ];
}

function exportMP4() {
    startMP4Capture();
}
