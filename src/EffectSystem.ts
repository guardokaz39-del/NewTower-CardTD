export interface IEffect {
    type: 'explosion' | 'text' | 'particle' | 'scan';
    x: number;
    y: number;
    life: number;     
    maxLife?: number;
    
    radius?: number;
    color?: string;
    text?: string;
    vx?: number;
    vy?: number;
    size?: number; // Размер частицы
}

export class EffectSystem {
    private effects: IEffect[] = [];
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    public add(effect: IEffect) {
        if (!effect.maxLife) effect.maxLife = effect.life;
        this.effects.push(effect);
    }

    // Создать взрыв из частиц (Juice helper)
    public spawnParticles(x: number, y: number, color: string, count: number = 10) {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.add({
                type: 'particle',
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }

    public update() {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.life--;

            if (e.life <= 0) {
                this.effects.splice(i, 1);
                continue;
            }

            if (e.type === 'particle' || e.type === 'text') {
                if (e.vx) e.x += e.vx;
                if (e.vy) e.y += e.vy;
                
                // Гравитация для частиц
                if (e.type === 'particle') e.vy! += 0.1;
            }
        }
    }

    public draw() {
        this.effects.forEach(e => {
            const progress = e.life / (e.maxLife || 1);
            this.ctx.save();
            this.ctx.globalAlpha = progress;

            if (e.type === 'explosion') {
                this.ctx.fillStyle = e.color || 'orange';
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, e.radius || 30, 0, Math.PI * 2);
                this.ctx.fill();
            }
            else if (e.type === 'text') {
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.font = "900 20px 'Segoe UI', sans-serif";
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(e.text || '', e.x, e.y);
                this.ctx.fillText(e.text || '', e.x, e.y);
            }
            else if (e.type === 'particle') {
                this.ctx.fillStyle = e.color || '#fff';
                this.ctx.fillRect(e.x, e.y, e.size || 3, e.size || 3);
            }
            else if (e.type === 'scan') {
                // Кольцо расширяется
                const radius = (1 - progress) * (e.radius || 50);
                this.ctx.strokeStyle = e.color || 'white';
                this.ctx.lineWidth = 2 * progress;
                this.ctx.beginPath();
                this.ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            this.ctx.restore();
        });
    }
}