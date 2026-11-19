/**
 * Hyper-Surge: Multiplier Overdrive - Audio Synthesis Engine
 * Pure procedural Web Audio API - Zero external assets or network requests
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicEnabled = true;
        this.masterVolume = 0.35;
        this.musicVolume = 0.2;
        this.musicTimer = null;
        this.beatIndex = 0;
        this.tempo = 126; // BPM
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (this.musicEnabled && !this.musicTimer) {
            this.startMusic();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        } else if (this.ctx) {
            this.startMusic();
        }
        return this.musicEnabled;
    }

    // Play laser shoot sound
    playShoot(powerLevel = 1) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = powerLevel > 1 ? 'sawtooth' : 'triangle';
        const startFreq = 650 + Math.min(powerLevel * 50, 400);
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

        gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Dynamic hit sound that scales pitch with current multiplier!
    playHit(multiplier = 1, isCrit = false) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Pitch scales up as multiplier climbs (1x to 100x)
        const scale = 1 + Math.min(Math.log2(Math.max(1, multiplier)) * 0.35, 3.0);
        const baseFreq = isCrit ? 520 : 260;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = isCrit ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq * scale, now);
        osc.frequency.exponentialRampToValueAtTime((baseFreq * 0.6) * scale, now + 0.12);

        const vol = this.masterVolume * (isCrit ? 0.6 : 0.4);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);

        // Extra harmonic ping for crits
        if (isCrit) {
            const bell = this.ctx.createOscillator();
            const bellGain = this.ctx.createGain();
            bell.type = 'sine';
            bell.frequency.setValueAtTime(1200 * scale, now);
            bell.frequency.exponentialRampToValueAtTime(800 * scale, now + 0.18);
            bellGain.gain.setValueAtTime(this.masterVolume * 0.5, now);
            bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            bell.connect(bellGain);
            bellGain.connect(this.ctx.destination);
            bell.start(now);
            bell.stop(now + 0.18);
        }
    }

    // Wall Ricochet Ping
    playBounce(bounceCount = 1) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = 440 + Math.min(bounceCount * 120, 1000);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.05);

        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
    }

    // Collect Multiplier Orb / Powerup
    playPowerup(type = 'surge') {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = type === 'supernova' ? [440, 554, 659, 880, 1108] : [330, 415, 493, 659];
        const stepDuration = 0.04;

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * stepDuration;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(this.masterVolume * 0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + stepDuration * 2);
        });
    }

    // Supernova explosive surge
    playSupernova() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub bass drop
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(160, now);
        sub.frequency.exponentialRampToValueAtTime(32, now + 0.45);

        subGain.gain.setValueAtTime(this.masterVolume * 0.8, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        sub.connect(subGain);
        subGain.connect(this.ctx.destination);

        sub.start(now);
        sub.stop(now + 0.45);
    }

    // Multiplier Lost / Reset
    playComboDrop() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

        gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Upgrade Purchased
    playUpgrade() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.05;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(this.masterVolume * 0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    }

    // Procedural Arcade Cyber Synth Rhythm Beat
    startMusic() {
        if (this.musicTimer) clearInterval(this.musicTimer);
        const stepInterval = (60 / this.tempo) / 4 * 1000; // 16th notes

        const bassline = [
            110, 110, 0, 110,  130, 0, 110, 0,
            98,  98,  0, 98,   147, 0, 130, 0
        ];

        this.musicTimer = setInterval(() => {
            if (!this.musicEnabled || this.muted || !this.ctx || this.ctx.state !== 'running') {
                return;
            }
            const now = this.ctx.currentTime;
            const step = this.beatIndex % 16;
            const freq = bassline[step];

            // Bass note
            if (freq > 0) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(this.musicVolume * 0.22, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

                // Filter for warm synth bass
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(500, now);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.12);
            }

            // Hi-hat noise on every offbeat
            if (step % 2 === 1) {
                this.playHiHat(now);
            }

            // Snare/Clap on beats 4 and 12
            if (step === 4 || step === 12) {
                this.playSnare(now);
            }

            this.beatIndex++;
        }, stepInterval);
    }

    playHiHat(now) {
        const bufferSize = this.ctx.sampleRate * 0.02;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.musicVolume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    playSnare(now) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        gain.gain.setValueAtTime(this.musicVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    stopMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }
}

window.soundEngine = new SoundEngine();
