const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const launchSound = document.getElementById('launchSound');
const burstSound = document.getElementById('burstSound');

let fireworks = [];
let particles = [];
let isPageActive = true;

// Utility function to get random number within a range
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Function to generate random RGBA color
function randomRGBA() {
    const r = random(0, 255);
    const g = random(0, 255);
    const b = random(0, 255);
    const a = 1; // Default alpha is 1
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Firework class
class Firework {
    constructor(x, y, targetX, targetY, color, speed) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.speed = speed;
        this.angle = Math.atan2(targetY - y, targetX - x);
        this.radius = 3;
        this.launchSoundPlayed = false;
        this.gravity = 0.2;
        this.hasExploded = false;
        this.isSuper = false;
        this.multiColorProbability = 0.2;
        this.isMultiColor = Math.random() < this.multiColorProbability;
    }

    update() {
        if (!this.launchSoundPlayed) {
            launchSound.currentTime = 0;
            launchSound.play();
            this.launchSoundPlayed = true;
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;

        this.gravity *= 1.01;
        this.speed *= 0.99;

        if (
            (Math.abs(this.x - this.targetX) < 20 &&
                Math.abs(this.y - this.targetY) < 20) ||
            this.speed < 1
        ) {
            this.explode();
            this.hasExploded = true;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    explode() {
        burstSound.currentTime = 0;
        burstSound.play();

        if (this.isSuper) {

            const miniFireworkCount = 30;
            for (let i = 0; i < miniFireworkCount; i++) {
                const angle = (Math.PI * 2) * (i / miniFireworkCount);
                const speed = random(2, 5);
                const targetX = this.x + Math.cos(angle) * random(50, 150);
                const targetY = this.y + Math.sin(angle) * random(50, 150);
                // Tạo màu ngẫu nhiên cho mỗi miniFirework
                const miniColor = randomRGBA();
                const miniFirework = new Firework(
                    this.x,
                    this.y,
                    targetX,
                    targetY,
                    miniColor,
                    speed
                );
                miniFirework.isSuper = false;
                miniFirework.isMultiColor = false;
                fireworks.push(miniFirework);
            }
        } else {
            // Nổ ra các hạt bình thường
            const particleCount = 150;
            const color = this.isMultiColor ? randomRGBA() : this.color;
            for (let i = 0; i < particleCount; i++) {
                particles.push(
                    new Particle(
                        this.x,
                        this.y,
                        color,
                        random(0.5, 3),
                        random(0, Math.PI * 2),
                        random(1, 6)
                    )
                );
            }
        }
    }
}

// Particle class
class Particle {
    constructor(x, y, color, size, angle, speed) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.angle = angle;
        this.speed = speed;
        this.friction = 0.95;
        this.gravity = 0.3;
        this.alpha = 1;
        this.decay = random(0.0075, 0.015);
        this.shrinkRate = random(0.01, 0.05);
        this.wander = random(-1, 1);
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed + this.wander;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.speed *= this.friction;
        this.alpha -= this.decay;
        this.size -= this.shrinkRate;

        if (this.alpha <= 0 || this.size <= 0) {
            particles.splice(particles.indexOf(this), 1);
        }
    }

    draw() {
        // Tính khoảng cách từ tâm vụ nổ (có thể là vị trí nổ của Firework)
        const distanceFromExplosion = Math.sqrt(
            Math.pow(this.x - this.explosionX, 2) +
            Math.pow(this.y - this.explosionY, 2)
        );

        // Điều chỉnh alpha dựa trên khoảng cách
        const alpha = Math.max(
            0,
            this.alpha - distanceFromExplosion / 300
        ); // Giảm alpha khi xa hơn

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

// Function to create a firework
function createFirework(x, y) {
    const color = randomRGBA(); // Use randomRGBA()
    const targetX = x || random(canvas.width * 0.2, canvas.width * 0.8);
    const targetY = y || random(canvas.height * 0.1, canvas.height * 0.5);
    const speed = random(8, 14);
    fireworks.push(
        new Firework(canvas.width / 2, canvas.height, targetX, targetY, color, speed)
    );
}

// Function to create a super firework
function createSuperFirework(x, y) {
    const color = randomRGBA(); // Use randomRGBA()
    const targetX = x || random(canvas.width * 0.2, canvas.width * 0.8);
    const targetY = y || random(canvas.height * 0.1, canvas.height * 0.3);
    const speed = random(4, 6);
    const superFirework = new Firework(
        canvas.width / 2,
        canvas.height,
        targetX,
        targetY,
        color,
        speed
    );
    superFirework.isSuper = true;
    superFirework.radius = 8;
    superFirework.multiColorProbability = 0.3;
    superFirework.isMultiColor = Math.random() < superFirework.multiColorProbability;
    fireworks.push(superFirework);
}

// Automatic firework creation

let isStart = false;
// Manual firework creation on click
canvas.addEventListener('click', (event) => {
    if (isPageActive) {
        isStart = true;
        createFirework(event.clientX, event.clientY);
    }

});
setInterval(() => {
    if (isPageActive) { // Chỉ tạo pháo hoa nếu tab active
        if (isStart) {
            if (Math.random() < 0.1) {
                createSuperFirework();
            } else {
                createFirework();
            }
        }
    }
}, 500);

// Animation loop
function animate() {
    if (!isPageActive) {
        // Dừng vẽ và cập nhật nếu tab không active
        requestAnimationFrame(animate); // Vẫn gọi requestAnimationFrame để tiếp tục theo dõi
        return;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw fireworks
    for (let i = 0; i < fireworks.length; i++) {
        if (fireworks[i]) {
            fireworks[i]?.update();
            fireworks[i]?.draw();
            if (fireworks[i].hasExploded) {
                fireworks.splice(i, 1);
                i--;
            }
        }
    }

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
        if (particles[i]) {
            particles[i]?.update();
            particles[i]?.draw();
        }
    }

    requestAnimationFrame(animate);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Thêm sự kiện visibilitychange
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        isPageActive = false;
    } else {
        isPageActive = true;
    }
});