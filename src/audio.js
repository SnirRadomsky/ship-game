export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.1; // Much quieter (was 0.3)
        this.masterGain.connect(this.ctx.destination);
        this.synth = window.speechSynthesis;
        this.enabled = false;

        // Resume context on first interaction
        window.addEventListener('mousedown', () => this.resume(), { once: true });
        window.addEventListener('touchstart', () => this.resume(), { once: true });
        window.addEventListener('keydown', () => this.resume(), { once: true });
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.enabled = true;
    }

    playTone(type) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;

        if (type === 'success') {
            // Happy "Ding-Dong"
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'fail') {
            // Sad "Womp"
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'splash') {
            // Noise burst
            // Web Audio noise buffer trick
            const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 sec
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            // Lowpass filter for water sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.linearRampToValueAtTime(100, now + 0.5);
            
            noise.connect(filter);
            filter.connect(gain);
            
            gain.gain.setValueAtTime(0.2, now); // Reduced splash volume (was 0.5)
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            
            noise.start(now);
            noise.stop(now + 0.5);
        }
    }

    speak(text) {
        if (!this.synth) return;
        // Cancel previous speech to avoid queue buildup
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.2; // Cheerful pitch
        utterance.volume = 1.0;
        
        // Try to find a cheerful voice? 
        // Default is usually fine.
        
        this.synth.speak(utterance);
    }
}
