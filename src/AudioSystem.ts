export class AudioSystem {
    private ctx: AudioContext;
    private masterGain: GainNode;
    private isMuted: boolean = false;

    constructor() {
        // Поддержка разных браузеров
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Громкость 30%
        this.masterGain.connect(this.ctx.destination);
    }

    // ВАЖНО: Убедитесь, что здесь скобки пустые -> init()
    public async init() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    private playTone(freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', duration: number, vol: number = 1) {
        if (this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playShoot(type: 'sniper' | 'fire' | 'ice' | 'default') {
        if (type === 'sniper') this.playTone(800, 'square', 0.1, 0.5);
        else if (type === 'fire') this.playTone(150, 'sawtooth', 0.3, 0.6);
        else if (type === 'ice') this.playTone(1200, 'sine', 0.1, 0.4);
        else this.playTone(400, 'triangle', 0.1, 0.3);
    }

    public playHit() {
        this.playTone(100 + Math.random() * 50, 'sawtooth', 0.05, 0.2);
    }

    public playBuild() {
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.1), 100);
    }

    public playGold() {
        this.playTone(1500, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(2000, 'sine', 0.2, 0.3), 50);
    }
    
    public playWaveStart() {
        this.playTone(200, 'sawtooth', 1.0, 0.5);
    }
}