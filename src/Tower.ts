import { CONFIG } from './Config';
import { ICard } from './CardSystem';
import { Enemy } from './Enemy';
import { Projectile, IProjectileStats } from './Projectile';
import { ObjectPool } from './Utils';

export class Tower {
    public col: number;
    public row: number;
    public x: number;
    public y: number;
    
    public cards: ICard[] = [];
    public cooldown: number = 0;
    public angle: number = 0;

    constructor(c: number, r: number) {
        this.col = c; 
        this.row = r; 
        this.x = c * 64 + 32; 
        this.y = r * 64 + 32;
    }

    // Статический метод для предпросмотра характеристик
    public static getPreviewStats(cards: ICard[]): any {
        const dummy = new Tower(0, 0);
        dummy.cards = cards;
        return dummy.getStats();
    }

    public addCard(card: ICard) {
        this.cards.push(card);
    }

    // Главная логика: расчет статов на основе карт
    getStats(): IProjectileStats & { range: number, cd: number, projCount: number, spread: number } {
        // Базовые статы
        let s = { 
            range: CONFIG.TOWER.BASE_RANGE, 
            dmg: CONFIG.TOWER.BASE_DMG, 
            cd: CONFIG.TOWER.BASE_CD, 
            speed: 8, 
            color: '#ffd700', 
            effects: [] as any[], 
            pierce: 0,
            projCount: 1, 
            spread: 0
        };

        // Ссылки на типы карт для удобства (ИСПРАВЛЕНО: используем CARD_TYPES)
        const TYPES = CONFIG.CARD_TYPES;

        // Проходимся по всем картам в башне и меняем статы
        this.cards.forEach(c => {
            const lvl = c.level;
            
            // 1. СНАЙПЕР (Урон, Дальность, Скорость)
            if(c.type.id === TYPES.SNIPER.id) { 
                s.range += 60 * lvl; 
                s.dmg += 8 * lvl; 
                s.speed = 15; 
                s.cd += 10; 
                s.color = '#4caf50'; 
                if(lvl >= 3) s.pierce += 1; 
            }
            
            // 2. ОГОНЬ (Сплэш/Взрыв)
            else if(c.type.id === TYPES.FIRE.id) {
                s.dmg += 3 * lvl;
                s.color = '#f44336';
                s.effects.push({ type: 'splash', radius: 40 + (10 * lvl) });
            }
            
            // 3. ЛЕД (Замедление)
            else if(c.type.id === TYPES.ICE.id) {
                s.cd -= 2 * lvl; // Чуть быстрее стреляет
                s.color = '#00bcd4';
                s.effects.push({ type: 'slow', power: 0.3 + (0.1 * lvl), dur: 40 + (20 * lvl) });
            }
            
            // 4. ЗАЛП (Много выстрелов)
            else if(c.type.id === TYPES.MULTISHOT.id) {
                s.projCount += 1 * lvl;
                s.spread = 0.2; // Разброс пуль
                s.dmg = Math.floor(s.dmg * 0.7); // Баланс: меньше урона, но больше пуль
                s.color = '#ff9800';
            }
        });

        return s;
    }
    
    update(enemies: Enemy[], projectiles: Projectile[], pool: ObjectPool<Projectile>) {
        if(this.cooldown > 0) this.cooldown--;

        // Ищем цель
        const s = this.getStats();
        let target: Enemy | null = null;
        let minDist = s.range;

        // Простая логика: ближайший враг
        for(const e of enemies) {
            if(!e.isAlive()) continue;
            const dist = Math.hypot(e.x - this.x, e.y - this.y);
            if(dist <= s.range && dist < minDist) {
                minDist = dist;
                target = e;
            }
        }

        if(target) {
            // Поворот башни
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);

            // Стрельба
            if(this.cooldown <= 0) { 
                // Расчет угла для мульти-выстрела
                const startAngle = this.angle - (s.spread * (s.projCount - 1)) / 2;
                
                for(let i = 0; i < s.projCount; i++) {
                    const currentAngle = startAngle + i * s.spread;
                    
                    // Создаем "фиктивную" точку цели по направлению угла
                    const fakeTarget = {
                        x: this.x + Math.cos(currentAngle) * 100,
                        y: this.y + Math.sin(currentAngle) * 100
                    };

                    const p = pool.obtain();
                    p.init(this.x, this.y, fakeTarget, s);
                    projectiles.push(p);
                }
                
                this.cooldown = s.cd; 
            }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        // Основание
        ctx.fillStyle = CONFIG.COLORS.TOWER_BASE; 
        ctx.beginPath(); ctx.arc(this.x, this.y, 20, 0, Math.PI*2); ctx.fill();

        // Карты (индикаторы вокруг)
        for(let i=0; i<3; i++) {
            const a = (i * (Math.PI*2/3)) - Math.PI/2;
            ctx.beginPath(); 
            ctx.arc(this.x + Math.cos(a)*12, this.y + Math.sin(a)*12, 4, 0, Math.PI*2);
            ctx.fillStyle = this.cards[i] ? this.cards[i].type.color : '#444'; 
            ctx.fill(); ctx.stroke();
        }

        // Пушка (поворачивается)
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle);
        ctx.fillStyle = '#333'; 
        ctx.fillRect(-5, -5, 25, 10);
        
        // Цветная полоска на пушке (по цвету типа урона)
        const stats = this.getStats();
        ctx.fillStyle = stats.color;
        ctx.fillRect(5, -2, 12, 4);
        
        ctx.restore();
    }
}