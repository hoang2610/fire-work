// Request Animation Frame shim (optimized)
const requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Basic setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let cw = window.innerWidth;
let ch = window.innerHeight;
const fireworks = [];
const particles = [];
let hue = 120;
const limiterTotal = 5;
let limiterTick = 0;

let timerTick = 0;
let mousedown = false;
let paused = true;
let mx, my;
const background = new Image();
background.src = 'https://i.redd.it/w6xk1vhor8ae1.jpeg';

// Set initial canvas dimensions
canvas.width = cw;
canvas.height = ch;

// Cache canvas offset
let canvasOffsetX = canvas.offsetLeft;
let canvasOffsetY = canvas.offsetTop;

// Audio setup with Web Audio API (optimized)
let audioContext;
let audioBuffers = {};
let isAudioInitialized = false;

// Audio pool configuration
const CLUSTER_POOL_SIZE = 20;
const clusterSourcePool = []; // Start with an empty array
let currentClusterIndex = 0;
let lastClusterTime = 0;

// Initialize audio system (optimized)
async function initAudio() {
    if (audioContext) return; // Already initialized

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const audioFiles = {
        launch: './Media/launch.mp3',
        explosion: './Media/explode.mp3',
        cluster: './Media/cluster.mp3'
    };

    try {
        const audioBuffersArray = await Promise.all(
            Object.entries(audioFiles).map(async ([key, url]) => {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                return [key, audioBuffer];
            })
        );

        audioBuffers = Object.fromEntries(audioBuffersArray);
        isAudioInitialized = true;
    } catch (error) {
        console.error('Error initializing audio:', error);
    }
}

// Play sound function using Web Audio API (optimized)
function playSound(type, volume = 0.5) {
    if (!isAudioInitialized || !audioContext || audioContext.state !== 'running') return;

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.buffer = audioBuffers[type];
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    source.start(0);

    source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
    };

    return { source, gainNode };
}

// Play cluster sound with delay (optimized)
function playClusterSound() {
    if (!isAudioInitialized) return;

    const now = audioContext.currentTime;
    if (now - lastClusterTime >= 0.05) { // 50ms delay
        const { source } = playSound('cluster', 0.3);

        // Add source to the pool if there's space
        if (clusterSourcePool.length < CLUSTER_POOL_SIZE) {
            clusterSourcePool.push(source);
        } else {
            // Reuse an existing source from the pool
            clusterSourcePool[currentClusterIndex] = source;
        }

        currentClusterIndex = (currentClusterIndex + 1) % CLUSTER_POOL_SIZE;
        lastClusterTime = now;
    }
}

// Handle first interaction
function handleFirstInteraction() {
    initAudio().then(() => {
        audioContext.resume();
    });

    ['click', 'touchstart', 'keydown'].forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
    });
}

// Add first interaction listeners
['click', 'touchstart', 'keydown'].forEach(event => {
    document.addEventListener(event, handleFirstInteraction);
});

// Utility functions
function random(min, max) {
    return Math.random() * (max - min) + min;
}

function calculateDistance(p1x, p1y, p2x, p2y) {
    const xDistance = p1x - p2x;
    const yDistance = p1y - p2y;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// Firework class
function Firework(sx, sy, tx, ty) {
    this.x = sx;
    this.y = sy;
    this.sx = sx;
    this.sy = sy;
    this.tx = tx;
    this.ty = ty;
    this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
    this.distanceTraveled = 0;
    this.coordinates = [];
    this.coordinateCount = 3;

    while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
    }

    this.angle = Math.atan2(ty - sy, tx - sx);
    this.speed = 2;
    this.acceleration = 1.05;
    this.brightness = random(50, 70);
    if (Math.random() >= 0.7) {
        playSound('launch', 0.5);
    }

}

// Update firework (optimized)
Firework.prototype.update = function (index) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);

    this.speed *= this.acceleration;

    // Pre-calculate cos and sin
    const cosAngle = Math.cos(this.angle);
    const sinAngle = Math.sin(this.angle);

    const vx = cosAngle * this.speed;
    const vy = sinAngle * this.speed;

    this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

    if (this.distanceTraveled >= this.distanceToTarget) {
        if (Math.random() < 0.2) {
            createSuperParticles(this.tx, this.ty);
        } else {
            createParticles(this.tx, this.ty);
            playSound('explosion', 0.5);
        }
        fireworks.splice(index, 1);
    } else {
        this.x += vx;
        this.y += vy;
    }
};

// Draw firework
Firework.prototype.draw = function () {
    ctx.beginPath();
    ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
    ctx.stroke();
};

