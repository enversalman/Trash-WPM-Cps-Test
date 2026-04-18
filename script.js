// Shared state & Utils
let activeMode = 'cps'; // 'cps' or 'wpm'

const btnModeCps = document.getElementById('btn-mode-cps');
const btnModeWpm = document.getElementById('btn-mode-wpm');
const modeCpsSection = document.getElementById('mode-cps');
const modeWpmSection = document.getElementById('mode-wpm');

// Mode switching
function switchMode(mode) {
    if (activeMode === mode) return;
    activeMode = mode;

    if (mode === 'cps') {
        btnModeCps.classList.add('active');
        btnModeWpm.classList.remove('active');
        modeCpsSection.classList.add('active');
        modeWpmSection.classList.remove('active');
        modeCpsSection.classList.remove('hidden');
        modeWpmSection.classList.add('hidden');
        // Reset WPM if running
        resetWpm();
    } else {
        btnModeWpm.classList.add('active');
        btnModeCps.classList.remove('active');
        modeWpmSection.classList.add('active');
        modeCpsSection.classList.remove('active');
        modeWpmSection.classList.remove('hidden');
        modeCpsSection.classList.add('hidden');
        // Reset CPS if running
        resetCps();
    }
}

btnModeCps.addEventListener('click', () => switchMode('cps'));
btnModeWpm.addEventListener('click', () => switchMode('wpm'));

// --- Canvas Graphing Utility ---
class NeonGraph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = []; // array of {t: elapsed_s, v: value}
        this.maxX = 10; // Default max X
        this.maxY = 20; // Default max Y
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 2; // padding
        this.canvas.height = 200;
        this.draw();
    }

    clear() {
        this.data = [];
        this.draw();
    }

    addData(t, v) {
        this.data.push({ t, v });
        this.draw();
    }

    setMaxX(x) { this.maxX = x; }
    setMaxY(y) { this.maxY = Math.max(y, 10); }

    draw() {
        const { width, height } = this.canvas;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        ctx.stroke();

        // Draw data line
        if (this.data.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff88';
        ctx.lineJoin = 'round';

        this.data.forEach((point, index) => {
            const px = (point.t / this.maxX) * width;
            const py = height - (point.v / this.maxY) * height;
            
            if (index === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        });

        ctx.stroke();
        
        // Reset shadow for next draws
        ctx.shadowBlur = 0;
    }
}

const cpsGraph = new NeonGraph('cps-canvas');
const wpmGraph = new NeonGraph('wpm-canvas');

// --- MODE 1: CPS Tester ---
let cpsDuration = 5;
let cpsIsRunning = false;
let cpsStartTime = 0;
let cpsPresses = []; // Timestamps of presses
let cpsPeak = 0;
let cpsInterval;
let cpsLastDrawTime = 0;

const cpsPad = document.getElementById('cps-pad');
const cpsPadSubtext = cpsPad.querySelector('.pad-subtext');
const elCpsTime = document.getElementById('cps-time');
const elCpsCurrent = document.getElementById('cps-current');
const elCpsPeak = document.getElementById('cps-peak');
const elCpsTotal = document.getElementById('cps-total');
const btnCpsStart = document.getElementById('cps-start-btn');
const btnCpsReset = document.getElementById('cps-reset-btn');
const cpsSummary = document.getElementById('cps-summary');

// Setup Duration buttons
document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (cpsIsRunning) return;
        document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        cpsDuration = parseInt(e.target.dataset.time);
        elCpsTime.innerText = cpsDuration.toFixed(1) + 's';
        cpsGraph.setMaxX(cpsDuration);
        cpsGraph.draw();
    });
});

