// Retro Galaga Game Engine
// Programmed using HTML5 Canvas & Web Audio API

// Sprites defined in pixel grid color codes
// . = transparent, w = white, b = cyan, r = pink/red, y = yellow, g = green, s = grey
const SPRITES = {
    player: [
        "......ww......",
        "......ww......",
        ".....wwww.....",
        "....wbbbbw....",
        "....wbbbbw....",
        "...wbbbbbbw...",
        "..wwrbbbbsww..",
        ".wwwrbbbbswww.",
        "wwwrrbbbbswwww",
        "ww.rrwbbwsr.ww",
        "w..rrwbbwsr..w",
        "...rr....sr...",
    ],
    playerCaptured: [
        "......gg......",
        "......gg......",
        ".....gggg.....",
        "....grrrrg....",
        "....grrrrg....",
        "...grrrrrrg...",
        "..ggyrrrrgyg..",
        ".gggyrrrrgygg.",
        "gggyyrrrrgyggg",
        "gg.yygwygry.gg",
        "g..yygwygry..g",
        "...yy....ry...",
    ],
    boss1: [ // Full HP Green Boss
        "...ggyygg...",
        "..gggggggg..",
        ".gwwggggwwg.",
        "gwwwwwwwwwwg",
        "gwwgwwwwgwwg",
        "gggggwwggggg",
        ".gggyyyyggg.",
        "..gbbbbbbg..",
        ".gbbbbbbbbg.",
        "gbb.bbbb.bbg",
        "gg..bbbb..gg",
        "....b..b...."
    ],
    boss2: [ // HP=1 Damaged Blue/Yellow Boss
        "...bbyybb...",
        "..bbbbbbbb..",
        ".bwwbbbbwwb.",
        "bwwwwwwwwwwb",
        "bwwbwwwwbwwb",
        "bbbbswwbbbbb",
        ".bbbyyyybbb.",
        "..brrrrrrb..",
        ".brrrrrrrrb.",
        "brr.rrrr.rrb",
        "bb..rrrr..bb",
        "....r..r...."
    ],
    guard: [ // Red Guard
        "....rryyrr....",
        "...rrrrrrrr...",
        "..rrwwrrwwrr..",
        ".rrrrrrrrrrrr.",
        "rrrrwrrrrwrrrr",
        "rrrywrrrrwryrr",
        ".rryyyyyyyrr.",
        "..rbbwwbbr..",
        "...rbbbbbr...",
        "....r..r...."
    ],
    drone: [ // Blue Drone
        "....bbyybb....",
        "...bbbbbbbb...",
        "..bbwwbbwwbb..",
        ".bbbbbbbbbbbb.",
        "bbbbwbbbbwbbbb",
        "bbbywbbbbwybbb",
        ".bbyyyyyyybbr.",
        "..brrwwrrb..",
        "...rrrrrr...",
        "....r..r...."
    ]
};

// Web Audio API Retro Sound Effects Engine
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.noiseBuffer = null;
        this.tractorBeamNode = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.createNoiseBuffer();
    }

    createNoiseBuffer() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    playCoin() {
        if (!this.ctx || this.muted) return;
        this.ctx.resume();
        const now = this.ctx.currentTime;
        
        const playTone = (freq, delay, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + delay);
            
            gain.gain.setValueAtTime(0.12, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + delay);
            osc.stop(now + delay + duration);
        };
        
        playTone(987.77, 0, 0.08); // B5
        playTone(1318.51, 0.08, 0.25); // E6
    }

    playLaser() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playEnemyLaser() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playExplosion(isPlayer) {
        if (!this.ctx || !this.noiseBuffer || this.muted) return;
        const now = this.ctx.currentTime;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        if (isPlayer) {
            // Deeper, longer explosion
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.exponentialRampToValueAtTime(20, now + 0.8);
            
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.8);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            source.start(now);
            source.stop(now + 0.8);
        } else {
            // Quick enemy pop
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            source.start(now);
            source.stop(now + 0.25);
        }
    }

    startTractorBeam() {
        if (!this.ctx || this.muted || this.tractorBeamNode) return;
        const now = this.ctx.currentTime;
        
        // Synthesizing a sci-fi pulsing beam sound
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        
        // Modulator to create the pulsing "wah-wah" effect
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(8, now); // 8 Hz pulse
        const modulationGain = this.ctx.createGain();
        modulationGain.gain.setValueAtTime(80, now);

        osc2.connect(modulationGain);
        modulationGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.05, now);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc2.start(now);

        this.tractorBeamNode = { osc, osc2, gain };
    }

    stopTractorBeam() {
        if (!this.tractorBeamNode) return;
        try {
            this.tractorBeamNode.osc.stop();
            this.tractorBeamNode.osc2.stop();
        } catch (e) {}
        this.tractorBeamNode = null;
    }

    playCaptureSound() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        
        // Fast descending chromatic scale
        const notes = [880, 784, 698, 659, 587, 523, 494, 440];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            
            gain.gain.setValueAtTime(0.08, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + (idx + 1) * 0.08);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.08);
            osc.stop(now + (idx + 1) * 0.08);
        });
    }

    playRescueMelody() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        
        // Victory fanfare! (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
        const timing = [0, 0.1, 0.2, 0.3, 0.45, 0.6];
        const durations = [0.08, 0.08, 0.08, 0.12, 0.12, 0.4];
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + timing[idx]);
            
            gain.gain.setValueAtTime(0.1, now + timing[idx]);
            gain.gain.exponentialRampToValueAtTime(0.005, now + timing[idx] + durations[idx]);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + timing[idx]);
            osc.stop(now + timing[idx] + durations[idx]);
        });
    }

    playStageStart() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        
        // Traditional Stage Start Melody
        const melody = [587.33, 659.25, 698.46, 783.99, 0, 783.99, 880.00, 783.99, 698.46, 659.25, 587.33];
        const timing = [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
        
        melody.forEach((freq, idx) => {
            if (freq === 0) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + timing[idx]);
            
            gain.gain.setValueAtTime(0.08, now + timing[idx]);
            gain.gain.exponentialRampToValueAtTime(0.005, now + timing[idx] + 0.09);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + timing[idx]);
            osc.stop(now + timing[idx] + 0.09);
        });
    }

    playGameOver() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        
        // Descending arpeggio
        const notes = [587.33, 493.88, 440.00, 349.23, 293.66];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);
            
            gain.gain.setValueAtTime(0.12, now + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 0.3);
        });
    }
}

