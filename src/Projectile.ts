import { Enemy } from './Enemy';
import { EffectSystem } from './EffectSystem';
import { Tower } from './Tower';
import { CONFIG } from './Config';

export interface IProjectileStats {
    dmg: number;
    speed: number;
    color: string;
    effects: any[];
    pierce: number;
    critChance?: number; // Шанс крита
}

export class Projectile {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public rotation: number = 0;
    public alive: boolean = false;
    
    public damage: number = 0;
    public life: number = 0;
    public color: string = '#fff';
    public effects: any[] = [];
    public pierce: number = 0;
    public critChance: number = 0;
    public hitList: Enemy[] = [];
    public source: Tower | null = null;

    constructor() {
        this.reset();
    }

    init(x: number, y: number, angle: number, stats: IProjectileStats, source: Tower) {
        this.x = x; 
        this.y = y; 
        this.rotation = angle;
        
        this.vx = Math.cos(angle) * stats.speed;
        this.vy = Math.sin(angle) * stats.speed;
        
        this.alive = true;
        this.life = 60; // 1 секунда жизни
        
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects;
        this.pierce = stats.pierce || 0; 
        this.critChance = stats.critChance || 0;
        
        this.hitList = [];
        this.source = source;
    }

    reset() {
        this.alive = false;
        this.hitList = [];
        this.source = null;
    }

    update(enemies: Enemy[], effectsSys: EffectSystem) {
        if (!this.alive) return;

        this.x += this.vx; 
        this.y += this.vy; 
        this.life--;
        
        if(this.life <= 0 || this.x < 0 || this.x > window.innerWidth || this.y < 0 || this.y > window.innerHeight) {
            this.alive = false;
            return;
        }

        // Коллизии
        for(let e of enemies) {
            if (!e.isAlive()) continue;
            if(this.hitList.indexOf(e) !== -1) continue;
            
            // Проверка попадания (дистанция < 20)
            if (Math.hypot(e.x - this.x, e.y - this.y) < 20) {
                this.hit(e, effectsSys, enemies); // Передаем список всех врагов для AOE
                
                if(this.pierce > 0) { 
                    this.pierce--; 
                    this.damage = Math.floor(this.damage * 0.85); // Штраф за пробитие
                    this.hitList.push(e); 
                } else { 
                    this.alive = false; 
                    break; 
                }
            }
        }
    }

    hit(target: Enemy, effectsSys: EffectSystem, allEnemies: Enemy[]) {
        // 1. Расчет КРИТА
        let finalDamage = this.damage;
        let isCrit = false;
        
        if (Math.random() < this.critChance) {
            isCrit = true;
            finalDamage *= 2.0; 
        }

        // 2. Нанесение урона
        target.takeDamage(finalDamage);
        
        // Статистика башни
        if (this.source) {
            this.source.damageDealt += finalDamage;
        }

        // 3. Визуальный текст урона
        effectsSys.add({ 
            type: 'text', 
            text: Math.floor(finalDamage).toString(), 
            x: target.x, y: target.y - 20, 
            life: 40, 
            color: isCrit ? CONFIG.COLORS.CRIT : '#fff',
            vy: -1
        });
        
        // Тряска при крите
        if (isCrit) {
             document.body.style.transform = `translate(${Math.random()*4-2}px, ${Math.random()*4-2}px)`;
             setTimeout(() => document.body.style.transform = 'none', 50);
        }

        // 4. Эффекты (Splash, Slow, Death triggers)
        
        // Splash (Огонь)
        const splash = this.effects.find(e => e.type === 'splash');
        if (splash) {
            effectsSys.add({ type: 'explosion', x: target.x, y: target.y, radius: splash.radius, life: 15, color: this.color });
            allEnemies.forEach(neighbor => {
                if (neighbor !== target && neighbor.isAlive() && Math.hypot(neighbor.x - target.x, neighbor.y - target.y) < splash.radius!) {
                    neighbor.takeDamage(finalDamage * 0.7); 
                }
            });
        }

        // Slow (Лед)
        const slow = this.effects.find(e => e.type === 'slow');
        if (slow) {
            target.applyStatus('slow', slow.dur, slow.power, slow.amp); 
        }

        // Kill Effects (сохраняем во врага, сработают при смерти)
        const killExplode = this.effects.find(e => e.type === 'killExplode');
        if (killExplode) {
            target.deathEffects.push({ type: 'explode', dmg: this.source ? this.source.getStats().dmg * killExplode.power : 10 });
        }
        
        const killFreeze = this.effects.find(e => e.type === 'killFreeze');
        if (killFreeze) {
            target.deathEffects.push({ type: 'freeze' });
        }
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        // Рисуем трассер
        ctx.beginPath();
        ctx.moveTo(6, 0); 
        ctx.lineTo(-6, -3); 
        ctx.lineTo(-4, 0);  
        ctx.lineTo(-6, 3); 
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}