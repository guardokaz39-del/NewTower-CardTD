import { CONFIG } from './Config';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';

export class Tower {
    public col: number; public row: number; public x: number; public y: number;
    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;
    public damageDealt: number = 0;

    constructor(c: number, r: number) {
        this.col = c; this.row = r; this.x = c * 64 + 32; this.y = r * 64 + 32;
    }

    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0); dummy.cards = cards; return dummy.getStats();
    }

    public addCard(card: ICard) { this.cards.push(card); }

    getStats(): IProjectileStats & { range: number, cd: number, projCount: number, spread: number } {
        let s = { 
            range: CONFIG.TOWER.BASE_RANGE, 
            dmg: CONFIG.TOWER.BASE_DMG, 
            cd: CONFIG.TOWER.BASE_CD, 
            speed: 8, 
            color: '#ffd700', 
            effects: [] as any[], 
            pierce: 0,
            projCount: 1, 
            spread: 0,
            critChance: 0
        };

        const TYPES = CONFIG.CARD_TYPES;

        this.cards.forEach(c => {
            const lvl = c.level;
            
            // --- ОГОНЬ ---
            if(c.type.id === TYPES.FIRE.id) {
                s.color = TYPES.FIRE.color;
                if (lvl === 1) {
                    s.dmg += 5; s.cd *= 1.15;
                    s.effects.push({ type: 'splash', radius: 40 });
                } else if (lvl === 2) {
                    s.dmg += 15; s.cd *= 1.10;
                    s.effects.push({ type: 'splash', radius: 70 });
                } else if (lvl >= 3) {
                    s.dmg += 25;
                    s.effects.push({ type: 'splash', radius: 70 });
                    s.effects.push({ type: 'killExplode', power: 0.5 }); 
                }
            }
            
            // --- ЛЕД ---
            else if(c.type.id === TYPES.ICE.id) {
                s.color = TYPES.ICE.color;
                if (lvl === 1) {
                    s.range -= 20;
                    s.effects.push({ type: 'slow', power: 0.2, dur: 40 });
                } else if (lvl === 2) {
                    s.range -= 40;
                    s.effects.push({ type: 'slow', power: 0.35, dur: 60, amp: 0.2 });
                } else if (lvl >= 3) {
                    s.range -= 40;
                    s.effects.push({ type: 'slow', power: 0.65, dur: 80, amp: 0.25 });
                    s.effects.push({ type: 'killFreeze' });
                }
            }
            
            // --- СНАЙПЕР ---
            else if(c.type.id === TYPES.SNIPER.id) {
                s.color = TYPES.SNIPER.color;
                s.speed = 18;
                if (lvl === 1) {
                    s.dmg += 20; s.cd *= 1.5; s.range += 60; s.critChance += 0.25;
                } else if (lvl === 2) {
                    s.dmg += 40; s.cd *= 1.5; s.range += 100; s.critChance += 0.35;
                } else if (lvl >= 3) {
                    s.dmg += 70; s.cd *= 1.3; s.range += 150; s.critChance += 0.50; s.pierce += 2;
                }
            }
            
            // --- ЗАЛП ---
            else if(c.type.id === TYPES.MULTISHOT.id) {
                s.color = TYPES.MULTISHOT.color;
                s.spread = 0.2;
                if (lvl === 1) {
                    s.projCount = 2; s.dmg = Math.floor(s.dmg * 0.55);
                } else if (lvl === 2) {
                    s.projCount = 2; s.dmg = Math.floor(s.dmg * 0.65);
                } else if (lvl >= 3) {
                    s.projCount = 3; s.dmg = Math.floor(s.dmg * 0.50);
                }
            }
        });

        s.range = Math.max(50, s.range);
        s.cd = Math.max(5, s.cd);

        return s;
    }
    
    update(enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>) {
        if(this.cooldown > 0) this.cooldown--;
        const s = this.getStats();
        
        let target: Enemy | null = null;
        let minDist = s.range;

        for(const e of enemies) {
            if(!e.isAlive()) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if(dist <= s.range && dist < minDist) {
                minDist = dist;
                target = e;
            }
        }

        if(target) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            if(this.cooldown <= 0) { 
                const startAngle = this.angle - (s.spread * (s.projCount - 1)) / 2;
                for(let i = 0; i < s.projCount; i++) {
                    const currentAngle = startAngle + i * s.spread;
                    const p = pool.obtain();
                    p.init(this.x, this.y, currentAngle, s, this); 
                    projectiles.push(p);
                }
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = CONFIG.COLORS.TOWER_BASE; ctx.beginPath(); ctx.arc(this.x, this.y, 22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
        for(let i=0; i<3; i++) {
            const a = (i * (Math.PI*2/3)) - Math.PI/2;
            ctx.beginPath(); ctx.arc(this.x + Math.cos(a)*14, this.y + Math.sin(a)*14, 5, 0, Math.PI*2);
            if (this.cards[i]) { ctx.fillStyle = this.cards[i].type.color; ctx.fill(); ctx.stroke(); } 
            else { ctx.fillStyle = '#222'; ctx.fill(); }
        }
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#444'; ctx.fillRect(-6, -6, 28, 12);
        const stats = this.getStats();
        ctx.fillStyle = stats.color; ctx.fillRect(8, -2, 12, 4);
        ctx.restore();
    }
}