const audio = new SoundSynth();

// Canvas Initialization
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Parameters and Global Variables
let score = 0;
let lives = 3;
let credit = 0;
let level = 1;
let highScores = [];
let gameState = 'COIN_SCREEN'; // COIN_SCREEN, INTRO, PLAYING, DUAL_MERGE, GAME_OVER, CHALLENGING_STAGE_BONUS
let difficulty = 'NORMAL'; // NORMAL, HARD
let keys = {};
let gameTime = 0;

// Parallax Starfield
class Starfield {
    constructor() {
        this.stars = [];
        this.numStars = 80;
        this.init();
    }

    init() {
        for (let i = 0; i < this.numStars; i++) {
            this.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1.5 + 0.5,
                color: this.getRandomColor()
            });
        }
    }

    getRandomColor() {
        const colors = [
            'rgba(255,255,255,0.8)', // White
            'rgba(0,243,255,0.7)',   // Cyan
            'rgba(255,0,91,0.6)',    // Pink
            'rgba(255,190,0,0.7)'    // Yellow
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.stars.forEach(star => {
            star.y += star.speed;
            // Loop back from top
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });
    }

    draw(ctx) {
        this.stars.forEach(star => {
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
    }
}
const starfield = new Starfield();

// Entities lists
let player = null;
let enemies = [];
let lasers = [];
let particles = [];
let rescuedShip = null; // Storing falling rescued ship details

// Laser projectile
class Laser {
    constructor(x, y, dx, dy, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.width = 3;
        this.height = 14;
        this.isPlayer = isPlayer;
        this.color = isPlayer ? '#00f3ff' : '#ff005b';
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0; // Reset
    }
}

// Particle explosion
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.dx = (Math.random() - 0.5) * 6;
        this.dy = (Math.random() - 0.5) * 6;
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.04 + 0.02;
        this.color = color;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.dy += 0.05; // Faint gravity
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function spawnExplosion(x, y, colorCode) {
    let colors = ['#ffffff', '#ff005b', '#ffbe00', '#00f3ff'];
    if (colorCode === 'green') colors = ['#39ff14', '#ffffff', '#ffbe00'];
    if (colorCode === 'blue') colors = ['#00f3ff', '#ffffff', '#0055ff'];
    if (colorCode === 'red') colors = ['#ff005b', '#ffffff', '#ffbe00'];
    
    for (let i = 0; i < 20; i++) {
        const randColor = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(x, y, randColor));
    }
}

// Rescued Ship falling entity
class RescuedShip {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.width = 28;
        this.height = 28;
    }

    update() {
        this.y += 2.0; // Slowly falls down
        this.angle += 0.06; // Spin as it falls
    }

    draw(ctx) {
        drawSprite(ctx, 'playerCaptured', this.x, this.y, 2, this.angle);
    }
}

// Player Ship class
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.width = 28;
        this.height = 28;
        this.speed = 4.5;
        this.isDual = false;
        this.lastShot = 0;
        this.cooldown = 220; // ms
        
        // Capture Animation Variables
        this.state = 'NORMAL'; // NORMAL, CAPTURING, CAPTURED
        this.captureTimer = 0;
        this.captureTargetY = 0;
        this.captureTargetX = 0;
        this.angle = 0;
        this.alpha = 1.0;
        
        this.invulnerableTimer = 120; // start invulnerable (in frames)
    }

    shoot() {
        if (this.state !== 'NORMAL') return;
        const now = Date.now();
        if (now - this.lastShot >= this.cooldown) {
            audio.playLaser();
            if (this.isDual) {
                // Spawn two parallel lasers
                lasers.push(new Laser(this.x - 16, this.y - 12, 0, -8));
                lasers.push(new Laser(this.x + 16, this.y - 12, 0, -8));
            } else {
                lasers.push(new Laser(this.x, this.y - 12, 0, -8));
            }
            this.lastShot = now;
        }
    }

    update() {
        if (this.invulnerableTimer > 0) this.invulnerableTimer--;

        if (this.state === 'NORMAL') {
            // Control inputs
            if (keys['ArrowLeft'] || keys['KeyA'] || keys['LeftBtn']) {
                this.x -= this.speed;
            }
            if (keys['ArrowRight'] || keys['KeyD'] || keys['RightBtn']) {
                this.x += this.speed;
            }

            // Boundary checks
            const halfWidth = this.isDual ? 32 : 14;
            if (this.x < halfWidth) this.x = halfWidth;
            if (this.x > canvas.width - halfWidth) this.x = canvas.width - halfWidth;
            
            if (keys['Space'] || keys['FireBtn']) {
                this.shoot();
            }
        } 
        else if (this.state === 'CAPTURING') {
            // Spinning and getting pulled up by tractor beam
            this.angle += 0.15;
            this.y -= 1.5;
            this.x += (this.captureTargetX - this.x) * 0.05;
            
            if (this.y <= this.captureTargetY) {
                // Capture complete, ship belongs to enemy
                this.state = 'CAPTURED';
                audio.stopTractorBeam();
                audio.playCaptureSound();
                handlePlayerCaptured();
            }
        }
    }

    draw(ctx) {
        if (this.state === 'CAPTURED') return;
        
        // Invulnerability flashing
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 8) % 2 === 0) {
            return;
        }

        ctx.save();
        if (this.state === 'CAPTURING') {
            ctx.globalAlpha = 0.8;
        }

        if (this.isDual) {
            // Draw two ships side-by-side
            drawSprite(ctx, 'player', this.x - 16, this.y, 2, this.angle);
            drawSprite(ctx, 'player', this.x + 16, this.y, 2, this.angle);
        } else {
            drawSprite(ctx, 'player', this.x, this.y, 2, this.angle);
        }

        ctx.restore();
    }
}