function initCps() {
    cpsIsRunning = true;
    cpsStartTime = performance.now();
    cpsPresses = [];
    cpsPeak = 0;
    cpsLastDrawTime = 0;
    
    cpsGraph.clear();
    cpsGraph.setMaxX(cpsDuration);
    cpsGraph.setMaxY(15); // Start with 15 max CPS

    elCpsTotal.innerText = '0';
    elCpsPeak.innerText = '0.00';
    elCpsCurrent.innerText = '0.00';
    elCpsTime.innerText = cpsDuration.toFixed(1) + 's';
    
    cpsPad.classList.add('active');
    cpsPadSubtext.innerText = 'MASH SPACEBAR OR CLICK!';
    btnCpsStart.disabled = true;

    // Start tick loop
    cpsInterval = requestAnimationFrame(tickCps);
}

function resetCps() {
    cpsIsRunning = false;
    cancelAnimationFrame(cpsInterval);
    cpsPresses = [];
    
    elCpsTime.innerText = cpsDuration.toFixed(1) + 's';
    elCpsCurrent.innerText = '0.00';
    elCpsPeak.innerText = '0.00';
    elCpsTotal.innerText = '0';
    
    cpsPad.classList.remove('active');
    cpsPadSubtext.innerText = 'Waiting for initialization...';
    btnCpsStart.disabled = false;
    cpsGraph.clear();
    cpsSummary.classList.add('hidden');
}

function registerCpsPress() {
    if (!cpsIsRunning) return;
    const now = performance.now();
    cpsPresses.push(now);
    elCpsTotal.innerText = cpsPresses.length;
    
    // Add brief active effect to pad
    cpsPad.style.backgroundColor = 'var(--neon-green-dim)';
    setTimeout(() => {
        if (cpsIsRunning) cpsPad.style.backgroundColor = '';
    }, 50);
}

// Global keydown
document.addEventListener('keydown', (e) => {
    if (activeMode === 'cps' && e.code === 'Space') {
        e.preventDefault(); // prevent scrolling
        if (!cpsIsRunning && document.activeElement !== btnCpsStart && document.activeElement !== btnCpsReset) {
            initCps();
        }
        if (e.repeat) return; // ignore auto-repeat
        registerCpsPress();
    }
});

cpsPad.addEventListener('mousedown', (e) => {
    if (!cpsIsRunning) initCps();
    registerCpsPress();
});
// Handle touch for mobile
cpsPad.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!cpsIsRunning) initCps();
    registerCpsPress();
});

function tickCps() {
    if (!cpsIsRunning) return;
    const now = performance.now();
    const elapsed = (now - cpsStartTime) / 1000;
    
    if (elapsed >= cpsDuration) {
        endCps();
        return;
    }

    elCpsTime.innerText = (cpsDuration - elapsed).toFixed(1) + 's';

    // Calculate rolling 1-second CPS
    const oneSecAgo = now - 1000;
    let countInLastSec = 0;
    // Iterate backwards
    for (let i = cpsPresses.length - 1; i >= 0; i--) {
        if (cpsPresses[i] >= oneSecAgo) {
            countInLastSec++;
        } else {
            break;
        }
    }

    // Determine current CPS rate (handle first second smoothly by dividing by elapsed time if < 1s)
    let currentCps = 0;
    if (elapsed < 1 && elapsed > 0) {
        currentCps = cpsPresses.length / elapsed;
    } else {
        currentCps = countInLastSec;
    }

    if (currentCps > cpsPeak) {
        cpsPeak = currentCps;
        cpsGraph.setMaxY(cpsPeak + 2); // Dynamic Y axis
    }

    elCpsCurrent.innerText = currentCps.toFixed(2);
    elCpsPeak.innerText = cpsPeak.toFixed(2);

    // Update graph 10 times a second
    if (elapsed - cpsLastDrawTime > 0.1) {
        cpsGraph.addData(elapsed, currentCps);
        cpsLastDrawTime = elapsed;
    }

    cpsInterval = requestAnimationFrame(tickCps);
}

