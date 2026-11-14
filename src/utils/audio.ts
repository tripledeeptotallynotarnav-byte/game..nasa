interface AmbientState {
  active: boolean;
  isDustStorm: boolean;
  isEmergency: boolean;
}

class MissionAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private lastSliderTick = 0;

  // Continuous synthesized Martian wind soundscape nodes
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private ambientState: AmbientState = { active: false, isDustStorm: false, isEmergency: false };

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.syncAmbientNodes();
    return this.ctx;
  }

  private startWindNodes(ctx: AudioContext) {
    if (this.windSource) return;
    try {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Soft brown/pinkish noise for thin Martian wind
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 185;
      filter.Q.value = 1.6;

      const gain = ctx.createGain();
      gain.gain.value = 0.001;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.22;
      lfoGain.gain.value = 55;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      src.start();
      lfo.start();

      this.windSource = src;
      this.windFilter = filter;
      this.windGain = gain;
      this.windLfo = lfo;
    } catch {
      // Ignore audio hardware restrictions
    }
  }

  private syncAmbientNodes() {
    if (!this.ctx) return;
    if (!this.ambientState.active || this.muted) {
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      }
      return;
    }
    if (!this.windSource) {
      this.startWindNodes(this.ctx);
    }
    if (this.windGain && this.windFilter && this.windLfo) {
      const now = this.ctx.currentTime;
      const targetGain = this.ambientState.isDustStorm
        ? 0.085
        : this.ambientState.isEmergency
        ? 0.055
        : 0.025;
      const targetFreq = this.ambientState.isDustStorm ? 360 : 185;
      const targetLfo = this.ambientState.isDustStorm ? 0.55 : 0.22;

      this.windGain.gain.setTargetAtTime(targetGain, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
      this.windLfo.frequency.setTargetAtTime(targetLfo, now, 0.4);
    }
  }

  public setAmbientCondition(next: AmbientState) {
    this.ambientState = next;
    if (next.active && !this.muted && this.ctx) {
      this.syncAmbientNodes();
    } else if (this.ctx) {
      this.syncAmbientNodes();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) {
      this.syncAmbientNodes();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.05);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playSliderTick(pitchFactor = 1) {
    const nowMs = Date.now();
    if (nowMs - this.lastSliderTick < 55) return;
    this.lastSliderTick = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 320 + Math.min(300, Math.max(0, pitchFactor * 220));
    osc.frequency.setValueAtTime(baseFreq, now);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playMoxieTurbine() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [118, 177].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * 0.75, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.65);
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  public playSolarServoSweep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.25);
    osc.frequency.linearRampToValueAtTime(220, now + 0.55);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playShieldSurge() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.32);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  public playBiodomeMist() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [587.33, 739.99, 880];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.04, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playTelemetryChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [880, 1174.66];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.035, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  public playSolAdvance() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.19);
    });
  }

  public playWarningKlaxon() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    [0, 0.16].forEach((offset) => {
      const start = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, start);
      osc.frequency.linearRampToValueAtTime(240, start + 0.12);
      gain.gain.setValueAtTime(0.045, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  public playStepConfirm() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [523.25, 659.25];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.055, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  public playHazardImpact() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.35);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playMissionComplete(victory: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = victory ? [523.25, 659.25, 783.99, 1046.5] : [392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = victory ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.065, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }
}

export const missionAudio = new MissionAudioEngine();