// Enemy Class
class Enemy {
    constructor(row, col, type, targetX, targetY) {
        this.gridRow = row;
        this.gridCol = col;
        this.type = type; // boss, guard, drone
        this.hp = type === 'boss' ? 2 : 1;
        this.targetX = targetX;
        this.targetY = targetY;

        this.x = -50;
        this.y = -50;
        
        this.state = 'ENTERING'; // ENTERING, FORMATION, DIVING, RETURNING
        this.path = [];
        this.pathIndex = 0;
        
        this.angle = 0;
        this.diveTimer = 0;
        this.diveType = 'standard'; // standard, tractor_beam
        this.beamTimer = 0;
        this.hasCapturedShip = false; // Is this Boss currently holding a captured player ship?
        
        this.shootTimer = Math.random() * 500;
        this.width = 24;
        this.height = 24;
    }

    setupPath(points, steps = 80) {
        this.path = [];
        this.pathIndex = 0;
        this.state = 'ENTERING';
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Cubic bezier calculation
            const p0 = points[0];
            const p1 = points[1];
            const p2 = points[2];
            const p3 = points[3];
            
            const x = Math.pow(1-t, 3)*p0.x + 3*Math.pow(1-t, 2)*t*p1.x + 3*(1-t)*Math.pow(t, 2)*p2.x + Math.pow(t, 3)*p3.x;
            const y = Math.pow(1-t, 3)*p0.y + 3*Math.pow(1-t, 2)*t*p1.y + 3*(1-t)*Math.pow(t, 2)*p2.y + Math.pow(t, 3)*p3.y;
            
            this.path.push({ x, y });
        }
    }

    update(swayOffsetX, swayOffsetY) {
        this.shootTimer++;

        if (this.state === 'ENTERING') {
            if (this.pathIndex < this.path.length) {
                const nextPos = this.path[this.pathIndex];
                
                // Calculate rotation angle matching flight path
                const dx = nextPos.x - this.x;
                const dy = nextPos.y - this.y;
                if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                    this.angle = Math.atan2(dy, dx) - Math.PI/2;
                }
                
                this.x = nextPos.x;
                this.y = nextPos.y;
                this.pathIndex++;
            } else {
                // Linear slide toward designated formation spot
                const actualTargetX = this.targetX + swayOffsetX;
                const actualTargetY = this.targetY + swayOffsetY;
                
                const dx = actualTargetX - this.x;
                const dy = actualTargetY - this.y;
                const dist = Math.hypot(dx, dy);
                
                if (dist < 4) {
                    this.x = actualTargetX;
                    this.y = actualTargetY;
                    this.state = 'FORMATION';
                    this.angle = 0;
                } else {
                    this.x += dx * 0.1;
                    this.y += dy * 0.1;
                    this.angle = Math.atan2(dy, dx) - Math.PI/2;
                }
            }
        } 
        else if (this.state === 'FORMATION') {
            // Follow the swaying grid
            this.x = this.targetX + swayOffsetX;
            this.y = this.targetY + swayOffsetY;
            this.angle = 0;

            // Attack triggering in PLAYING state (no shooting/diving during intro)
            if (gameState === 'PLAYING') {
                const triggerRate = (difficulty === 'HARD') ? 1000 : 1500;
                if (this.shootTimer > 200 + Math.random() * triggerRate) {
                    this.shootTimer = 0;
                    if (Math.random() < 0.2 + (level * 0.02)) {
                        this.shootLaser();
                    }
                }
            }
        } 
        else if (this.state === 'DIVING') {
            // Attack loop
            this.diveTimer += 0.015;
            
            if (this.diveType === 'tractor_beam') {
                // Pull down to center screen, hover, activate beam
                if (this.y < 260) {
                    this.y += 3;
                    this.x += (canvas.width / 2 - this.x) * 0.08;
                    this.angle = 0;
                } else {
                    // Turn on tractor beam
                    this.angle = 0;
                    this.beamTimer++;
                    audio.startTractorBeam();
                    
                    if (this.beamTimer > 280) {
                        // Finished beam scan, fly away
                        this.diveType = 'standard';
                        audio.stopTractorBeam();
                        this.beamTimer = 0;
                    }
                }
            } else {
                // Swooping dive
                const loopRadius = 90;
                const speedMult = (difficulty === 'HARD') ? 1.4 : 1.0;
                
                // S-curve swooping mechanics down the screen
                this.y += 3.5 * speedMult;
                this.x += Math.sin(this.diveTimer * 8) * 4 * speedMult;
                
                this.angle = Math.sin(this.diveTimer * 8) * 0.4 + Math.PI;

                // Firing logic during dive
                if (this.shootTimer > 40 && Math.random() < 0.15) {
                    this.shootLaser();
                    this.shootTimer = 0;
                }

                // If goes off bottom of screen, loop back from top
                if (this.y > canvas.height + 40) {
                    this.y = -40;
                    this.x = Math.random() * canvas.width;
                    this.state = 'RETURNING';
                }
            }
        } 
        else if (this.state === 'RETURNING') {
            // Direct slide back to designated grid spot
            const actualTargetX = this.targetX + swayOffsetX;
            const actualTargetY = this.targetY + swayOffsetY;
            
            const dx = actualTargetX - this.x;
            const dy = actualTargetY - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 5) {
                this.x = actualTargetX;
                this.y = actualTargetY;
                this.state = 'FORMATION';
                this.angle = 0;
            } else {
                this.x += dx * 0.08;
                this.y += dy * 0.08;
                this.angle = Math.atan2(dy, dx) - Math.PI/2;
            }
        }
    }

    shootLaser() {
        if (gameState !== 'PLAYING') return;
        audio.playEnemyLaser();
        // Shoot towards the player
        const dx = player ? (player.x - this.x) : 0;
        const dy = player ? (player.y - this.y) : 600;
        const dist = Math.hypot(dx, dy);
        
        // Normalize speed
        const speed = (difficulty === 'HARD') ? 6.0 : 4.5;
        const lx = (dx / dist) * speed;
        const ly = (dy / dist) * speed;
        
        lasers.push(new Laser(this.x, this.y + 12, lx, ly, false));
    }

    draw(ctx) {
        let spriteKey = 'drone';
        if (this.type === 'guard') spriteKey = 'guard';
        else if (this.type === 'boss') {
            spriteKey = this.hp === 2 ? 'boss1' : 'boss2';
        }

        drawSprite(ctx, spriteKey, this.x, this.y, 2, this.angle);

        // Draw Captured Ship attached above the Boss
        if (this.hasCapturedShip && this.state !== 'DIVING') {
            drawSprite(ctx, 'playerCaptured', this.x, this.y - 20, 1.8, this.angle);
        } else if (this.hasCapturedShip && this.state === 'DIVING') {
            // Escort dives alongside, drawn with slight offset
            drawSprite(ctx, 'playerCaptured', this.x - 22, this.y - 12, 1.8, this.angle);
        }

        // Draw Tractor Beam
        if (this.state === 'DIVING' && this.diveType === 'tractor_beam' && this.beamTimer > 20) {
            const timeGlow = Math.sin(Date.now() / 50) * 0.15 + 0.35;
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, canvas.height);
            gradient.addColorStop(0, `rgba(0, 243, 255, ${timeGlow})`);
            gradient.addColorStop(0.3, `rgba(0, 243, 255, ${timeGlow * 0.8})`);
            gradient.addColorStop(1, 'rgba(0, 243, 255, 0.01)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(this.x - 10, this.y + 12);
            ctx.lineTo(this.x + 10, this.y + 12);
            ctx.lineTo(this.x + 65, canvas.height);
            ctx.lineTo(this.x - 65, canvas.height);
            ctx.closePath();
            ctx.fill();

            // Draw glowing rings inside the tractor beam
            ctx.strokeStyle = `rgba(255, 255, 255, ${timeGlow * 0.5})`;
            ctx.lineWidth = 2;
            const ringCount = 5;
            for (let i = 0; i < ringCount; i++) {
                const progress = ((this.beamTimer + i * 40) % 200) / 200;
                const ringY = this.y + 12 + progress * (canvas.height - this.y - 12);
                const ringW = 20 + progress * 110;
                
                ctx.beginPath();
                ctx.ellipse(this.x, ringY, ringW / 2, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
}

// Grid layout parameters
const gridCols = 10;
const gridRows = 4;
const colGap = 32;
const rowGap = 28;
const gridWidth = (gridCols - 1) * colGap;
const gridLeft = (canvas.width - gridWidth) / 2;

// Spawn grid enemies setup
function setupEnemiesForLevel() {
    enemies = [];
    lasers = [];
    rescuedShip = null;

    if (level % 3 === 0) {
        // Challenging Stage (Level 3, 6, 9)
        gameState = 'PLAYING'; // Run standard loop but with challenging level structure
        setupChallengingStage();
        return;
    }

    // Standard Grid Build
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            let type = 'drone';
            if (r === 0) {
                // Bosses in middle columns
                if (c >= 2 && c <= 7) type = 'boss';
                else continue;
            } else if (r === 1) {
                type = 'guard';
            }
            
            const targetX = gridLeft + c * colGap;
            const targetY = 80 + r * rowGap;
            enemies.push(new Enemy(r, c, type, targetX, targetY));
        }
    }

    // If a captured ship was stored, give it to the first available Boss
    if (gameState === 'INTRO' && localStorage.getItem('galaga_captured') === 'true') {
        const boss = enemies.find(e => e.type === 'boss');
        if (boss) {
            boss.hasCapturedShip = true;
            document.getElementById('dual-display').innerText = "CAPTURED";
            document.getElementById('dual-display').style.color = "var(--neon-pink)";
        }
    }

    startFlyInIntro();
}

// Bezier Curve Entry Paths
const paths = {
    loopLeft: [
        { x: -30, y: 100 },
        { x: 180, y: 120 },
        { x: 150, y: 480 },
        { x: 70, y: 420 }
    ],
    loopRight: [
        { x: canvas.width + 30, y: 100 },
        { x: canvas.width - 180, y: 120 },
        { x: canvas.width - 150, y: 480 },
        { x: canvas.width - 70, y: 420 }
    ],
    diveCrossLeft: [
        { x: -30, y: 250 },
        { x: 300, y: 80 },
        { x: 420, y: 350 },
        { x: 240, y: 300 }
    ],
    diveCrossRight: [
        { x: canvas.width + 30, y: 250 },
        { x: canvas.width - 300, y: 80 },
        { x: canvas.width - 420, y: 350 },
        { x: canvas.width - 240, y: 300 }
    ]
};

// Orchestrate the fly-in intro sequence
function startFlyInIntro() {
    gameState = 'INTRO';
    audio.playStageStart();

    // Reset positions out of bounds
    enemies.forEach(e => {
        e.x = -100;
        e.y = -100;
        e.state = 'ENTERING';
    });

    // Animate enemies in waves
    // Split enemies by type/group to fly in timed sequences
    const drones = enemies.filter(e => e.type === 'drone');
    const guards = enemies.filter(e => e.type === 'guard');
    const bosses = enemies.filter(e => e.type === 'boss');

    // Drones fly in first (Wave 1 & 2)
    drones.forEach((e, idx) => {
        setTimeout(() => {
            if (gameState !== 'INTRO') return;
            const pathPts = (idx % 2 === 0) ? paths.loopLeft : paths.loopRight;
            e.setupPath(pathPts, 75);
        }, idx * 160);
    });

    // Guards fly in (Wave 3 & 4)
    guards.forEach((e, idx) => {
        setTimeout(() => {
            if (gameState !== 'INTRO') return;
            const pathPts = (idx % 2 === 0) ? paths.diveCrossLeft : paths.diveCrossRight;
            e.setupPath(pathPts, 80);
        }, 1800 + idx * 160);
    });

    // Bosses fly in (Wave 5)
    bosses.forEach((e, idx) => {
        setTimeout(() => {
            if (gameState !== 'INTRO') return;
            const pathPts = (idx % 2 === 0) ? paths.loopLeft : paths.loopRight;
            e.setupPath(pathPts, 90);
        }, 3800 + idx * 250);
    });

    // Transition to active play after intro time (approx 6 seconds)
    setTimeout(() => {
        if (gameState === 'INTRO') {
            gameState = 'PLAYING';
            enemies.forEach(e => {
                if (e.state === 'ENTERING') {
                    e.state = 'FORMATION';
                }
            });
        }
    }, 6200);
}

// Challenging Stage (Level 3 Bonus Stage) variables
let challengingStageHits = 0;
let challengingStageMax = 40;
let challengingWaves = [];
let challengingActive = false;

function setupChallengingStage() {
    challengingStageHits = 0;
    challengingWaves = [];
    challengingActive = true;
    
    // Generate 5 waves of 8 enemies that fly in specific paths
    const waveConfigs = [
        { type: 'drone', startX: -30, path: paths.loopLeft, delay: 0 },
        { type: 'drone', startX: canvas.width + 30, path: paths.loopRight, delay: 3000 },
        { type: 'guard', startX: -30, path: paths.diveCrossLeft, delay: 6000 },
        { type: 'guard', startX: canvas.width + 30, path: paths.diveCrossRight, delay: 9000 },
        { type: 'boss', startX: -30, path: paths.loopLeft, delay: 12000 }
    ];

    waveConfigs.forEach((cfg, waveIdx) => {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (gameState !== 'PLAYING') return;
                const e = new Enemy(0, 0, cfg.type, -200, -200);
                e.setupPath(cfg.path, 110);
                
                // Overwrite update loop to just follow curve then fly away
                e.update = function() {
                    if (this.pathIndex < this.path.length) {
                        const nextPos = this.path[this.pathIndex];
                        const dx = nextPos.x - this.x;
                        const dy = nextPos.y - this.y;
                        this.angle = Math.atan2(dy, dx) - Math.PI/2;
                        this.x = nextPos.x;
                        this.y = nextPos.y;
                        this.pathIndex++;
                    } else {
                        // Fly off the screen
                        this.y += 4;
                        this.angle = Math.PI;
                    }
                };
                enemies.push(e);
            }, cfg.delay + i * 200);
        }
    });

    // Check when stage is complete (all 40 fly-out or die)
    const monitorTimer = setInterval(() => {
        if (gameState !== 'PLAYING') {
            clearInterval(monitorTimer);
            return;
        }
        
        // Remove enemies that flew off-screen
        enemies = enemies.filter(e => e.y < canvas.height + 40);
        
        // When all spawned waves are finished
        const totalSpawned = 40;
        if (enemies.length === 0 && Date.now() - levelStartTime > 17000) {
            clearInterval(monitorTimer);
            handleChallengingStageEnd();
        }
    }, 500);

    const levelStartTime = Date.now();
}