function endCps() {
    cpsIsRunning = false;
    cancelAnimationFrame(cpsInterval);
    cpsPad.classList.remove('active');
    cpsPadSubtext.innerText = 'Test complete.';
    elCpsTime.innerText = '0.0s';
    
    // Calculate overall average
    const avgCps = cpsPresses.length / cpsDuration;
    
    document.getElementById('summary-cps-avg').innerText = avgCps.toFixed(2);
    document.getElementById('summary-cps-peak').innerText = cpsPeak.toFixed(2);
    document.getElementById('summary-cps-total').innerText = cpsPresses.length;
    
    cpsSummary.classList.remove('hidden');
    btnCpsStart.disabled = false;
}

btnCpsStart.addEventListener('click', initCps);
btnCpsReset.addEventListener('click', resetCps);


// --- MODE 2: WPM Typing Tester ---

const passages = [
    "The neural pathways hummed with digital energy.",
    "Cybernetic enhancements have revolutionized labor.",
    "Quantum cryptography ensures absolute data security.",
    "The neon-lit streets are slick with synthetic rain.",
    "A rogue algorithm breached the mainframe.",
    "Space exploration shifted to corporate extraction."
];

let wpmIsRunning = false;
let wpmStartTime = 0;
let wpmInterval;
let wpmLastDrawTime = 0;
const wpmMaxTime = 60; // 60s max
let currentPassage = "";
let currentTyped = [];

const elWpmTime = document.getElementById('wpm-time');
const elWpmCurrent = document.getElementById('wpm-current');
const elWpmAccuracy = document.getElementById('wpm-accuracy');
const elWpmCpm = document.getElementById('wpm-cpm');
const wpmTextDisplay = document.getElementById('wpm-text-display');
const btnWpmStart = document.getElementById('wpm-start-btn');
const btnWpmReset = document.getElementById('wpm-reset-btn');
const wpmSummary = document.getElementById('wpm-summary');
const wpmHiddenInput = document.getElementById('wpm-hidden-input');

function initWpm() {
    wpmIsRunning = true;
    wpmStartTime = performance.now();
    wpmLastDrawTime = 0;
    currentTyped = [];
    
    // Select random passage
    currentPassage = passages[Math.floor(Math.random() * passages.length)];
    
    // Render spans
    wpmTextDisplay.innerHTML = '';
    for (let i = 0; i < currentPassage.length; i++) {
        const span = document.createElement('span');
        span.innerText = currentPassage[i];
        span.classList.add('char');
        if (i === 0) span.classList.add('cursor');
        wpmTextDisplay.appendChild(span);
    }

    wpmGraph.clear();
    wpmGraph.setMaxX(wpmMaxTime);
    wpmGraph.setMaxY(100);

    elWpmTime.innerText = wpmMaxTime.toFixed(1) + 's';
    elWpmCurrent.innerText = '0';
    elWpmAccuracy.innerText = '100%';
    elWpmCpm.innerText = '0';
    
    btnWpmStart.disabled = true;
    wpmSummary.classList.add('hidden');
    wpmHiddenInput.focus();

    wpmInterval = requestAnimationFrame(tickWpm);
}

function resetWpm() {
    wpmIsRunning = false;
    cancelAnimationFrame(wpmInterval);
    elWpmTime.innerText = wpmMaxTime.toFixed(1) + 's';
    wpmTextDisplay.innerHTML = 'Press INITIALIZE to load sequence...';
    btnWpmStart.disabled = false;
    wpmSummary.classList.add('hidden');
    wpmGraph.clear();
}

function updateTypingDisplay() {
    const spans = wpmTextDisplay.querySelectorAll('.char');
    let correctCount = 0;

    spans.forEach((span, index) => {
        span.className = 'char'; // reset
        if (index < currentTyped.length) {
            if (currentTyped[index] === currentPassage[index]) {
                span.classList.add('correct');
                correctCount++;
            } else {
                span.classList.add('incorrect');
            }
        }
        if (index === currentTyped.length) {
            span.classList.add('cursor');
        }
    });

    return correctCount;
}

