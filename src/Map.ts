import { CONFIG } from './Config';

interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor, 3=Obelisk
    x: number;
    y: number;
    decor?: string | null;
}

export class MapManager {
    public cols: number;
    public rows: number;
    public grid: Cell[][] = [];
    public path: {x: number, y: number}[] = [];
    
    // Обелиск
    public obelisk = { x: 0, y: 0, active: false, cooldown: 0 };

    constructor(width: number, height: number) {
        this.cols = Math.floor(width / CONFIG.TILE_SIZE);
        this.rows = Math.floor(height / CONFIG.TILE_SIZE);
        this.initMap();
    }

    private initMap() {
        // 1. Заливаем все травой и декором
        for(let y=0; y<this.rows; y++) {
            const row: Cell[] = []; 
            for(let x=0; x<this.cols; x++) {
                let decorType = 'grass';
                const r = Math.random();
                if(r < 0.3) decorType = 'tree'; else if(r < 0.4) decorType = 'rock';
                row.push({type: 2, x, y, decor: decorType});
            }
            this.grid.push(row);
        }

        // 2. Генерация пути (Простая змейка)
        const centerY = Math.floor(this.rows / 2);
        this.path = [];
        
        // Старт слева
        for(let x = 0; x < this.cols; x++) {
            let y = centerY;
            // Делаем изгиб в центре
            if (x > this.cols * 0.3 && x < this.cols * 0.7) {
                y = centerY + Math.floor(Math.sin(x) * 2);
            }
            // Гарантируем пределы
            y = Math.max(1, Math.min(this.rows - 2, y));
            
            this.path.push({x, y});
            this.grid[y][x].type = 1; // 1 = Path
            this.grid[y][x].decor = null;
            
            // Очистка зоны вокруг пути для постройки (Type 0)
            if(y+1 < this.rows) this.grid[y+1][x].type = 0;
            if(y-1 >= 0) this.grid[y-1][x].type = 0;
        }

        // 3. Установка Обелиска (Сверху по центру)
        const ox = Math.floor(this.cols/2);
        const oy = 1; 
        if (this.grid[oy][ox].type !== 1) { // Если не на дороге
            this.grid[oy][ox].type = 3; // 3 = OBELISK
            this.obelisk.x = ox;
            this.obelisk.y = oy;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;
        
        for(let y=0; y<this.rows; y++) {
            for(let x=0; x<this.cols; x++) {
                const c = this.grid[y][x];
                const px = x * TS; const py = y * TS;
                
                if (c.type === 1) { // PATH
                    ctx.fillStyle = CONFIG.COLORS.PATH; ctx.fillRect(px, py, TS, TS); 
                }
                else if (c.type === 0) { // BUILDABLE
                    ctx.fillStyle = CONFIG.COLORS.GRASS; ctx.fillRect(px, py, TS, TS); 
                    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.strokeRect(px, py, TS, TS);
                }
                else if (c.type === 2) { // DECOR
                    ctx.fillStyle = CONFIG.COLORS.DECOR_BG; ctx.fillRect(px, py, TS, TS);
                    ctx.fillStyle = c.decor === 'rock' ? CONFIG.COLORS.DECOR_ROCK : CONFIG.COLORS.DECOR_TREE;
                    ctx.beginPath(); ctx.arc(px + TS/2, py + TS/2, TS/3, 0, Math.PI*2); ctx.fill();
                }
                else if (c.type === 3) { // OBELISK
                    ctx.fillStyle = '#222'; ctx.fillRect(px, py, TS, TS);
                    
                    if (this.obelisk.active) {
                        ctx.shadowBlur = 20; ctx.shadowColor = CONFIG.COLORS.OBELISK;
                    }
                    
                    ctx.fillStyle = this.obelisk.active ? '#fff' : CONFIG.COLORS.OBELISK;
                    ctx.beginPath();
                    ctx.moveTo(px + TS/2, py + 10);
                    ctx.lineTo(px + 10, py + TS - 10);
                    ctx.lineTo(px + TS - 10, py + TS - 10);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.shadowBlur = 0;
                    
                    // Кулдаун бар
                    if (this.obelisk.cooldown > 0) {
                        const pct = this.obelisk.cooldown / CONFIG.OBELISK.COOLDOWN;
                        ctx.fillStyle = 'red';
                        ctx.fillRect(px, py + TS - 5, TS * pct, 5);
                    }
                }
            }
        }
    }
}