function handleChallengingStageEnd() {
    gameState = 'CHALLENGING_STAGE_BONUS';
    audio.playRescueMelody();
    
    let bonusPoints = challengingStageHits * 100;
    let perfect = false;
    if (challengingStageHits === challengingStageMax) {
        bonusPoints = 10000;
        perfect = true;
    }
    score += bonusPoints;

    setTimeout(() => {
        // Proceed to next level
        level++;
        document.getElementById('diff-display').innerText = `LVL ${level}`;
        setupEnemiesForLevel();
    }, 4000);
}

// Logic triggered when Player Ship is pulled and captured
function handlePlayerCaptured() {
    localStorage.setItem('galaga_captured', 'true');
    audio.playGameOver();

    // Assigncaptured status to the Boss that started the beam
    const capturingBoss = enemies.find(e => e.state === 'DIVING' && e.diveType === 'tractor_beam');
    if (capturingBoss) {
        capturingBoss.hasCapturedShip = true;
        capturingBoss.state = 'RETURNING';
        capturingBoss.diveType = 'standard';
    }

    document.getElementById('dual-display').innerText = "CAPTURED";
    document.getElementById('dual-display').style.color = "var(--neon-pink)";

    // Spawn a new player ship if lives remaining
    lives--;
    player = null;

    if (lives > 0) {
        setTimeout(() => {
            player = new Player();
            gameState = 'PLAYING';
        }, 2000);
    } else {
        setTimeout(() => {
            handleGameOver();
        }, 1500);
    }
}

