import { CONFIG } from './Config';

export interface IEnemyConfig {
    id: string;
    health: number;
    speed: number;
    path: { x: number, y: number }[];
    type: any;
    armor?: number;
    x?: number; 
    y?: number;
}

interface IStatus {
    type: 'slow';
    duration: number;
    power: number;
    amp?: number; // Увеличение входящего урона
}

export class Enemy {
    public id: string;
    public currentHealth: number;
    public maxHealth: number;
    public baseSpeed: number;
    public armor: number;
    public type: any;
    
    public x: number;
    public y: number;

    private path: { x: number, y: number }[];
    private pathIndex: number = 0;
    public finished: boolean = false;
    
    private offsetX: number = 0;
    private offsetY: number = 0;

    public statuses: IStatus[] = [];
    public deathEffects: any[] = []; // Эффекты при смерти (взрыв и т.д.)

    // Глобальное замедление от Обелиска
    public static globalSlow: number = 0; 
    
    private abilityTimer: number = 0;

    constructor(config: IEnemyConfig) {
        this.id = config.id;
        this.maxHealth = config.health;
        this.currentHealth = config.health;
        this.baseSpeed = config.speed;
        this.armor = config.armor || 0;
        this.type = config.type;

        this.path = config.path;
        
        if (config.x !== undefined && config.y !== undefined) {
            this.x = config.x;
            this.y = config.y;
        } else if (this.path.length > 0) {
            this.x = this.path[0].x * CONFIG.TILE_SIZE + 32;
            this.y = this.path[0].y * CONFIG.TILE_SIZE + 32;
        } else {
            this.x = 0; this.y = 0;
        }

        this.offsetX = (Math.random() - 0.5) * 20;
        this.offsetY = (Math.random() - 0.5) * 20;
        this.x += this.offsetX;
        this.y += this.offsetY;
    }

    public applyStatus(type: 'slow', duration: number, power: number, amp: number = 0) {
        const existing = this.statuses.find(s => s.type === type);
        if (existing) {
            existing.duration = duration;
            existing.amp = Math.max(existing.amp || 0, amp);
        } else {
            this.statuses.push({ type, duration, power, amp });
        }
    }

    public takeDamage(amount: number): void {
        let finalDmg = Math.max(1, amount - this.armor);
        
        // Если есть статус с AMP (от Ice Tower Lvl 2+), увеличиваем урон
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow && slow.amp) {
            finalDmg *= (1 + slow.amp);
        }

        this.currentHealth -= finalDmg;
        if (this.currentHealth < 0) this.currentHealth = 0;
    }

    public move(game: any): void {
        // 1. Статусы
        this.statuses.forEach(s => s.duration--);
        this.statuses = this.statuses.filter(s => s.duration > 0);

        // 2. Расчет скорости
        let speedMod = 1;
        const slow = this.statuses.find(s => s.type === 'slow');
        if (slow) speedMod -= slow.power;

        // Влияние обелиска
        if (Enemy.globalSlow > 0) speedMod -= Enemy.globalSlow;

        // Способности Скаута (Рывок)
        if (this.type.id === 'scout' && this.currentHealth < this.maxHealth * 0.5) {
            speedMod *= 2.0;
            if (Math.random() < 0.1) {
                game.effects.add({ type: 'particle', x: this.x, y: this.y, life: 10, color: 'yellow', size: 2 });
            }
        }
        
        const currentSpeed = Math.max(0, this.baseSpeed * speedMod);

        // 3. Логика Босса (Спавн)
        if (this.type.id === 'boss') {
            this.handleBossLogic(game);
        }

        // 4. Движение
        if (this.pathIndex >= this.path.length) {
            this.finished = true;
            return;
        }

        const node = this.path[this.pathIndex];
        const targetX = node.x * CONFIG.TILE_SIZE + 32 + this.offsetX;
        const targetY = node.y * CONFIG.TILE_SIZE + 32 + this.offsetY;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= currentSpeed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
        } else {
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }
    }

    private handleBossLogic(game: any) {
        const hpPercent = this.currentHealth / this.maxHealth;
        this.abilityTimer++;
        
        if (hpPercent > 0.5) {
            if (this.abilityTimer > 120) { // Фаза 1
                this.summonMinions(game, 2);
                this.abilityTimer = 0;
            }
        } else {
             if (this.abilityTimer > 300) { // Фаза 2
                this.summonMinions(game, 1);
                this.abilityTimer = 0;
            }
        }
    }

    private summonMinions(game: any, count: number) {
        for(let i=0; i<count; i++) {
             const spawnType = (this.currentHealth > this.maxHealth * 0.5) ? 'GRUNT' : 'SCOUT';
             game.spawnEnemy(spawnType, {
                 x: this.x + (Math.random()-0.5)*40,
                 y: this.y + (Math.random()-0.5)*40
             });
        }
    }

    public isAlive(): boolean { return this.currentHealth > 0; }
    public getHealthPercent(): number { return this.currentHealth / this.maxHealth; }
}