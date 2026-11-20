/**
 * Hyper-Surge: Multiplier Overdrive - Core Game Engine
 * Features 6+ stacking multiplier systems, dynamic math HUD, particle physics, and wave progression.
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById("gameCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Dimensions
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Game State
        this.isRunning = false;
        this.isPaused = false;
        this.mode = "blitz"; // 'blitz', 'endless', 'sandbox'
        this.score = 0;
        this.highScore = parseInt(
            localStorage.getItem("hyper_mult_highscore") || "0",
            10,
        );
        this.multiplierShards = parseInt(
            localStorage.getItem("hyper_mult_shards") || "0",
            10,
        );
        this.timeLeft = 90; // for Blitz mode
        this.wave = 1;
        this.screenShake = 0;

        // Multiplier Tracking
        this.baseMultiplier = 1.0;
        this.comboMultiplier = 1.0;
        this.maxComboMultiplier = 10.0;
        this.comboTimer = 0;
        this.comboMaxTimer = 3.5; // seconds
        this.lastColorHit = null;
        this.colorStreak = 0;
        this.colorMultiplier = 1.0;
        this.currentZoneMultiplier = 1.0;
        this.powerupMultiplier = 1.0;
        this.activePowerupType = null;
        this.powerupTimer = 0;

        // Statistics
        this.stats = {
            totalHits: 0,
            criticalHits: 0,
            ricochetHits: 0,
            maxMultiplierAchieved: 1.0,
            shardsCollected: 0,
        };

        // Upgrades (Persisted)
        this.upgrades = JSON.parse(
            localStorage.getItem("hyper_mult_upgrades") ||
                JSON.stringify({
                    baseAmp: 0, // +0.25x base
                    comboGrace: 0, // +0.8s combo timer
                    critOverclock: 0, // +0.75x crit boost
                    zoneResonator: 0, // +0.5x danger zone boost
                    bounceMaster: 0, // +0.5x bounce boost
                    overcharge: 0, // +2.5s powerup duration
                }),
        );

        // Player Entity
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            targetX: this.width / 2,
            targetY: this.height / 2,
            radius: 18,
            speed: 450,
            angle: 0,
            shieldPulse: 0,
            inDangerZone: false,
            keys: { w: false, a: false, s: false, d: false, space: false },
        };

        // Input & Controls
        this.mouse = { x: this.width / 2, y: this.height / 2, isDown: false };
        this.autoFire = false;
        this.lastShotTime = 0;
        this.fireRate = 0.16; // seconds between shots

        // Game Entities
        this.projectiles = [];
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.powerupDrops = [];
        this.dangerZones = [];

        // Cached UI Elements
        this.initUI();
        this.setupEvents();
        this.resize();
        this.initDangerZones();
    }

    initUI() {
        this.ui = {
            scoreVal: document.getElementById("scoreVal"),
            highScoreVal: document.getElementById("highScoreVal"),
            multNumber: document.getElementById("multNumber"),
            multBadge: document.getElementById("multBadge"),
            tierTag: document.getElementById("tierTag"),
            comboFill: document.getElementById("comboFill"),
            pillCombo: document.getElementById("pillCombo"),
            pillZone: document.getElementById("pillZone"),
            pillSurge: document.getElementById("pillSurge"),
            pillHarmony: document.getElementById("pillHarmony"),
            zoneStatusDot: document.getElementById("zoneStatusDot"),
            zoneStatusText: document.getElementById("zoneStatusText"),
            powerupTimers: document.getElementById("powerupTimers"),
            timerDisplay: document.getElementById("timerDisplay"),
            shopModal: document.getElementById("shopModal"),
            guideModal: document.getElementById("guideModal"),
            gameOverModal: document.getElementById("gameOverModal"),
            shopShardsVal: document.getElementById("shopShardsVal"),
            autoFireBtn: document.getElementById("autoFireBtn"),
            soundBtn: document.getElementById("soundBtn"),
            musicBtn: document.getElementById("musicBtn"),
        };
        this.updateHUD();
    }

    setupEvents() {
        window.addEventListener("resize", () => this.resize());

        // Keyboard Controls
        window.addEventListener("keydown", (e) => {
            const k = e.key.toLowerCase();
            if (k === "w" || k === "arrowup") this.player.keys.w = true;
            if (k === "a" || k === "arrowleft") this.player.keys.a = true;
            if (k === "s" || k === "arrowdown") this.player.keys.s = true;
            if (k === "d" || k === "arrowright") this.player.keys.d = true;
            if (k === " ") {
                this.player.keys.space = true;
                e.preventDefault();
            }
            if (k === "p") this.togglePause();
            if (k === "m") this.toggleSound();
            if (k === "e") this.openShop();
            if (window.soundEngine) window.soundEngine.init();
        });

        window.addEventListener("keyup", (e) => {
            const k = e.key.toLowerCase();
            if (k === "w" || k === "arrowup") this.player.keys.w = false;
            if (k === "a" || k === "arrowleft") this.player.keys.a = false;
            if (k === "s" || k === "arrowdown") this.player.keys.s = false;
            if (k === "d" || k === "arrowright") this.player.keys.d = false;
            if (k === " ") this.player.keys.space = false;
        });

        // Mouse & Touch Controls
        this.canvas.addEventListener("mousemove", (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button === 0) {
                this.mouse.isDown = true;
                if (window.soundEngine) window.soundEngine.init();
            }
        });

        window.addEventListener("mouseup", (e) => {
            if (e.button === 0) this.mouse.isDown = false;
        });

        // Touch support
        this.canvas.addEventListener(
            "touchmove",
            (e) => {
                if (e.touches.length > 0) {
                    this.mouse.x = e.touches[0].clientX;
                    this.mouse.y = e.touches[0].clientY;
                }
                e.preventDefault();
            },
            { passive: false },
        );

        this.canvas.addEventListener(
            "touchstart",
            (e) => {
                if (e.touches.length > 0) {
                    this.mouse.x = e.touches[0].clientX;
                    this.mouse.y = e.touches[0].clientY;
                    this.mouse.isDown = true;
                    if (window.soundEngine) window.soundEngine.init();
                }
            },
            { passive: true },
        );

        this.canvas.addEventListener("touchend", () => {
            this.mouse.isDown = false;
        });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    initDangerZones() {
        this.dangerZones = [
            {
                x: this.width * 0.35,
                y: this.height * 0.45,
                radius: 140,
                baseMultiplier: 2.5 + this.upgrades.zoneResonator * 0.5,
                type: "danger",
                color: "#f43f5e",
                pulse: 0,
                driftVx: 18,
                driftVy: 12,
            },
            {
                x: this.width * 0.72,
                y: this.height * 0.65,
                radius: 110,
                baseMultiplier: 1.8 + this.upgrades.zoneResonator * 0.3,
                type: "flux",
                color: "#fbbf24",
                pulse: 0.5,
                driftVx: -15,
                driftVy: -10,
            },
        ];
    }

    start(mode = "blitz") {
        this.mode = mode;
        this.score = 0;
        this.wave = 1;
        this.timeLeft = mode === "blitz" ? 90 : 0;
        this.comboMultiplier = 1.0;
        this.comboTimer = 0;
        this.colorStreak = 0;
        this.colorMultiplier = 1.0;
        this.powerupMultiplier = 1.0;
        this.activePowerupType = null;
        this.powerupTimer = 0;

        this.stats = {
            totalHits: 0,
            criticalHits: 0,
            ricochetHits: 0,
            maxMultiplierAchieved: 1.0,
            shardsCollected: 0,
        };

        this.projectiles = [];
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.powerupDrops = [];

        this.player.x = this.width / 2;
        this.player.y = this.height / 2;

        this.isRunning = true;
        this.isPaused = false;

        // Spawn initial targets
        for (let i = 0; i < 8; i++) {
            this.spawnTarget();
        }

        if (window.soundEngine) window.soundEngine.init();
        this.closeAllModals();
        this.updateHUD();
    }

    spawnTarget(isPrism = false) {
        const types = [
            { name: "frost", color: "#38bdf8", points: 60, radius: 18, hp: 1 },
            {
                name: "void",
                color: "#c084fc",
                points: 90,
                radius: 22,
                hp: 1,
                split: true,
            },
            { name: "solar", color: "#fbbf24", points: 150, radius: 26, hp: 2 },
        ];

        let targetData;
        if (isPrism || Math.random() < 0.08) {
            targetData = {
                name: "prism",
                color: "#f43f5e",
                points: 300,
                radius: 24,
                hp: 1,
                isPrism: true,
            };
        } else {
            targetData = types[Math.floor(Math.random() * types.length)];
        }

        // Spawn outside center away from player
        let x, y, dist;
        let attempts = 0;
        do {
            x = Math.random() * (this.width - 160) + 80;
            y = Math.random() * (this.height - 160) + 80;
            dist = Math.hypot(x - this.player.x, y - this.player.y);
            attempts++;
        } while (dist < 180 && attempts < 15);

        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 50 + this.wave * 4;

        this.targets.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: targetData.radius,
            color: targetData.color,
            name: targetData.name,
            points: targetData.points,
            hp: targetData.hp,
            maxHp: targetData.hp,
            isPrism: !!targetData.isPrism,
            split: !!targetData.split,
            spin: 0,
            spinSpeed: (Math.random() - 0.5) * 3,
        });
    }

    shoot() {
        const now = performance.now() / 1000;
        if (now - this.lastShotTime < this.fireRate) return;
        this.lastShotTime = now;

        const dx = this.mouse.x - this.player.x;
        const dy = this.mouse.y - this.player.y;
        const angle = Math.atan2(dy, dx);
        const speed = 720;

        const powerLevel = this.powerupMultiplier > 1 ? 2 : 1;

        // Dual energy bolts
        const offset = 10;
        const perpX = -Math.sin(angle) * offset;
        const perpY = Math.cos(angle) * offset;

        this.projectiles.push({
            x: this.player.x + perpX,
            y: this.player.y + perpY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5,
            bouncesLeft: 2,
            bounceCount: 0,
            trail: [],
            firedInDangerZone: this.player.inDangerZone,
            color: this.player.inDangerZone
                ? "#f43f5e"
                : this.powerupMultiplier > 1
                  ? "#fbbf24"
                  : "#38bdf8",
        });

        if (window.soundEngine) {
            window.soundEngine.playShoot(powerLevel);
        }
    }

    calculateTotalMultiplier(hitDetails = {}) {
        const base = 1.0 + this.upgrades.baseAmp * 0.25;
        const combo = this.comboMultiplier;
        const zone = hitDetails.inZone
            ? hitDetails.zoneMultiplier
            : this.player.inDangerZone
              ? this.currentZoneMultiplier
              : 1.0;
        const bounceBonus =
            1.0 +
            (hitDetails.bounceCount || 0) *
                (0.5 + this.upgrades.bounceMaster * 0.5);
        const precisionBonus = hitDetails.isCrit
            ? 2.0 + this.upgrades.critOverclock * 0.75
            : 1.0;
        const harmony = this.colorMultiplier;
        const powerup = this.powerupMultiplier;

        const total =
            base *
            combo *
            zone *
            bounceBonus *
            precisionBonus *
            harmony *
            powerup;
        return {
            total: Math.max(1.0, total),
            factors: {
                base,
                combo,
                zone,
                bounceBonus,
                precisionBonus,
                harmony,
                powerup,
            },
        };
    }

    onTargetHit(target, projectile, indexT, indexP) {
        // Calculate Bullseye / Precision
        const distToCenter = Math.hypot(
            projectile.x - target.x,
            projectile.y - target.y,
        );
        const isCrit = distToCenter < target.radius * 0.38;

        // Check if inside Danger Zone
        let hitZoneMult = 1.0;
        let inZone = false;
        for (const zone of this.dangerZones) {
            if (
                Math.hypot(target.x - zone.x, target.y - zone.y) < zone.radius
            ) {
                inZone = true;
                hitZoneMult = Math.max(hitZoneMult, zone.baseMultiplier);
            }
        }
        if (projectile.firedInDangerZone) {
            inZone = true;
            hitZoneMult = Math.max(hitZoneMult, this.currentZoneMultiplier);
        }

        // Color Harmony Logic
        if (target.isPrism) {
            this.colorStreak += 2;
            this.colorMultiplier = 4.0;
            this.addFloatingText(
                target.x,
                target.y - 20,
                "RAINBOW HARMONY 4.0x!",
                "#f43f5e",
                16,
            );
        } else if (this.lastColorHit === target.name) {
            this.colorStreak++;
            this.colorMultiplier = Math.min(3.5, 1.0 + this.colorStreak * 0.5);
        } else {
            this.lastColorHit = target.name;
            this.colorStreak = 1;
            this.colorMultiplier = 1.0;
        }

        // Combo Progression
        this.comboMultiplier = Math.min(
            this.maxComboMultiplier + this.upgrades.baseAmp * 1.5,
            this.comboMultiplier + 0.25,
        );
        const grace = this.upgrades.comboGrace * 0.8;
        this.comboTimer = this.comboMaxTimer + grace;

        // Calculate compounded multiplier
        const multData = this.calculateTotalMultiplier({
            inZone,
            zoneMultiplier: hitZoneMult,
            bounceCount: projectile.bounceCount,
            isCrit,
        });

        const activeTotalMult = multData.total;
        const earnedScore = Math.round(target.points * activeTotalMult);
        this.score += earnedScore;

        // Shard currency drops
        const shardsEarned = Math.max(1, Math.floor(activeTotalMult / 5));
        this.multiplierShards += shardsEarned;
        this.stats.shardsCollected += shardsEarned;

        // Update statistics
        this.stats.totalHits++;
        if (isCrit) this.stats.criticalHits++;
        if (projectile.bounceCount > 0) this.stats.ricochetHits++;
        if (activeTotalMult > this.stats.maxMultiplierAchieved) {
            this.stats.maxMultiplierAchieved = activeTotalMult;
        }

        // Audio
        if (window.soundEngine) {
            window.soundEngine.playHit(activeTotalMult, isCrit);
        }

        // Visual FX: Screen Shake proportional to multiplier
        this.screenShake = Math.min(18, 2 + Math.log2(activeTotalMult) * 2);

        // Floating score popup with breakdown details
        let subText = `${target.points} × ${activeTotalMult.toFixed(1)}x`;
        if (isCrit) subText += " [CRIT!]";
        if (projectile.bounceCount > 0)
            subText += ` [${projectile.bounceCount}x BOUNCE]`;
        if (inZone) subText += " [ZONE!]";

        this.addFloatingText(
            target.x,
            target.y,
            `+${earnedScore.toLocaleString()}`,
            isCrit ? "#fbbf24" : "#38bdf8",
            18,
        );
        this.addFloatingText(target.x, target.y + 16, subText, "#94a3b8", 11);

        // Particles explosion
        this.createExplosion(
            target.x,
            target.y,
            target.color,
            isCrit ? 28 : 16,
        );

        // Chance to spawn powerup on high multiplier kills or prisms
        if (
            target.isPrism ||
            (Math.random() < 0.12 && activeTotalMult >= 3.0)
        ) {
            this.spawnPowerupDrop(target.x, target.y);
        }

        // Handle target damage / split
        target.hp--;
        if (target.hp <= 0) {
            if (target.split) {
                // Split void orb into two mini crystals
                for (let s = 0; s < 2; s++) {
                    const ang = Math.random() * Math.PI * 2;
                    this.targets.push({
                        x: target.x + Math.cos(ang) * 15,
                        y: target.y + Math.sin(ang) * 15,
                        vx: Math.cos(ang) * 90,
                        vy: Math.sin(ang) * 90,
                        radius: 12,
                        color: "#a855f7",
                        name: "void",
                        points: 40,
                        hp: 1,
                        maxHp: 1,
                        split: false,
                        spin: 0,
                        spinSpeed: 4,
                    });
                }
            }
            this.targets.splice(indexT, 1);
            // Respawn new target to maintain density
            this.spawnTarget();
        }

        // Remove projectile
        this.projectiles.splice(indexP, 1);
        this.pulseMultiplierBadge();
        this.updateHUD();
    }

    spawnPowerupDrop(x, y) {
        const types = [
            {
                type: "surge",
                name: "2x Surge",
                mult: 2.0,
                color: "#38bdf8",
                duration: 8,
            },
            {
                type: "supernova",
                name: "5x Supernova",
                mult: 5.0,
                color: "#f43f5e",
                duration: 6,
            },
            {
                type: "chrono",
                name: "3x Chrono",
                mult: 3.0,
                color: "#fbbf24",
                duration: 7,
            },
        ];
        const pick = types[Math.floor(Math.random() * types.length)];
        const extraDuration = this.upgrades.overcharge * 2.5;

        this.powerupDrops.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            radius: 12,
            type: pick.type,
            name: pick.name,
            mult: pick.mult,
            color: pick.color,
            duration: pick.duration + extraDuration,
            life: 12, // despawns after 12s if uncollected
        });
    }

    collectPowerup(powerup, index) {
        this.powerupDrops.splice(index, 1);
        this.powerupMultiplier = powerup.mult;
        this.activePowerupType = powerup.name;
        this.powerupTimer = powerup.duration;

        if (window.soundEngine) {
            if (powerup.type === "supernova") {
                window.soundEngine.playSupernova();
            } else {
                window.soundEngine.playPowerup(powerup.type);
            }
        }

        this.addFloatingText(
            this.player.x,
            this.player.y - 30,
            `ACTIVATED: ${powerup.name}!`,
            powerup.color,
            20,
        );
        this.createExplosion(this.player.x, this.player.y, powerup.color, 35);
        this.pulseMultiplierBadge();
    }

    createExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 220;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 3,
                color,
                alpha: 1.0,
                decay: 0.8 + Math.random() * 1.6,
            });
        }
    }

    addFloatingText(x, y, text, color = "#ffffff", size = 14) {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            size,
            alpha: 1.0,
            vy: -45,
            life: 1.0,
        });
    }

    pulseMultiplierBadge() {
        if (!this.ui.multBadge) return;
        this.ui.multBadge.classList.add("pulse");
        clearTimeout(this._badgeTimeout);
        this._badgeTimeout = setTimeout(() => {
            if (this.ui.multBadge) this.ui.multBadge.classList.remove("pulse");
        }, 180);
    }

    update(dt) {
        if (!this.isRunning || this.isPaused) return;

        // Blitz Mode Timer
        if (this.mode === "blitz") {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.gameOver();
                return;
            }
        }

        // Screen Shake decay
        if (this.screenShake > 0) {
            this.screenShake = Math.max(0, this.screenShake - dt * 25);
        }

        // Combo Timer Decay
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            const max = this.comboMaxTimer + this.upgrades.comboGrace * 0.8;
            const pct = Math.max(0, (this.comboTimer / max) * 100);
            if (this.ui.comboFill) this.ui.comboFill.style.width = `${pct}%`;

            if (this.comboTimer <= 0) {
                // Combo dropped!
                if (this.comboMultiplier > 1.2 && window.soundEngine) {
                    window.soundEngine.playComboDrop();
                }
                this.comboMultiplier = 1.0;
                this.colorStreak = 0;
                this.colorMultiplier = 1.0;
                this.lastColorHit = null;
            }
        } else {
            if (this.ui.comboFill) this.ui.comboFill.style.width = "0%";
        }

        // Powerup Timer Decay
        if (this.powerupTimer > 0) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) {
                this.powerupMultiplier = 1.0;
                this.activePowerupType = null;
            }
        }

        // Update Player Movement (Keyboard WASD + smooth acceleration)
        let moveX = 0;
        let moveY = 0;
        if (this.player.keys.w) moveY -= 1;
        if (this.player.keys.s) moveY += 1;
        if (this.player.keys.a) moveX -= 1;
        if (this.player.keys.d) moveX += 1;

        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.7071;
            moveY *= 0.7071;
        }

        this.player.x += moveX * this.player.speed * dt;
        this.player.y += moveY * this.player.speed * dt;

        // Keep player in bounds
        this.player.x = Math.max(
            this.player.radius,
            Math.min(this.width - this.player.radius, this.player.x),
        );
        this.player.y = Math.max(
            this.player.radius,
            Math.min(this.height - this.player.radius, this.player.y),
        );

        // Player angle towards mouse
        this.player.angle = Math.atan2(
            this.mouse.y - this.player.y,
            this.mouse.x - this.player.x,
        );

        // Auto Fire / Continuous Shoot
        if (this.autoFire || this.mouse.isDown || this.player.keys.space) {
            this.shoot();
        }

        // Check Danger Zones positioning
        this.player.inDangerZone = false;
        this.currentZoneMultiplier = 1.0;
        for (const zone of this.dangerZones) {
            // Zone gentle drift
            zone.x += zone.driftVx * dt;
            zone.y += zone.driftVy * dt;
            if (zone.x < zone.radius || zone.x > this.width - zone.radius)
                zone.driftVx *= -1;
            if (zone.y < zone.radius || zone.y > this.height - zone.radius)
                zone.driftVy *= -1;
            zone.pulse = (zone.pulse + dt) % (Math.PI * 2);

            const dist = Math.hypot(
                this.player.x - zone.x,
                this.player.y - zone.y,
            );
            if (dist < zone.radius) {
                this.player.inDangerZone = true;
                this.currentZoneMultiplier = Math.max(
                    this.currentZoneMultiplier,
                    zone.baseMultiplier,
                );
            }
        }

        // Update Projectiles & Ricochet / Bounce Mechanics
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Trail
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 6) p.trail.pop();

            // Wall Bounce
            let bounced = false;
            if (p.x < p.radius) {
                p.x = p.radius;
                p.vx *= -1;
                bounced = true;
            } else if (p.x > this.width - p.radius) {
                p.x = this.width - p.radius;
                p.vx *= -1;
                bounced = true;
            }
            if (p.y < p.radius) {
                p.y = p.radius;
                p.vy *= -1;
                bounced = true;
            } else if (p.y > this.height - p.radius) {
                p.y = this.height - p.radius;
                p.vy *= -1;
                bounced = true;
            }

            if (bounced) {
                p.bouncesLeft--;
                p.bounceCount++;
                if (window.soundEngine)
                    window.soundEngine.playBounce(p.bounceCount);
                this.createExplosion(p.x, p.y, p.color, 6);
                this.addFloatingText(
                    p.x,
                    p.y,
                    `RICOCHET! +${0.5 + this.upgrades.bounceMaster * 0.5}x`,
                    "#10b981",
                    12,
                );

                if (p.bouncesLeft < 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // Projectile vs Target Collision
            for (let j = this.targets.length - 1; j >= 0; j--) {
                const t = this.targets[j];
                const dist = Math.hypot(p.x - t.x, p.y - t.y);
                if (dist < p.radius + t.radius) {
                    this.onTargetHit(t, p, j, i);
                    break;
                }
            }
        }

        // Update Targets
        for (const t of this.targets) {
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.spin += t.spinSpeed * dt;

            // Bounce off walls
            if (t.x < t.radius) {
                t.x = t.radius;
                t.vx *= -1;
            }
            if (t.x > this.width - t.radius) {
                t.x = this.width - t.radius;
                t.vx *= -1;
            }
            if (t.y < t.radius) {
                t.y = t.radius;
                t.vy *= -1;
            }
            if (t.y > this.height - t.radius) {
                t.y = this.height - t.radius;
                t.vy *= -1;
            }
        }

        // Update Powerup Drops
        for (let i = this.powerupDrops.length - 1; i >= 0; i--) {
            const drop = this.powerupDrops[i];
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;
            drop.life -= dt;

            // Player pickup
            const dist = Math.hypot(
                this.player.x - drop.x,
                this.player.y - drop.y,
            );
            if (dist < this.player.radius + drop.radius + 15) {
                this.collectPowerup(drop, i);
                continue;
            }

            if (drop.life <= 0) {
                this.powerupDrops.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.alpha -= part.decay * dt;
            if (part.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update Floating Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const txt = this.floatingTexts[i];
            txt.y += txt.vy * dt;
            txt.life -= dt;
            txt.alpha = Math.max(0, txt.life);
            if (txt.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        this.updateHUD();
    }

    updateHUD() {
        if (!this.ui.scoreVal) return;

        // Score & High Score
        this.ui.scoreVal.textContent = this.score.toLocaleString();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem(
                "hyper_mult_highscore",
                this.highScore.toString(),
            );
        }
        this.ui.highScoreVal.textContent = this.highScore.toLocaleString();

        // Calculate and display Active Multipliers
        const multData = this.calculateTotalMultiplier({
            inZone: this.player.inDangerZone,
            zoneMultiplier: this.currentZoneMultiplier,
            bounceCount: 0,
            isCrit: false,
        });

        const activeTotal = multData.total;
        this.ui.multNumber.textContent = `${activeTotal.toFixed(1)}x`;

        // Multiplier Tier Tag & Colors
        let tierLabel = "STANDARD";
        let tierClass = "tier-1";
        if (activeTotal >= 100) {
            tierLabel = "SUPERNOVA GODLIKE";
            tierClass = "tier-5";
        } else if (activeTotal >= 40) {
            tierLabel = "HYPER SURGE";
            tierClass = "tier-4";
        } else if (activeTotal >= 15) {
            tierLabel = "OVERDRIVE";
            tierClass = "tier-3";
        } else if (activeTotal >= 5) {
            tierLabel = "CHARGED";
            tierClass = "tier-2";
        }
        this.ui.tierTag.textContent = tierLabel;

        // Multiplier Breakdown Factor Pills
        if (this.ui.pillCombo)
            this.ui.pillCombo.textContent = `${this.comboMultiplier.toFixed(1)}x`;
        if (this.ui.pillZone)
            this.ui.pillZone.textContent = `${this.currentZoneMultiplier.toFixed(1)}x`;
        if (this.ui.pillSurge)
            this.ui.pillSurge.textContent = `${this.powerupMultiplier.toFixed(1)}x`;
        if (this.ui.pillHarmony)
            this.ui.pillHarmony.textContent = `${this.colorMultiplier.toFixed(1)}x`;

        // Danger Zone Status Pill
        if (this.player.inDangerZone) {
            this.ui.zoneStatusDot.className = "zone-status-dot danger";
            this.ui.zoneStatusText.textContent = `DANGER VORTEX ACTIVE (${this.currentZoneMultiplier.toFixed(1)}x)`;
        } else {
            this.ui.zoneStatusDot.className = "zone-status-dot";
            this.ui.zoneStatusText.textContent = "NEUTRAL GRID (1.0x)";
        }

        // Active Powerup Indicator
        if (this.ui.powerupTimers) {
            if (this.activePowerupType && this.powerupTimer > 0) {
                this.ui.powerupTimers.innerHTML = `
                    <div class="powerup-pill">
                        <span>⚡ ${this.activePowerupType}</span>
                        <span>${this.powerupTimer.toFixed(1)}s</span>
                    </div>
                `;
            } else {
                this.ui.powerupTimers.innerHTML = "";
            }
        }

        // Timer Display
        if (this.ui.timerDisplay) {
            if (this.mode === "blitz") {
                const mins = Math.floor(this.timeLeft / 60);
                const secs = Math.floor(this.timeLeft % 60);
                this.ui.timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
            } else {
                this.ui.timerDisplay.textContent = `WAVE ${this.wave}`;
            }
        }

        // Save shards
        localStorage.setItem(
            "hyper_mult_shards",
            this.multiplierShards.toString(),
        );
        if (this.ui.shopShardsVal) {
            this.ui.shopShardsVal.textContent =
                this.multiplierShards.toLocaleString();
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();
        // Screen Shake
        if (this.screenShake > 0) {
            const rx = (Math.random() - 0.5) * this.screenShake;
            const ry = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(rx, ry);
        }

        // Draw Ambient Neon Grid
        this.drawBackgroundGrid();

        // Draw Danger Zones
        for (const zone of this.dangerZones) {
            this.drawDangerZone(zone);
        }

        // Draw Powerup Drops
        for (const drop of this.powerupDrops) {
            this.drawPowerupDrop(drop);
        }

        // Draw Targets
        for (const t of this.targets) {
            this.drawTarget(t);
        }

        // Draw Projectiles
        for (const p of this.projectiles) {
            this.drawProjectile(p);
        }

        // Draw Particles
        for (const part of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = part.alpha;
            this.ctx.fillStyle = part.color;
            this.ctx.shadowColor = part.color;
            this.ctx.shadowBlur = 8;
            this.ctx.beginPath();
            this.ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Draw Player Ship
        this.drawPlayer();

        // Draw Floating Text Popups
        for (const txt of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = txt.alpha;
            this.ctx.fillStyle = txt.color;
            this.ctx.font = `800 ${txt.size}px ${getComputedStyle(document.body).fontFamily}`;
            this.ctx.textAlign = "center";
            this.ctx.shadowColor = txt.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fillText(txt.text, txt.x, txt.y);
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    drawBackgroundGrid() {
        const gridSize = 60;
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
        this.ctx.lineWidth = 1;

        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawDangerZone(zone) {
        this.ctx.save();
        const pulseScale = 1.0 + Math.sin(zone.pulse) * 0.06;
        const currentRadius = zone.radius * pulseScale;

        // Gradient Field
        const grad = this.ctx.createRadialGradient(
            zone.x,
            zone.y,
            0,
            zone.x,
            zone.y,
            currentRadius,
        );
        grad.addColorStop(
            0,
            zone.type === "danger"
                ? "rgba(244, 63, 94, 0.15)"
                : "rgba(251, 191, 36, 0.12)",
        );
        grad.addColorStop(
            0.8,
            zone.type === "danger"
                ? "rgba(244, 63, 94, 0.06)"
                : "rgba(251, 191, 36, 0.05)",
        );
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(zone.x, zone.y, currentRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Pulsing dashed boundary ring
        this.ctx.strokeStyle = zone.color;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = zone.color;
        this.ctx.shadowBlur = 12;
        this.ctx.setLineDash([8, 8]);
        this.ctx.beginPath();
        this.ctx.arc(zone.x, zone.y, currentRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Zone Multiplier Watermark
        this.ctx.fillStyle = zone.color;
        this.ctx.font = "800 13px ui-monospace, monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(
            `${zone.type.toUpperCase()} ZONE: ${zone.baseMultiplier.toFixed(1)}x`,
            zone.x,
            zone.y,
        );

        this.ctx.restore();
    }

    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);

        const coreColor = this.player.inDangerZone
            ? "#f43f5e"
            : this.powerupMultiplier > 1
              ? "#fbbf24"
              : "#38bdf8";

        // Engine Thruster glow
        this.ctx.fillStyle = coreColor;
        this.ctx.shadowColor = coreColor;
        this.ctx.shadowBlur = 16;
        this.ctx.beginPath();
        this.ctx.moveTo(-16, -6);
        this.ctx.lineTo(-24 - Math.random() * 8, 0);
        this.ctx.lineTo(-16, 6);
        this.ctx.closePath();
        this.ctx.fill();

        // Ship Neon Body (Apex Arrow)
        this.ctx.fillStyle = "#0f172a";
        this.ctx.strokeStyle = coreColor;
        this.ctx.lineWidth = 2.5;

        this.ctx.beginPath();
        this.ctx.moveTo(20, 0);
        this.ctx.lineTo(-14, -14);
        this.ctx.lineTo(-6, 0);
        this.ctx.lineTo(-14, 14);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Energy Core reactor
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Danger Shield aura
        if (this.player.inDangerZone) {
            this.ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
            this.ctx.lineWidth = 1.5;
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 26, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.restore();

        // Reticle aiming line
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        this.ctx.setLineDash([4, 6]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.stroke();

        // Reticle ring
        this.ctx.strokeStyle = coreColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, 8, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawTarget(t) {
        this.ctx.save();
        this.ctx.translate(t.x, t.y);
        this.ctx.rotate(t.spin);

        this.ctx.shadowColor = t.color;
        this.ctx.shadowBlur = 14;

        if (t.isPrism) {
            // Prismatic Star
            this.ctx.fillStyle = "#ffffff";
            this.ctx.strokeStyle = "#f43f5e";
            this.ctx.lineWidth = 3;
            this.drawStar(0, 0, 5, t.radius, t.radius * 0.45);
        } else if (t.name === "solar") {
            // Heavy hexagon
            this.ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
            this.ctx.strokeStyle = t.color;
            this.ctx.lineWidth = 3;
            this.drawPolygon(0, 0, t.radius, 6);
        } else if (t.name === "void") {
            // Void diamond
            this.ctx.fillStyle = "rgba(20, 15, 35, 0.85)";
            this.ctx.strokeStyle = t.color;
            this.ctx.lineWidth = 2.5;
            this.drawPolygon(0, 0, t.radius, 4);
        } else {
            // Frost Orb
            this.ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
            this.ctx.strokeStyle = t.color;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }

        // Bullseye Critical Core Indicator (Inner glowing circle)
        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, t.radius * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPolygon(x, y, radius, sides) {
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides;
            const px = x + radius * Math.cos(angle);
            const py = y + radius * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawProjectile(p) {
        this.ctx.save();

        // Projectile Trail
        if (p.trail.length > 1) {
            this.ctx.strokeStyle = p.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            for (let i = 0; i < p.trail.length; i++) {
                const pt = p.trail[i];
                if (i === 0) this.ctx.moveTo(pt.x, pt.y);
                else this.ctx.lineTo(pt.x, pt.y);
            }
            this.ctx.stroke();
        }

        // Projectile Head
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawPowerupDrop(drop) {
        this.ctx.save();
        this.ctx.shadowColor = drop.color;
        this.ctx.shadowBlur = 16;
        this.ctx.fillStyle = drop.color;
        this.ctx.beginPath();
        this.ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(drop.x, drop.y, drop.radius + 3, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "700 10px ui-monospace, monospace";
        this.ctx.textAlign = "center";
        this.ctx.fillText(drop.mult + "x", drop.x, drop.y - 12);
        this.ctx.restore();
    }

    // Modal & Menu Controls
    toggleAutoFire() {
        this.autoFire = !this.autoFire;
        if (this.ui.autoFireBtn) {
            this.ui.autoFireBtn.classList.toggle("active", this.autoFire);
            this.ui.autoFireBtn.innerHTML = this.autoFire
                ? "<span>⚡ Auto-Fire: ON</span>"
                : "<span>⚡ Auto-Fire: OFF</span>";
        }
    }

    toggleSound() {
        if (!window.soundEngine) return;
        const isMuted = window.soundEngine.toggleMute();
        if (this.ui.soundBtn) {
            this.ui.soundBtn.innerHTML = isMuted
                ? "<span>🔇 Sound: OFF</span>"
                : "<span>🔊 Sound: ON</span>";
        }
    }

    toggleMusic() {
        if (!window.soundEngine) return;
        const isMusic = window.soundEngine.toggleMusic();
        if (this.ui.musicBtn) {
            this.ui.musicBtn.innerHTML = isMusic
                ? "<span>🎵 Music: ON</span>"
                : "<span>🎵 Music: OFF</span>";
        }
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
    }

    openShop() {
        this.isPaused = true;
        this.renderShopItems();
        if (this.ui.shopModal) this.ui.shopModal.classList.add("open");
    }

    closeShop() {
        if (this.ui.shopModal) this.ui.shopModal.classList.remove("open");
        this.isPaused = false;
    }

    openGuide() {
        this.isPaused = true;
        if (this.ui.guideModal) this.ui.guideModal.classList.add("open");
    }

    closeGuide() {
        if (this.ui.guideModal) this.ui.guideModal.classList.remove("open");
        this.isPaused = false;
    }

    closeAllModals() {
        if (this.ui.shopModal) this.ui.shopModal.classList.remove("open");
        if (this.ui.guideModal) this.ui.guideModal.classList.remove("open");
        if (this.ui.gameOverModal)
            this.ui.gameOverModal.classList.remove("open");
    }

    renderShopItems() {
        const shopContainer = document.getElementById("shopList");
        if (!shopContainer) return;

        const shopCatalog = [
            {
                id: "baseAmp",
                name: "Base Multiplier Booster",
                desc: "Increases permanent starting multiplier by +0.25x",
                baseCost: 15,
                current: this.upgrades.baseAmp,
            },
            {
                id: "comboGrace",
                name: "Combo Grace Capacitor",
                desc: "Adds +0.8s to the combo decay timer",
                baseCost: 20,
                current: this.upgrades.comboGrace,
            },
            {
                id: "critOverclock",
                name: "Bullseye Precision Core",
                desc: "Increases Critical Bullseye multiplier by +0.75x",
                baseCost: 25,
                current: this.upgrades.critOverclock,
            },
            {
                id: "zoneResonator",
                name: "Danger Vortex Resonator",
                desc: "Boosts Danger Zone multiplier by +0.5x",
                baseCost: 30,
                current: this.upgrades.zoneResonator,
            },
            {
                id: "bounceMaster",
                name: "Ricochet Overdrive",
                desc: "Wall bounces add +0.5x extra multiplier per deflection",
                baseCost: 20,
                current: this.upgrades.bounceMaster,
            },
            {
                id: "overcharge",
                name: "Supernova Prolong",
                desc: "Powerups last +2.5s longer",
                baseCost: 35,
                current: this.upgrades.overcharge,
            },
        ];

        shopContainer.innerHTML = "";
        shopCatalog.forEach((item) => {
            const cost = Math.round(
                item.baseCost * Math.pow(1.6, item.current),
            );
            const row = document.createElement("div");
            row.className = "shop-item-row";
            row.innerHTML = `
                <div class="shop-item-info">
                    <span class="shop-item-name">${item.name} <small style="color:#a855f7;">(Lv. ${item.current})</small></span>
                    <span class="shop-item-desc">${item.desc}</span>
                </div>
                <button class="shop-buy-btn" data-id="${item.id}" ${this.multiplierShards < cost ? "disabled" : ""}>
                    ${cost} Shards
                </button>
            `;

            const btn = row.querySelector(".shop-buy-btn");
            btn.addEventListener("click", () => {
                if (this.multiplierShards >= cost) {
                    this.multiplierShards -= cost;
                    this.upgrades[item.id]++;
                    localStorage.setItem(
                        "hyper_mult_upgrades",
                        JSON.stringify(this.upgrades),
                    );
                    if (window.soundEngine) window.soundEngine.playUpgrade();
                    this.initDangerZones();
                    this.renderShopItems();
                    this.updateHUD();
                }
            });

            shopContainer.appendChild(row);
        });
    }

    gameOver() {
        this.isRunning = false;
        if (window.soundEngine) window.soundEngine.playComboDrop();

        const finalScoreVal = document.getElementById("finalScoreVal");
        const finalMaxMult = document.getElementById("finalMaxMult");
        const finalCrits = document.getElementById("finalCrits");
        const finalBounces = document.getElementById("finalBounces");

        if (finalScoreVal)
            finalScoreVal.textContent = this.score.toLocaleString();
        if (finalMaxMult)
            finalMaxMult.textContent = `${this.stats.maxMultiplierAchieved.toFixed(1)}x`;
        if (finalCrits)
            finalCrits.textContent = this.stats.criticalHits.toString();
        if (finalBounces)
            finalBounces.textContent = this.stats.ricochetHits.toString();

        if (this.ui.gameOverModal) this.ui.gameOverModal.classList.add("open");
    }
}

// Global Game Loop
window.addEventListener("load", () => {
    window.game = new GameEngine();

    let lastTime = performance.now();
    function loop(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        window.game.update(dt);
        window.game.render();

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Auto-start initial blitz run
    window.game.start("blitz");
});