// Collisions & Bullet Tracing
function checkCollisions() {
    if (!player) return;

    // 1. Player lasers vs Enemies
    for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
        const l = lasers[lIdx];
        if (!l.isPlayer) continue;

        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const e = enemies[eIdx];
            
            // Check Hit Box
            if (l.x > e.x - 14 && l.x < e.x + 14 && l.y > e.y - 12 && l.y < e.y + 12) {
                // Destroy laser
                lasers.splice(lIdx, 1);
                
                // Damage enemy
                e.hp--;
                if (e.hp <= 0) {
                    enemies.splice(eIdx, 1);
                    audio.playExplosion(false);
                    
                    let killScore = 50;
                    if (e.type === 'guard') killScore = 80;
                    if (e.type === 'boss') killScore = 150;
                    
                    // Double score if diving
                    if (e.state === 'DIVING') killScore *= 2;
                    
                    score += killScore;
                    spawnExplosion(e.x, e.y, e.type === 'boss' ? 'green' : (e.type === 'guard' ? 'red' : 'blue'));

                    if (level % 3 === 0) {
                        challengingStageHits++;
                    }

                    // If the killed Boss carried a captured ship
                    if (e.hasCapturedShip) {
                        // Release captured ship to float down
                        rescuedShip = new RescuedShip(e.x, e.y - 16);
                        localStorage.setItem('galaga_captured', 'false');
                        document.getElementById('dual-display').innerText = "RESCUING";
                        document.getElementById('dual-display').style.color = "var(--neon-yellow)";
                    }
                } else {
                    audio.playEnemyLaser(); // Small chip damage alert
                }
                break; // Break enemy loop
            }
        }
    }

    // 2. Rescued falling ship collisions
    if (rescuedShip) {
        // Player lasers can accidentally hit and destroy the rescued ship!
        for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
            const l = lasers[lIdx];
            if (!l.isPlayer) continue;

            if (l.x > rescuedShip.x - 14 && l.x < rescuedShip.x + 14 && l.y > rescuedShip.y - 14 && l.y < rescuedShip.y + 14) {
                // Destroy laser & rescued ship
                lasers.splice(lIdx, 1);
                spawnExplosion(rescuedShip.x, rescuedShip.y, 'red');
                audio.playExplosion(true);
                rescuedShip = null;
                score += 1000; // Accidental penalty score
                document.getElementById('dual-display').innerText = "DESTROYED";
                document.getElementById('dual-display').style.color = "var(--neon-pink)";
                break;
            }
        }

        // Rescued ship meets current player ship -> DUAL MERGE!
        if (rescuedShip && player && player.state === 'NORMAL') {
            const dist = Math.hypot(player.x - rescuedShip.x, player.y - rescuedShip.y);
            if (dist < 26) {
                // Merging!
                player.isDual = true;
                player.x = canvas.width / 2; // Re-align to center
                rescuedShip = null;
                audio.playRescueMelody();
                
                document.getElementById('dual-display').innerText = "ACTIVE";
                document.getElementById('dual-display').style.color = "var(--neon-green)";
            }
        }
        
        // If falling ship goes off screen bottom, it is lost
        if (rescuedShip && rescuedShip.y > canvas.height + 30) {
            rescuedShip = null;
            document.getElementById('dual-display').innerText = "LOST";
            document.getElementById('dual-display').style.color = "#8c88a5";
        }
    }

    // 3. Enemy lasers vs Player Ship
    if (player && player.state === 'NORMAL' && player.invulnerableTimer <= 0) {
        const playerWidth = player.isDual ? 44 : 20;
        
        for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
            const l = lasers[lIdx];
            if (l.isPlayer) continue;

            if (l.x > player.x - playerWidth / 2 && l.x < player.x + playerWidth / 2 &&
                l.y > player.y - 12 && l.y < player.y + 12) {
                
                // Destroy laser
                lasers.splice(lIdx, 1);
                
                // Explode player
                handlePlayerHit();
                break;
            }
        }
    }

    // 4. Enemy body contact vs Player Ship
    if (player && player.state === 'NORMAL' && player.invulnerableTimer <= 0) {
        const playerWidth = player.isDual ? 44 : 20;

        for (let e of enemies) {
            const dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist < (playerWidth / 2 + 10)) {
                handlePlayerHit();
                break;
            }
        }
    }

    // 5. Boss Tractor Beam overlap check
    if (player && player.state === 'NORMAL' && player.invulnerableTimer <= 0) {
        // Look for boss emitting tractor beam
        const beamBoss = enemies.find(e => e.state === 'DIVING' && e.diveType === 'tractor_beam' && e.beamTimer > 20 && e.beamTimer < 250);
        if (beamBoss) {
            // Check if player is horizontally within the beam pyramid bounds
            if (player.x > beamBoss.x - 55 && player.x < beamBoss.x + 55 && player.y > beamBoss.y + 20) {
                if (player.isDual) {
                    // In Dual Ship mode, touching the beam destroys one ship and cancels the beam
                    handlePlayerHit();
                    beamBoss.diveType = 'standard';
                    audio.stopTractorBeam();
                    beamBoss.beamTimer = 0;
                } else {
                    // Trap the player!
                    player.state = 'CAPTURING';
                    player.captureTargetX = beamBoss.x;
                    player.captureTargetY = beamBoss.y - 10;
                    audio.startTractorBeam();
                }
            }
        }
    }
}