// Particle class
function Particle(x, y) {
    this.x = x;
    this.y = y;
    this.coordinates = [];
    this.coordinateCount = 5;

    while (this.coordinateCount--) {
        this.coordinates.push([this.x, this.y]);
    }

    this.angle = random(0, Math.PI * 2);
    this.cosAngle = Math.cos(this.angle);
    this.sinAngle = Math.sin(this.angle);
    this.speed = random(1, 10);
    this.friction = 0.95;
    this.gravity = 1;
    this.hue = random(hue - 50, hue + 50);
    this.brightness = random(50, 80);
    this.alpha = 1;
    this.decay = random(0.015, 0.03);
}

// Update particle (optimized)
Particle.prototype.update = function (index) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += this.cosAngle * this.speed;
    this.y += this.sinAngle * this.speed + this.gravity;
    this.alpha -= this.decay;

    if (this.alpha <= this.decay) {
        particles.splice(index, 1);
    }
};

// Draw particle
Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
    ctx.stroke();
};

// MiniParticle class
function MiniParticle(x, y) {
    Particle.call(this, x, y);
    this.speed = random(1, 7);
    this.brightness = random(70, 90);
    this.size = random(2, 4);
    this.decay = random(0.01, 0.02);
}

MiniParticle.prototype = Object.create(Particle.prototype);
MiniParticle.prototype.constructor = MiniParticle;

// Draw particle (optimized)
MiniParticle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
    ctx.fillStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
    ctx.fill();
};

// Create particles
function createParticles(x, y) {
    let particleCount = 30;
    while (particleCount--) {
        particles.push(new Particle(x, y));
    }
}

// Create super particles (optimized)
function createSuperParticles(x, y) {
    let superParticleCount = 70;
    while (superParticleCount--) {
        particles.push(new Particle(x, y));
    }
    playSound('explosion', 0.5);

    let miniFireworkCount = 10; // Giảm từ 10 xuống 5
    while (miniFireworkCount--) {
        setTimeout(() => {
            const angle = random(0, Math.PI * 2);
            const distance = random(50, 100);
            const miniX = x + Math.cos(angle) * distance;
            const miniY = y + Math.sin(angle) * distance;
            playClusterSound();
            let miniParticleCount = 20; // Giảm từ 15 xuống 10
            while (miniParticleCount--) {
                particles.push(new MiniParticle(miniX, miniY));
            }
        }, 50
        );
    }
}

// Main animation loop (optimized)
function loop() {
    const timerTotal = (Math.random() >= 0.8) ? 60 : 30;
    requestAnimFrame(loop);

    if (paused) return;

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, cw, ch);

    // Draw background image
    ctx.drawImage(background, 0, 0, cw, ch);

    // ctx.globalCompositeOperation = 'destination-out';
    // ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    // ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].draw();
        fireworks[i].update(i);
    }

    for (let j = particles.length - 1; j >= 0; j--) {
        particles[j].draw();
        particles[j].update(j);
    }

    if (timerTick >= timerTotal) {
        if (!mousedown) {
            fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
            timerTick = 0;
        }
    } else {
        timerTick++;
    }
}

// Debounce function for resize event
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Event listeners
canvas.addEventListener('mousemove', function (e) {
    mx = e.pageX - canvasOffsetX;
    my = e.pageY - canvasOffsetY;
});

canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    mousedown = true;
});

canvas.addEventListener('mouseup', function (e) {
    e.preventDefault();
    paused = false;
    mousedown = false;
});

document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        paused = !paused;
    }
});

window.addEventListener('resize', debounce(function () {
    cw = window.innerWidth;
    ch = window.innerHeight;
    canvas.width = cw;
    canvas.height = ch;
    canvasOffsetX = canvas.offsetLeft;
    canvasOffsetY = canvas.offsetTop;
}, 250));

window.addEventListener('unload', function () {
    if (audioContext) {
        audioContext.close();
    }
    clusterSourcePool.forEach(source => {
        if (source) {
            source.disconnect();
        }
    });
});

// Start animation after background image loads (optimized)
background.onload = function () {
    // Fade in the canvas using requestAnimationFrame
    let opacity = 0;
    function fadeIn() {
        opacity += 0.05; // Adjust increment for smoother/faster fade
        canvas.style.opacity = opacity;
        if (opacity < 1) {
            requestAnimationFrame(fadeIn);
        } else {
            loop(); // Start the loop only after fade-in is complete
        }
    }
    requestAnimationFrame(fadeIn);
};