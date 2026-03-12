// ─── Notification Sounds ──────────────────────────────────────────────────────
// Generates simple notification tones using the Web Audio API.
// No external sound files needed — everything is synthesized.

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

const SOUNDS = {
  ping: (ctx, vol) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  },
  pop: (ctx, vol) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  },
  chime: (ctx, vol) => {
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(vol * 0.7, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  },
};

export function playNotificationSound(soundType = 'ping', volume = 80) {
  if (soundType === 'none' || !soundType) return;
  try {
    const ctx = getCtx();
    const vol = Math.max(0, Math.min(1, volume / 100));
    const fn = SOUNDS[soundType] || SOUNDS.ping;
    fn(ctx, vol);
  } catch (e) {
    // Audio not available — silently fail
  }
}