// Logic triggered when Player Ship is hit
function handlePlayerHit() {
    audio.playExplosion(true);
    spawnExplosion(player.x, player.y, 'white');

    if (player.isDual) {
        // Demote to single ship
        player.isDual = false;
        player.invulnerableTimer = 120; // 2 seconds safety
        document.getElementById('dual-display').innerText = "READY";
        document.getElementById('dual-display').style.color = "var(--neon-pink)";
    } else {
        // Lose life
        lives--;
        player = null;

        if (lives > 0) {
            setTimeout(() => {
                player = new Player();
            }, 2000);
        } else {
            handleGameOver();
        }
    }
}

// Game State: GAME OVER
function handleGameOver() {
    gameState = 'GAME_OVER';
    audio.playGameOver();
    
    // Check if score warrants leaderboard ranking
    const scoreRank = getScoreRanking(score);
    if (scoreRank !== -1) {
        document.getElementById('initials-overlay').style.display = 'block';
        document.getElementById('initials-input').value = 'AAA';
        document.getElementById('initials-input').focus();
    } else {
        setTimeout(() => {
            resetToMainMenu();
        }, 5000);
    }
}

function resetToMainMenu() {
    gameState = 'COIN_SCREEN';
    document.getElementById('start-btn').disabled = (credit === 0);
    document.getElementById('initials-overlay').style.display = 'none';
}

// Sway parameters for enemy grid formation
let swayTime = 0;

function updateSway() {
    swayTime += 0.02;
    const swaySpeed = 0.02 + (level * 0.002);
    const swayX = Math.sin(swayTime) * 35;
    const swayY = Math.cos(swayTime * 2) * 5; // Slight vertical breathing pulse
    
    enemies.forEach(e => {
        e.update(swayX, swayY);
    });
}

