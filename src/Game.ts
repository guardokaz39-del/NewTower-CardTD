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
        this.start(); 
    }
    
    // --- ПРОВЕРКА: МОЖНО ЛИ СТРОИТЬ (Для InputSystem) ---
    public canBuildAt(col: number, row: number): boolean {
        // Границы
        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return false;
        // Тип местности (0 = BUILDABLE)
        if (this.map.grid[row][col].type !== 0) return false;
        // Занято ли уже башней?
        if (this.towers.some(t => t.col === col && t.row === row)) return false;
        
        return true;
    }

    // --- НОВОЕ: ПОСТРОЙКА БАЗОВОЙ БАШНИ (По таймеру) ---
    public buildBaseTower(col: number, row: number) {
        const cost = CONFIG.ECONOMY.TOWER_COST;

        if (this.money < cost) {
            this.showFloatingText("Нет золота!", col, row, 'red');
            return;
        }

        this.money -= cost;
        const newTower = new Tower(col, row);
        this.towers.push(newTower);
        
        // Эффекты
        this.effects.add({type: 'explosion', x: newTower.x, y: newTower.y, radius: 40, life: 20, color: '#fff'});
        this.showFloatingText(`-${cost}💰`, col, row, 'gold');
        this.ui.update();
    }

    // --- ИЗМЕНЕНО: ТЕПЕРЬ ТОЛЬКО АПГРЕЙД ---
    public handleCardDrop(card: ICard, explicitCol?: number, explicitRow?: number): boolean {
        const col = explicitCol !== undefined ? explicitCol : this.input.hoverCol;
        const row = explicitRow !== undefined ? explicitRow : this.input.hoverRow;

        const existingTower = this.towers.find(t => t.col === col && t.row === row);

        // Если башни нет — отменяем действие (карта вернется в руку)
        if (!existingTower) {
            return false; 
        }

        // Если башня есть — улучшаем
        if (existingTower.cards.length >= 3) {
            this.showFloatingText("Башня полна!", col, row, 'orange');
            return false;
        }

        existingTower.addCard(card);
        this.effects.add({type: 'text', text: "UPGRADE!", x: existingTower.x, y: existingTower.y - 20, life: 60, color: '#00ff00', vy: -1});
        this.ui.update();
        return true;
    }

    // Методы волн и геймплея (без изменений)
    public startWave() {
        if (this.isWaveActive && this.enemies.length > 0) {
            this.money += CONFIG.ECONOMY.EARLY_WAVE_BONUS;
            this.showFloatingText(`BONUS! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.map.cols/2, this.map.rows/2, '#ffd700');
        }
        this.wave++;
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

    public spawnEnemy(typeKey: string = 'GRUNT') {
        const startPath = this.map.path[0];
        const offset = (Math.random() - 0.5) * 30; 
        const typeConf = (CONFIG.ENEMY_TYPES as any)[typeKey];
        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, this.wave);

        const enemy = new Enemy({
            id: `e_${Date.now()}_${Math.random()}`,
            health: hp, speed: typeConf.speed,
            x: startPath.x * CONFIG.TILE_SIZE + 32 + offset,
            y: startPath.y * CONFIG.TILE_SIZE + 32 + offset,
            path: this.map.path 
        });
        (enemy as any).reward = typeConf.reward;
        this.enemies.push(enemy);
    }

    public checkWaveEnd() {
        if (this.isWaveActive && this.enemies.length === 0) {
            this.isWaveActive = false;
            for(let i=0; i < CONFIG.ECONOMY.WAVE_CLEAR_REWARD; i++) this.giveRandomCard();
            this.showFloatingText("WAVE CLEAR!", this.map.cols/2, this.map.rows/2, '#00ff00');
            this.ui.update();
        }
    }

    public giveRandomCard() {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        this.cardSys.addCard(keys[Math.floor(Math.random() * keys.length)], 1);
    }
    
    public sellCard() {
        const sellPrice = CONFIG.ECONOMY.SELL_PRICE;
        this.money += sellPrice;
        this.showFloatingText(`+${sellPrice}💰`, this.canvas.width - 100, this.canvas.height - 150, 'yellow');
        this.ui.update();
    }

    public showFloatingText(text: string, col: number, row: number, color: string) {
        const x = (col > 100) ? col : (col * CONFIG.TILE_SIZE);
        const y = (row > 100) ? row : (row * CONFIG.TILE_SIZE);
        this.effects.add({ type: 'text', text: text, x: x + 32, y: y, life: 60, color: color, vy: -1 });
    }

    private loop() {
        if (!this.isRunning) return;
        this.update();
        this.render();
        requestAnimationFrame(this.loop);
    }

    private update() {
        this.input.update(); // <-- ОБНОВЛЯЕМ INPUT (ТАЙМЕР СТРОЙКИ)
        this.effects.update();
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
            e.move();
            if (!e.isAlive()) {
                const reward = (e as any).reward || 5;
                this.money += reward; 
                if (Math.random() < CONFIG.ECONOMY.DROP_CHANCE) {
                    this.giveRandomCard();
                    this.effects.add({type: 'text', text: "CARD!", x: e.x, y: e.y, life: 50, color: '#00ffff', vy: -2});
                }
                this.effects.add({type: 'explosion', x: e.x, y: e.y, life: 15, radius: 20, color: '#9c27b0'});
                this.enemies.splice(i, 1);
                this.ui.update();
                this.checkWaveEnd();
            } else if (e.finished) {
                this.lives--;
                this.effects.add({type: 'text', text: "-1❤️", x: e.x, y: e.y, life: 40, color: 'red', vy: -1});
                this.enemies.splice(i, 1);
                this.ui.update();
                if(this.lives <= 0) { this.isRunning = false; this.ui.showGameOver(this.wave); }
                this.checkWaveEnd();
            }
        }
    }

    private render() {
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.map.draw(this.ctx);

        // --- РИСУЕМ UI СТРОИТЕЛЬСТВА ---
        // Если игрок держит кнопку для постройки, рисуем круг прогресса
        if (this.input.holdProgress > 0 && this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE + 32;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE + 32;
            
            this.ctx.beginPath();
            this.ctx.arc(hx, hy, 20, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * this.input.holdProgress));
            this.ctx.strokeStyle = CONFIG.COLORS.UI_HOLD_RING;
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }

        // Подсветка клетки курсора
        if (this.input.hoverCol >= 0) {
            const hx = this.input.hoverCol * CONFIG.TILE_SIZE;
            const hy = this.input.hoverRow * CONFIG.TILE_SIZE;
            
            // Зеленая если можно строить, Красная если нельзя
            const canBuild = this.canBuildAt(this.input.hoverCol, this.input.hoverRow);
            this.ctx.strokeStyle = canBuild ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(hx, hy, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        // --- GHOST БАШНИ (Только при апгрейде картой) ---
        const dragCard = this.cardSys.dragCard;
        if (dragCard && this.input.hoverCol >= 0) {
            const tower = this.towers.find(t => t.col === this.input.hoverCol && t.row === this.input.hoverRow);
            if (tower) {
                const centerX = tower.x;
                const centerY = tower.y;
                // Показываем будущий радиус
                const futureCards = [...tower.cards, dragCard];
                const stats = Tower.getPreviewStats(futureCards);
                
                this.ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, stats.range, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(100, 255, 100, 0.6)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }

        this.towers.forEach(t => t.draw(this.ctx));

        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.getColor();
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, 16, 0, Math.PI*2); this.ctx.fill();
            const barWidth = 32; const barHeight = 5;
            const barX = e.x - barWidth / 2; const barY = e.y - 28;
            this.ctx.fillStyle = '#000'; this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            const pct = e.getHealthPercent();
            this.ctx.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
            this.ctx.fillRect(barX, barY, barWidth * pct, barHeight);
        });

        this.projectiles.forEach(p => p.draw(this.ctx));
        this.effects.draw();
    }
}