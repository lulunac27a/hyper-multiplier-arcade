# 🚀 Hyper-Surge: Multiplier Overdrive

A fast-paced neon arcade game where your score is driven by **6+ stacking,
compounding multiplier systems**. Rather than simple flat points, your score
scales exponentially as you chain combos, execute ricochet trick shots, brave
high-voltage danger zones, and trigger supernova surges.



## ⚡ The Multiplier Mathematical Engine

The core scoring formula calculates the point value for every target destroyed
via multiplicative compounding:

$$\text{Final Score} = \text{Base Points} \times (M_{\text{base}} \times M_{\text{combo}} \times M_{\text{zone}} \times M_{\text{ricochet}} \times M_{\text{precision}} \times M_{\text{harmony}} \times M_{\text{powerup}})$$

### 1. ⚡ Combo Velocity Multiplier ($M_{\text{combo}}$)
- **Range:** $1.0\times \to 10.0\times$ (up to $15.0\times$ with upgrades)
- **Mechanism:** Each hit adds $+0.25\times$ to your combo streak.
- **Decay Gauge:** A HUD timer bar empties over 3.5 seconds. Hitting any target
  refreshes the timer. If it runs out, the combo resets.

### 2. 🌀 Danger Vortex Multiplier ($M_{\text{zone}}$)
- **Range:** $1.8\times \to 4.0\times$
- **Mechanism:** Dynamic shifting vortex fields drift across the arena:
  - **Red Vortex Core:** $2.5\times$ multiplier
  - **Gold Flux Conduit:** $1.8\times$ multiplier
  - **Neutral Grid:** $1.0\times$
- Standing inside a danger zone multiplies all points scored while inside,
  rewarding high-risk positioning over safe camping.

### 3. 🔄 Ricochet Wall Bounces ($M_{\text{ricochet}}$)
- **Range:** $+0.5\times \to +1.0\times$ per bounce
- **Mechanism:** Your energy pulses bounce up to 2 times off the arena
  perimeter. Hitting targets with deflected shots rewards trick-shot
  multipliers!

### 4. 🎯 Precision Bullseye Multiplier ($M_{\text{precision}}$)
- **Range:** $2.0\times \to 3.5\times$
- **Mechanism:** Every target has a glowing center core. Striking within $35\%$
  of the target's center triggers a golden critical explosion with high-pitch
  synthesizer chimes.

### 5. 💎 Color Harmony Chain ($M_{\text{harmony}}$)
- **Range:** $1.0\times \to 4.0\times$
- **Mechanism:** Targets spawn in 3 radiant frequencies (Frost Cyan, Void
  Magenta, Solar Amber). Destroying matching colors in sequence scales your
  harmony chain. Hitting rare Rainbow Prisms awards an instant $4.0\times$
  Harmony boost!

### 6. 🚀 Overdrive Surge Cores ($M_{\text{powerup}}$)
- **Surge Types:**
  - ⚡ **Quantum Surge (2.0x)**: 8 seconds of amplified velocity.
  - ⏳ **Chrono Stasis (3.0x)**: Slows enemies down with a 3x multiplier.
  - 🔥 **Supernova Frenzy (5.0x)**: Screen shake, bass drops, and massive
    rainbow aura.



## 🎮 Controls

| Action | Control |
|---|---|
| **Move Ship** | `W`, `A`, `S`, `D` or Arrow Keys / Touch Drag |
| **Aim** | Mouse Cursor / Finger Touch |
| **Shoot** | Left Click / Hold / `Spacebar` |
| **Auto-Fire** | Toggle button on HUD |
| **Perk Shop** | `E` key or HUD Button |
| **Multiplier Codex** | HUD Button |
| **Pause / Resume** | `P` key |
| **Mute / Audio** | `M` key |



## 🛠️ Multiplier Overclock Perk Shop

Eliminating targets with high active multipliers extracts **Multiplier Shards** ($\lfloor \text{Multiplier} / 5 \rfloor$), which can be permanently spent on:

1. **Base Multiplier Booster**: Starts every run at $+0.25\times$ higher
   baseline.
2. **Combo Grace Capacitor**: Extends the combo decay timer by $+0.8\text{s}$ per level.
3. **Bullseye Precision Core**: Increases Critical hit multiplier by
   $+0.75\times$.
4. **Danger Vortex Resonator**: Amplifies Danger Zone multiplier by
   $+0.5\times$.
5. **Ricochet Overdrive**: Adds $+0.5\times$ extra score per wall deflection.
6. **Supernova Prolong**: Extends powerup durations by $+2.5\text{s}$.



## 🔊 Procedural Audio Synthesis

Hyper-Surge uses the native **Web Audio API** with zero external audio assets or
downloads:
- **Pitch-Scaling Hits:** Hit chimes dynamically shift pitch higher in real time
  as your multiplier climbs ($1\times \to 100\times+$)!
- **Harmonic Chimes:** Distinct crystalline tones for critical bullseyes and
  powerup pickups.
- **Cyberpunk Synth Bassline:** An integrated procedural 16th-note rhythm beat
  that reacts to gameplay.