// Select random formation enemy to start diving attacks
function triggerRandomDives() {
    if (gameState !== 'PLAYING') return;

    // Filter candidate enemies in formation state
    const readyEnemies = enemies.filter(e => e.state === 'FORMATION');
    if (readyEnemies.length === 0) return;

    // Select 1 to 2 diving attackers
    const maxDives = (difficulty === 'HARD') ? 3 : 2;
    const diveCount = Math.floor(Math.random() * maxDives) + 1;
    
    for (let i = 0; i < Math.min(diveCount, readyEnemies.length); i++) {
        const idx = Math.floor(Math.random() * readyEnemies.length);
        const enemy = readyEnemies[idx];
        
        enemy.state = 'DIVING';
        enemy.diveTimer = 0;
        enemy.shootTimer = 0;
        
        // 25% chance of Boss Galaga performing tractor beam dive (only if player exists and is not dual)
        if (enemy.type === 'boss' && !enemy.hasCapturedShip && player && !player.isDual && Math.random() < 0.25) {
            const activeCaptures = enemies.some(e => e.hasCapturedShip);
            if (!activeCaptures && localStorage.getItem('galaga_captured') !== 'true') {
                enemy.diveType = 'tractor_beam';
                enemy.beamTimer = 0;
            }
        } else {
            enemy.diveType = 'standard';
        }
        
        readyEnemies.splice(idx, 1); // Avoid selecting duplicate candidate
    }
}

// Random diving trigger loop
let diveTriggerTimer = null;
function startDiveTriggers() {
    if (diveTriggerTimer) clearInterval(diveTriggerTimer);
    
    diveTriggerTimer = setInterval(() => {
        if (gameState === 'PLAYING') {
            triggerRandomDives();
        }
    }, 4500 - (level * 200));
}

// Core Game Loop
function gameLoop() {
    gameTime++;
    
    // Clear screen
    ctx.fillStyle = '#030208';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    starfield.update();
    starfield.draw(ctx);

    // Update & draw lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.update();
        l.draw(ctx);

        // Remove out-of-bounds lasers
        if (l.y < -20 || l.y > canvas.height + 20) {
            lasers.splice(i, 1);
        }
    }

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Update & draw falling rescued ship
    if (rescuedShip) {
        rescuedShip.update();
        rescuedShip.draw(ctx);
    }

    // Update & draw player
    if (player) {
        player.update();
        player.draw(ctx);
    }

    // Update & draw enemies
    updateSway();
    enemies.forEach(e => e.draw(ctx));

    // Perform collision checks
    if (gameState === 'PLAYING') {
        checkCollisions();
        
        // Level cleared checks
        if (enemies.length === 0) {
            gameState = 'INTRO';
            setTimeout(() => {
                level++;
                document.getElementById('diff-display').innerText = `LVL ${level}`;
                setupEnemiesForLevel();
            }, 1500);
        }
    }

    // Drawing texts for Game States
    drawHUD();

    requestAnimationFrame(gameLoop);
}

// Drawing overlays and text labels
function drawHUD() {
    // Top Score Indicators
    ctx.font = "11px 'Press Start 2P'";
    
    ctx.fillStyle = '#ff005b';
    ctx.fillText("1UP", 36, 24);
    ctx.fillText("HIGH SCORE", 180, 24);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(score.toString().padStart(6, '0'), 24, 42);
    
    const maxScore = highScores.length > 0 ? highScores[0].score : 20000;
    ctx.fillText(Math.max(score, maxScore).toString().padStart(6, '0'), 200, 42);

    if (gameState === 'COIN_SCREEN') {
        ctx.font = "20px 'Press Start 2P'";
        ctx.fillStyle = '#00f3ff';
        ctx.textAlign = 'center';
        ctx.fillText("GALAGA", canvas.width / 2, 220);
        
        ctx.font = "9px 'Press Start 2P'";
        ctx.fillStyle = '#ffbe00';
        ctx.fillText("HTML5 RETRO REMAKE", canvas.width / 2, 250);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText("INSERT COIN TO PLAY", canvas.width / 2, 380);
        ctx.fillText("1 COIN = 1 CREDIT", canvas.width / 2, 400);

        if (gameTime % 60 < 30) {
            ctx.fillStyle = '#ff005b';
            ctx.fillText("PRESS START BUTTON", canvas.width / 2, 460);
        }
        ctx.textAlign = 'left'; // Reset
    } 
    else if (gameState === 'INTRO') {
        ctx.font = "14px 'Press Start 2P'";
        ctx.fillStyle = '#00f3ff';
        ctx.textAlign = 'center';
        
        if (level % 3 === 0) {
            ctx.fillText("CHALLENGING STAGE", canvas.width / 2, 280);
        } else {
            ctx.fillText(`STAGE ${level}`, canvas.width / 2, 280);
        }
        
        ctx.font = "12px 'Press Start 2P'";
        ctx.fillStyle = '#ffbe00';
        ctx.fillText("READY PLAYER ONE", canvas.width / 2, 320);
        ctx.textAlign = 'left'; // Reset
    } 
    else if (gameState === 'CHALLENGING_STAGE_BONUS') {
        ctx.textAlign = 'center';
        ctx.font = "14px 'Press Start 2P'";
        ctx.fillStyle = '#ffbe00';
        ctx.fillText("CHALLENGING STAGE COMPLETE", canvas.width / 2, 220);
        
        ctx.font = "11px 'Press Start 2P'";
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`NUMBER OF HITS: ${challengingStageHits}`, canvas.width / 2, 280);
        
        const isPerfect = challengingStageHits === challengingStageMax;
        if (isPerfect) {
            ctx.fillStyle = '#39ff14';
            ctx.fillText("PERFECT! 10000 PTS BONUS", canvas.width / 2, 330);
        } else {
            ctx.fillText(`BONUS PTS: ${challengingStageHits * 100}`, canvas.width / 2, 330);
        }
        ctx.textAlign = 'left';
    } 
    else if (gameState === 'GAME_OVER') {
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = '#ff005b';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, 300);
        ctx.textAlign = 'left';
    }

    // Bottom Stats: Draw Player Lives represent by small ships
    const lifeSize = 12;
    for (let i = 0; i < lives - 1; i++) {
        drawSprite(ctx, 'player', 30 + i * 22, canvas.height - 24, 1.2, 0);
    }
    
    // Bottom right: level indicators (badges)
    ctx.fillStyle = '#ffbe00';
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText(`L:${level}`, canvas.width - 50, canvas.height - 18);
}