// Typing listener
document.addEventListener('keydown', (e) => {
    if (activeMode !== 'wpm' || !wpmIsRunning) return;

    // Handle ignore keys (Shift, Ctrl, Alt, Meta, CapsLock, Tab, etc)
    if (e.key.length > 1 && e.key !== 'Backspace') return;

    if (e.key === 'Backspace') {
        currentTyped.pop();
    } else {
        // Prevent default space scrolling
        if (e.code === 'Space') e.preventDefault();
        
        // Prevent going beyond length
        if (currentTyped.length < currentPassage.length) {
            currentTyped.push(e.key);
        }
    }

    const correctCount = updateTypingDisplay();
    
    // Check for completion
    if (currentTyped.length === currentPassage.length) {
        // Did they get it all right?
        if (correctCount === currentPassage.length) {
            endWpm();
        }
    }
});

function tickWpm() {
    if (!wpmIsRunning) return;
    const now = performance.now();
    const elapsed = (now - wpmStartTime) / 1000;
    const elapsedMins = elapsed / 60;
    
    if (elapsed >= wpmMaxTime) {
        endWpm();
        return;
    }

    elWpmTime.innerText = (wpmMaxTime - elapsed).toFixed(1) + 's';

    const correctCount = updateTypingDisplay();
    const accuracy = currentTyped.length > 0 ? (correctCount / currentTyped.length) * 100 : 100;
    
    // WPM formula: (characters / 5) / elapsed_minutes
    // Using correct characters for strict WPM
    let wpm = 0;
    let cpm = 0;
    if (elapsedMins > 0) {
        cpm = Math.round(correctCount / elapsedMins);
        wpm = Math.round(cpm / 5);
    }

    elWpmCurrent.innerText = wpm;
    elWpmCpm.innerText = cpm;
    elWpmAccuracy.innerText = accuracy.toFixed(1) + '%';

    if (wpm > wpmGraph.maxY) {
        wpmGraph.setMaxY(wpm + 20);
    }

    if (elapsed - wpmLastDrawTime > 0.5) { // update graph every 0.5s to be smoother
        wpmGraph.addData(elapsed, wpm);
        wpmLastDrawTime = elapsed;
    }

    wpmInterval = requestAnimationFrame(tickWpm);
}

function endWpm() {
    wpmIsRunning = false;
    cancelAnimationFrame(wpmInterval);
    btnWpmStart.disabled = false;

    const elapsed = (performance.now() - wpmStartTime) / 1000;
    const elapsedMins = elapsed / 60;
    const correctCount = updateTypingDisplay();
    
    const accuracy = currentTyped.length > 0 ? (correctCount / currentTyped.length) * 100 : 100;
    let wpm = 0;
    if (elapsedMins > 0) {
        wpm = Math.round((correctCount / 5) / elapsedMins);
    }

    // Determine Grade
    let grade = 'D';
    if (wpm >= 100 && accuracy >= 95) grade = 'S';
    else if (wpm >= 80 && accuracy >= 90) grade = 'A';
    else if (wpm >= 60 && accuracy >= 85) grade = 'B';
    else if (wpm >= 40) grade = 'C';
    
    const gradeEl = document.getElementById('wpm-grade');
    gradeEl.innerText = grade;
    
    // Grade styling colors
    if (grade === 'S') gradeEl.style.color = '#ffaa00'; // Gold
    else if (grade === 'A') gradeEl.style.color = '#00ff88';
    else if (grade === 'B') gradeEl.style.color = '#00aaff';
    else if (grade === 'C') gradeEl.style.color = '#aaaaaa';
    else gradeEl.style.color = '#ff003c';

    document.getElementById('summary-wpm-final').innerText = wpm;
    document.getElementById('summary-wpm-accuracy').innerText = accuracy.toFixed(1) + '%';

    wpmSummary.classList.remove('hidden');
}

btnWpmStart.addEventListener('click', initWpm);
btnWpmReset.addEventListener('click', resetWpm);

// Close Modals
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.add('hidden');
    });
});

// Focus helper for typing area
wpmTextDisplay.addEventListener('click', () => {
    if (wpmIsRunning) wpmHiddenInput.focus();
});
