import { Enemy } from './Enemy';
import { MapManager } from './Map';
import { UIManager } from './UIManager';
import { CONFIG } from './Config';
import { CardSystem, ICard } from './CardSystem';
import { EventEmitter } from './Events';
import { InputSystem } from './InputSystem';
import { EffectSystem } from './EffectSystem';
import { Tower } from './Tower';
import { Projectile } from './Projectile';
import { ObjectPool } from './Utils';

export class Game {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    
    public enemies: Enemy[] = [];
    public towers: Tower[] = [];
    public projectiles: Projectile[] = [];
    
    public map: MapManager;
    public ui: UIManager;
    public cardSys: CardSystem;
    public events: EventEmitter;
    public input: InputSystem;
    public effects: EffectSystem;

    public money: number;
    public lives: number;
    public wave: number = 0;
    
    public isWaveActive: boolean = false;
    private spawnInterval: any = null;
    private isRunning: boolean = false;
    public projectilePool: ObjectPool<Projectile>;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) throw new Error('Canvas not found!');
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.money = CONFIG.PLAYER.START_MONEY;
        this.lives = CONFIG.PLAYER.START_LIVES;

        this.events = new EventEmitter();
        this.projectilePool = new ObjectPool<Projectile>(() => new Projectile());
        
        this.map = new MapManager(this.canvas.width, this.canvas.height);
        this.effects = new EffectSystem(this.ctx);
        this.cardSys = new CardSystem(this);
        this.input = new InputSystem(this);
        this.ui = new UIManager(this);
        
        this.ui.update();
        this.ui.hideGameOver();
        this.loop = this.loop.bind(this);
        
        window.addEventListener('resize', () => {
             this.canvas.width = window.innerWidth;
             this.canvas.height = window.innerHeight;
        });
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
    }

    public restart() {
        this.isRunning = false;
        this.money = CONFIG.PLAYER.START_MONEY;
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.wave = 0;
        this.isWaveActive = false;
        this.enemies = [];
        this.towers = [];
        this.projectiles = []; 
        if (this.spawnInterval) clearInterval(this.spawnInterval);
        
        this.cardSys.hand = [];
        this.cardSys.forgeSlots = [null, null];
        this.cardSys.addCard('FIRE', 1);
        this.cardSys.addCard('ICE', 1);
        this.cardSys.addCard('SNIPER', 1);
        this.cardSys.render();
        this.ui.update();
        this.ui.hideGameOver(); 
        this.start(); 
    }

    // Обработка клика по карте
    public handleGridClick(col: number, row: number) {
        // 1. Активация Обелиска
        if (this.map.grid[row][col].type === 3) {
            this.activateObelisk();
            return;
        }

        // 2. Постройка (если можно)
        if (this.canBuildAt(col, row)) {
            this.buildBaseTower(col, row);
        }
    }

    public activateObelisk() {
        const obelisk = this.map.obelisk;
        if (obelisk.active || obelisk.cooldown > 0) return;

        if (this.money >= CONFIG.ECONOMY.OBELISK_COST) {
            this.money -= CONFIG.ECONOMY.OBELISK_COST;
            obelisk.active = true;
            Enemy.globalSlow = CONFIG.OBELISK.SLOW_POWER;
            
            this.showFloatingText("TIME SLOW!", obelisk.x * 64, obelisk.y * 64, '#00ffff');
            
            setTimeout(() => {
                obelisk.active = false;
                obelisk.cooldown = CONFIG.OBELISK.COOLDOWN;
                Enemy.globalSlow = 0; 
            }, CONFIG.OBELISK.DURATION * (1000/60)); 
            
            this.ui.update();
        } else {
            this.showFloatingText("Need Mana!", obelisk.x * 64, obelisk.y * 64, 'red');
        }
    }

    public canBuildAt(col: number, row: number): boolean {
        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return false;
        if (this.map.grid[row][col].type !== 0) return false;
        if (this.towers.some(t => t.col === col && t.row === row)) return false;
        return true;
    }

    public buildBaseTower(col: number, row: number) {
        const cost = CONFIG.ECONOMY.TOWER_COST;
        if (this.money < cost) {
            this.showFloatingText("No Gold!", col, row, 'red');
            return;
        }
        this.money -= cost;
        const newTower = new Tower(col, row);
        this.towers.push(newTower);
        
        this.effects.spawnParticles(newTower.x, newTower.y, '#8d6e63', 15);
        this.effects.add({type: 'scan', x: newTower.x, y: newTower.y, life: 20, radius: 40, color: 'white'});
        this.showFloatingText(`-${cost}💰`, col, row, 'gold');
        this.ui.update();
    }

    public handleCardDrop(card: ICard, col: number, row: number): boolean {
        const existingTower = this.towers.find(t => t.col === col && t.row === row);
        if (!existingTower) return false; 
        if (existingTower.cards.length >= 3) {
            this.showFloatingText("Full!", col, row, 'orange');
            return false;
        }
        existingTower.addCard(card);
        this.effects.spawnParticles(existingTower.x, existingTower.y, card.type.color, 20);
        this.showFloatingText("UPGRADE!", col, row, card.type.color);
        this.ui.update();
        return true;
    }

    public showFloatingText(text: string, colOrX: number, rowOrY: number, color: string) {
        let x = colOrX;
        let y = rowOrY;
        if (colOrX < 100 && rowOrY < 100) {
            x = colOrX * CONFIG.TILE_SIZE + 32;
            y = rowOrY * CONFIG.TILE_SIZE;
        }
        this.effects.add({ type: 'text', text: text, x: x, y: y, life: 60, color: color, vy: -1 });
    }

    public sellCard() {
        const sellPrice = CONFIG.ECONOMY.SELL_PRICE;
        this.money += sellPrice;
        this.showFloatingText(`+${sellPrice}💰`, this.canvas.width - 100, this.canvas.height - 150, 'yellow');
        this.ui.update();
    }

    private loop() {
        if (!this.isRunning) return;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    private update() {
        this.input.update(); 
        this.effects.update();
        if (this.map.obelisk.cooldown > 0) this.map.obelisk.cooldown--;
        
        this.towers.forEach(t => t.update(this.enemies, this.projectiles, this.projectilePool));
        this.projectiles.forEach(p => p.update(this.enemies, this.effects));
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].alive) {
                this.projectilePool.free(this.projectiles[i]);
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.move(this);
            
            if (!e.isAlive()) {
                const reward = (e as any).reward || 5;
                this.money += reward; 
                this.showFloatingText(`+${reward}💰`, e.x, e.y, 'gold');

                if (Math.random() < CONFIG.ECONOMY.DROP_CHANCE) {
                    this.giveRandomCard();
                    this.effects.add({type: 'text', text: "CARD!", x: e.x, y: e.y, life: 50, color: '#00ffff', vy: -2});
                }

                // Эффекты смерти (Fire Lvl 3, Ice Lvl 3)
                e.deathEffects.forEach(eff => {
                    if (eff.type === 'explode') {
                        this.effects.add({ type: 'explosion', x: e.x, y: e.y, radius: 60, life: 10, color: 'orange' });
                        this.enemies.forEach(n => {
                            if (n !== e && n.isAlive() && Math.hypot(n.x - e.x, n.y - e.y) < 60) {
                                n.takeDamage(eff.dmg);
                            }
                        });
                    } else if (eff.type === 'freeze') {
                        this.effects.add({ type: 'scan', x: e.x, y: e.y, radius: 50, life: 15, color: 'cyan' });
                        this.enemies.forEach(n => {
                            if (n !== e && n.isAlive() && Math.hypot(n.x - e.x, n.y - e.y) < 50) {
                                n.applyStatus('slow', 60, 0.5);
                            }
                        });
                    }
                });

                this.effects.spawnParticles(e.x, e.y, e.type.color, 8);
                this.enemies.splice(i, 1);
                this.ui.update();
                this.checkWaveEnd();
            } 
            else if (e.finished) {
                this.lives--;
                this.effects.add({type: 'text', text: "-1❤️", x: e.x, y: e.y, life: 40, color: 'red', vy: -1});
                document.body.style.transform = `translate(${Math.random()*6-3}px, ${Math.random()*6-3}px)`;
                setTimeout(() => document.body.style.transform = 'none', 50);
                this.enemies.splice(i, 1);
                this.ui.update();
                
                if(this.lives <= 0) { 
                    this.isRunning = false; 
                    this.ui.showGameOver(this.wave, false); 
                }
                this.checkWaveEnd();
            }
        }
    }

    private render() {
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        if (this.input.hoverCol >= 0 && this.input.hoverCol < this.map.cols &&
            this.input.hoverRow >= 0 && this.input.hoverRow < this.map.rows) {
            
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            const canBuild = this.canBuildAt(this.input.hoverCol, this.input.hoverRow);
            
            if (this.input.holdProgress > 0) {
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                this.ctx.fillRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                const cx = hx + 32; const cy = hy + 32;
                this.ctx.beginPath(); this.ctx.arc(cx, cy, 24, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * this.input.holdProgress));
                this.ctx.strokeStyle = 'white'; this.ctx.lineWidth = 4; this.ctx.stroke();
            } else {
                this.ctx.strokeStyle = canBuild ? 'rgba(100, 255, 100, 0.8)' : 'rgba(255, 50, 50, 0.5)';
                this.ctx.lineWidth = 2; this.ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }

        let hoveredTower: Tower | null = null;
        this.towers.forEach(t => {
            t.draw(this.ctx);
            if (t.col === this.input.hoverCol && t.row === this.input.hoverRow) hoveredTower = t;
        });

        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.type.color; 
            if (e.statuses.some(s => s.type === 'slow')) this.ctx.fillStyle = '#00ffff'; 
            
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, 16, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1; this.ctx.stroke();

            const barW = 32; const barH = 5; const barX = e.x - barW / 2; const barY = e.y - 28;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            const pct = Math.max(0, e.currentHealth / e.maxHealth);
            this.ctx.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(barX, barY, barW * pct, barH);
        });

        this.projectiles.forEach(p => p.draw(this.ctx));
        this.effects.draw();

        if (hoveredTower && !this.cardSys.dragCard) {
            this.drawTowerInfo(hoveredTower);
        }
    }

    private drawTowerInfo(t: Tower) {
        const stats = t.getStats();
        this.ctx.fillStyle = CONFIG.COLORS.RANGE_CIRCLE;
        this.ctx.beginPath(); this.ctx.arc(t.x, t.y, stats.range, 0, Math.PI*2); this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; this.ctx.lineWidth = 1; this.ctx.stroke();

        const tipX = t.x; const tipY = t.y - 50;
        const lines = [
            `DMG: ${stats.dmg}`,
            `SPD: ${(60/stats.cd).toFixed(1)}/s`,
            `Total DMG: ${Math.floor(t.damageDealt)}`
        ];
        
        this.ctx.fillStyle = CONFIG.COLORS.TOOLTIP_BG;
        this.ctx.fillRect(tipX - 50, tipY - 45, 100, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        lines.forEach((l, i) => {
            this.ctx.fillText(l, tipX, tipY - 30 + (i * 14));
        });
    }

    public startWave() {
        if (this.isWaveActive && this.enemies.length > 0) {
            this.money += CONFIG.ECONOMY.EARLY_WAVE_BONUS;
            this.showFloatingText(`BONUS! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.canvas.width/2, this.canvas.height/2 + 50, '#ffd700');
        }
        this.wave++;
        
        if (this.wave > CONFIG.WAVES.length) {
            this.isRunning = false;
            this.ui.showGameOver(this.wave, true);
            return;
        }

        this.isWaveActive = true;
        this.ui.update();
        
        let waveIdx = (this.wave - 1) % CONFIG.WAVES.length;
        const waveData = CONFIG.WAVES[waveIdx];
        let subWaveIdx = 0;
        
        const runSubWave = () => {
            if (subWaveIdx >= waveData.length) return;
            const group = waveData[subWaveIdx];
            let spawned = 0;
            this.spawnInterval = setInterval(() => {
                this.spawnEnemy(group.type);
                spawned++;
                if (spawned >= group.count) {
                    clearInterval(this.spawnInterval);
                    subWaveIdx++;
                    runSubWave();
                }
            }, group.interval * 10);
        };
        runSubWave();
    }

    public checkWaveEnd() {
        if (this.isWaveActive && this.enemies.length === 0) {
            this.isWaveActive = false;
            
            if (this.wave >= CONFIG.WAVES.length) {
                this.isRunning = false;
                this.ui.showGameOver(this.wave, true);
                return;
            }

            const reward = CONFIG.ECONOMY.WAVE_CLEAR_REWARD;
            this.money += reward;
            this.giveRandomCard();
            
            this.effects.add({
                type: 'text', 
                text: `WAVE CLEARED! +${reward}💰`, 
                x: this.canvas.width/2, y: this.canvas.height/2, 
                life: 120, color: '#00ff00', vy: -0.5
            });
            
            this.ui.update();
        }
    }

    public giveRandomCard() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.cardSys.addCard(randomKey, 1);
    }
    
    public spawnEnemy(typeKey: string, startOpts?: any) {
        if (this.map.path.length === 0) return;
        
        const typeConf = (CONFIG.ENEMY_TYPES as any)[typeKey];
        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, this.wave);

        let startX, startY;

        if (startOpts) {
            startX = startOpts.x;
            startY = startOpts.y;
        } else {
            const startPath = this.map.path[0];
            startX = startPath.x * CONFIG.TILE_SIZE + 32;
            startY = startPath.y * CONFIG.TILE_SIZE + 32;
        }

        const enemy = new Enemy({
            id: `e_${Date.now()}_${Math.random()}`,
            health: hp, 
            speed: typeConf.speed,
            path: this.map.path,
            type: typeConf,
            x: startX,
            y: startY
        });
        (enemy as any).reward = typeConf.reward;
        this.enemies.push(enemy);
    }
}