// Helpers for Drawing pixel structures
function drawSprite(ctx, spriteKey, centerX, centerY, pixelSize = 2, angle = 0) {
    const sprite = SPRITES[spriteKey];
    if (!sprite) return;
    
    const rows = sprite.length;
    const cols = sprite[0].length;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    if (angle !== 0) {
        ctx.rotate(angle);
    }
    
    const startX = -cols * pixelSize / 2;
    const startY = -rows * pixelSize / 2;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const char = sprite[r][c];
            if (char === '.') continue;
            
            let color = '#fff';
            if (char === 'w') color = '#ffffff';
            else if (char === 'b') color = '#00f3ff'; // Cyan
            else if (char === 'r') color = '#ff005b'; // Pink/Red
            else if (char === 'y') color = '#ffbe00'; // Yellow
            else if (char === 'g') color = '#39ff14'; // Green
            else if (char === 's') color = '#8c88a5'; // Metallic grey
            
            ctx.fillStyle = color;
            ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
        }
    }
    ctx.restore();
}

// High Score Syncing with LocalStorage
function loadHighScores() {
    const stored = localStorage.getItem('galaga_high_scores');
    if (stored) {
        highScores = JSON.parse(stored);
    } else {
        // Defaults
        highScores = [
            { name: 'KIM', score: 25000 },
            { name: 'LEE', score: 18000 },
            { name: 'PAR', score: 15000 },
            { name: 'CHO', score: 12000 },
            { name: 'MIN', score: 8000 }
        ];
        saveHighScores();
    }
    renderLeaderboard();
}

function saveHighScores() {
    localStorage.setItem('galaga_high_scores', JSON.stringify(highScores));
}

function renderLeaderboard() {
    const container = document.getElementById('leaderboard');
    container.innerHTML = '';
    
    highScores.forEach((entry, idx) => {
        const rank = idx + 1;
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        div.innerHTML = `
            <span class="entry-rank">${rank}ST</span>
            <span class="entry-name">${entry.name}</span>
            <span class="entry-score">${entry.score.toString().padStart(6, '0')}</span>
        `;
        container.appendChild(div);
    });
}

function getScoreRanking(newScore) {
    for (let i = 0; i < highScores.length; i++) {
        if (newScore > highScores[i].score) {
            return i;
        }
    }
    if (highScores.length < 5) {
        return highScores.length;
    }
    return -1;
}

function insertHighScore(name, newScore) {
    const rank = getScoreRanking(newScore);
    if (rank !== -1) {
        highScores.splice(rank, 0, { name: name.toUpperCase(), score: newScore });
        highScores = highScores.slice(0, 5); // Keep top 5
        saveHighScores();
        renderLeaderboard();
    }
}

// User Action Binding (DOM handlers)
document.getElementById('coin-btn').addEventListener('click', () => {
    audio.init();
    audio.playCoin();
    credit++;
    document.getElementById('credit-display').innerText = credit.toString().padStart(2, '0');
    document.getElementById('start-btn').disabled = false;
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (credit > 0 && (gameState === 'COIN_SCREEN' || gameState === 'GAME_OVER')) {
        credit--;
        document.getElementById('credit-display').innerText = credit.toString().padStart(2, '0');
        
        // Start game session
        score = 0;
        lives = 3;
        level = 1;
        localStorage.setItem('galaga_captured', 'false');
        
        document.getElementById('diff-display').innerText = `LVL ${level}`;
        document.getElementById('dual-display').innerText = "READY";
        document.getElementById('dual-display').style.color = "var(--neon-pink)";

        player = new Player();
        setupEnemiesForLevel();
        startDiveTriggers();
        
        gameState = 'PLAYING';
    }
});

// Sound Toggle handler
const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    soundBtn.innerText = `🔊 Sound: ${audio.muted ? 'Off' : 'On'}`;
});

// Reset Leaderboard
document.getElementById('reset-btn').addEventListener('click', () => {
    localStorage.removeItem('galaga_high_scores');
    loadHighScores();
});

// Submit Score name overlay
document.getElementById('submit-score-btn').addEventListener('click', () => {
    const input = document.getElementById('initials-input');
    const name = input.value.trim() || 'AAA';
    insertHighScore(name, score);
    resetToMainMenu();
});

// Key Event Handlers
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Direct game functions
    if (e.code === 'KeyP') {
        // Toggle Pause
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
        }
    }
    
    // Autoplay audio context activation on first keypress
    if (audio.ctx && audio.ctx.state === 'suspended') {
        audio.ctx.resume();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobile virtual buttons mapping
const setupMobileControls = (id, keyName) => {
    const btn = document.getElementById(id);
    
    const triggerStart = (e) => {
        e.preventDefault();
        keys[keyName] = true;
        if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    };
    
    const triggerEnd = (e) => {
        e.preventDefault();
        keys[keyName] = false;
    };
    
    btn.addEventListener('mousedown', triggerStart);
    btn.addEventListener('mouseup', triggerEnd);
    btn.addEventListener('mouseleave', triggerEnd);
    btn.addEventListener('touchstart', triggerStart, { passive: false });
    btn.addEventListener('touchend', triggerEnd, { passive: false });
};

setupMobileControls('touch-left', 'LeftBtn');
setupMobileControls('touch-right', 'RightBtn');
setupMobileControls('touch-fire', 'FireBtn');

// Start everything up
loadHighScores();
requestAnimationFrame(gameLoop);
