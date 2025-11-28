import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { EffectSystem } from './EffectSystem';
import { DebugSystem } from './DebugSystem';

export class CollisionSystem {
    private effects: EffectSystem;
    private debug: DebugSystem;

    constructor(effects: EffectSystem, debug: DebugSystem) {
        this.effects = effects;
        this.debug = debug;
    }

    public update(projectiles: Projectile[], enemies: Enemy[]) {
        for (const p of projectiles) {
            if (!p.alive) continue;

            // Оптимизация: если снаряд улетел далеко за экран - убиваем
            if (p.x < -50 || p.x > window.innerWidth + 50 || p.y < -50 || p.y > window.innerHeight + 50) {
                p.alive = false;
                continue;
            }

            // Проверка коллизий
            for (const e of enemies) {
                if (!e.isAlive()) continue;
                // Игнорируем врагов, которых этот снаряд уже пробил (для Pierce)
                if (p.hitList.includes(e.id)) continue;

                const dist = Math.hypot(e.x - p.x, e.y - p.y);
                const hitDist = 16 + p.radius; // 16 - радиус врага (примерно)

                if (dist < hitDist) {
                    this.handleHit(p, e, enemies);
                    
                    if (p.pierce > 0) {
                        p.pierce--;
                        p.hitList.push(e.id);
                    } else {
                        p.alive = false;
                        break; // Снаряд уничтожен, дальше не проверяем
                    }
                }
            }
        }
    }

    // Вся логика попадания и эффектов переехала сюда
    private handleHit(p: Projectile, target: Enemy, allEnemies: Enemy[]) {
        // 1. Урон
        target.takeDamage(p.damage);

        // 2. Splash (Взрыв)
        const splash = p.effects.find(ef => ef.type === 'splash');
        if (splash) {
            this.effects.add({
                type: 'explosion', x: target.x, y: target.y,
                radius: splash.radius, life: 15, color: 'rgba(255, 100, 0, 0.5)'
            });

            for (const neighbor of allEnemies) {
                if (neighbor === target || !neighbor.isAlive()) continue;
                const dist = Math.hypot(neighbor.x - target.x, neighbor.y - target.y);
                if (dist <= splash.radius) {
                    neighbor.takeDamage(p.damage * 0.7);
                }
            }
        }

        // 3. Slow (Замедление)
        const slow = p.effects.find(ef => ef.type === 'slow');
        if (slow) {
            target.applyStatus('slow', slow.dur || 60, slow.power || 0.4);
            this.effects.add({
                type: 'particle', x: target.x, y: target.y, life: 20, color: '#00bcd4'
            });
        }
    }
}