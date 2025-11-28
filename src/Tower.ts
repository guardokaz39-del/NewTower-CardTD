import { CONFIG } from './Config';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';
import { EffectSystem } from './EffectSystem';

export class Tower {
    public col: number;
    public row: number;
    public x: number;
    public y: number;
    
    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;

    // Новые свойства для постройки
    public isBuilding: boolean = false;
    public buildProgress: number = 0;
    public maxBuildProgress: number = CONFIG.TOWER.BUILD_TIME;

    constructor(c: number, r: number) {
        this.col = c; 
        this.row = r; 
        this.x = c * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2; 
        this.y = r * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    }

    // Статический метод для предпросмотра (Ghost)
    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

    getStats(): IProjectileStats & { range: number, cd: number, projCount: number, spread: number } {
        let s = { 
            range: CONFIG.TOWER.BASE_RANGE, 
            dmg: CONFIG.TOWER.BASE_DMG, 
            cd: CONFIG.TOWER.BASE_CD, 
            speed: 8, color: '#ffd700', effects: [] as any[], pierce: 0, projCount: 1, spread: 0
        };

        this.cards.forEach(c => {
            const lvl = c.level;
            const type = c.type.id;
            if(type === 'sniper') { 
                s.range += CONFIG.CARDS.SNIPER.RANGE_PER_LVL * lvl; 
                s.dmg += CONFIG.CARDS.SNIPER.DAMAGE_PER_LVL * lvl; 
                s.speed = CONFIG.CARDS.SNIPER.SPEED_SET; 
                if(lvl >= CONFIG.CARDS.SNIPER.PIERCE_LVL_REQ) s.pierce += 1; 
                s.color = '#4caf50'; 
            }
            if(type === 'fire') { 
                s.effects.push({ type: 'splash', radius: CONFIG.CARDS.FIRE.SPLASH_RADIUS_BASE + (lvl * CONFIG.CARDS.FIRE.SPLASH_PER_LVL) });
                s.dmg += CONFIG.CARDS.FIRE.DAMAGE_PER_LVL * lvl;
                s.cd += CONFIG.CARDS.FIRE.CD_INCREASE; s.speed = 6; s.color = '#f44336'; 
            }
            if(type === 'ice') { 
                s.effects.push({ type: 'slow', dur: CONFIG.CARDS.ICE.SLOW_DUR_BASE + (lvl * CONFIG.CARDS.ICE.SLOW_DUR_PER_LVL), power: CONFIG.CARDS.ICE.SLOW_POWER });
                s.dmg += CONFIG.CARDS.ICE.DAMAGE_PER_LVL * lvl;
                s.color = '#00bcd4'; s.speed = 10; 
            }
        });

        const multiCards = this.cards.filter(c => c.type.id === 'multi');
        if (multiCards.length > 0) {
            s.projCount = 1 + Math.max(...multiCards.map(c => c.level)); 
            s.spread = 0.3; s.dmg *= CONFIG.CARDS.MULTI.DMG_PENALTY; s.color = '#ff9800';
        }
        return s;
    }

    addCard(c: ICard): boolean { 
        if(this.cards.length < 3) { this.cards.push(c); return true; } 
        return false; 
    }
    
    update(enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>, effects: EffectSystem) {
        // 1. Логика постройки
        if (this.isBuilding) {
            this.buildProgress++;
            if (this.buildProgress >= this.maxBuildProgress) {
                this.isBuilding = false; // Постройка завершена
                effects.add({type: 'explosion', x: this.x, y: this.y, radius: 30, life: 20, color: '#ffffff'});
            }
            return; // Пока строится, не стреляет
        }

        // 2. Логика стрельбы
        if(this.cooldown > 0) this.cooldown--;
        
        const s = this.getStats();
        let target: Enemy | null = null;
        let minDistance = s.range + 1;

        // ОПТИМИЗАЦИЯ: Быстрый поиск ближайшего врага
        for (const e of enemies) {
            if (!e.isAlive()) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= s.range && dist < minDistance) {
                minDistance = dist;
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
                    // Стреляем немного на упреждение или в текущую точку
                    p.init(this.x, this.y, {x: target.x, y: target.y}, s);
                    projectiles.push(p);
                }
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        const size = CONFIG.TILE_SIZE;
        const drawX = this.col * size;
        const drawY = this.row * size;

        if (this.isBuilding) {
            // Рисуем фундамент и прогресс-бар
            ctx.fillStyle = 'rgba(158, 158, 158, 0.5)';
            ctx.fillRect(drawX + 5, drawY + 5, size - 10, size - 10);
            
            // Прогресс бар
            const barWidth = size - 10;
            const barHeight = 8;
            const progressPct = this.buildProgress / this.maxBuildProgress;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(drawX + 5, drawY + size - 15, barWidth, barHeight);
            ctx.fillStyle = 'gold';
            ctx.fillRect(drawX + 5, drawY + size - 15, barWidth * progressPct, barHeight);
            
        } else {
            // Рисуем готовую башню
            ctx.fillStyle = CONFIG.COLORS.TOWER_BASE; 
            ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();

            // Индикаторы карт
            for(let i=0; i<3; i++) {
                const a = (i * (Math.PI*2/3)) - Math.PI/2;
                ctx.beginPath(); 
                ctx.arc(this.x + Math.cos(a)*12, this.y + Math.sin(a)*12, 5, 0, Math.PI*2);
                ctx.fillStyle = this.cards[i] ? this.cards[i].type.color : '#333'; 
                ctx.fill(); ctx.strokeStyle = '#222'; ctx.stroke();
            }

            // Пушка
            ctx.save(); 
            ctx.translate(this.x, this.y); 
            ctx.rotate(this.angle);
            ctx.fillStyle = '#333'; ctx.fillRect(0, -5, 20, 10);
            ctx.restore();
        }
    }
}