import { CONFIG } from './Config';
import { generateManhattanPath } from './Utils';

interface Cell {
    type: number; // 0=Grass, 1=Path, 2=Decor, 3=Obelisk
    x: number; y: number; decor?: string | null;
}

export class MapManager {
    public cols: number;
    public rows: number;
    public grid: Cell[][] = [];
    public path: {x: number, y: number}[] = [];
    public obelisk = { x: 0, y: 0, active: false, cooldown: 0 };

    constructor(width: number, height: number) {
        this.cols = Math.floor(width / CONFIG.TILE_SIZE);
        this.rows = Math.floor(height / CONFIG.TILE_SIZE);
        this.initMap();
    }

    private initMap() {
        // 1. Инициализация сетки
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

        // 2. Генерация пути (Манхэттенская, без дырок)
        this.path = generateManhattanPath(this.cols, this.rows);
        
        // 3. Применение пути к сетке
        this.path.forEach(p => {
            this.grid[p.y][p.x].type = 1; // Path
            this.grid[p.y][p.x].decor = null;
            // Очистка зоны вокруг для строительства
            if(p.y+1 < this.rows) this.grid[p.y+1][p.x].type = 0;
            if(p.y-1 >= 0) this.grid[p.y-1][p.x].type = 0;
        });

        // 4. Обелиск (ставим в первой свободной точке сверху)
        const ox = Math.floor(this.cols/2);
        const oy = 1; 
        if (this.grid[oy][ox].type !== 1) {
            this.grid[oy][ox].type = 3; 
            this.obelisk.x = ox;
            this.obelisk.y = oy;
        }
    }

    public draw(ctx: CanvasRenderingContext2D) {
        const TS = CONFIG.TILE_SIZE;
        
        // Рисуем землю и декор
        for(let y=0; y<this.rows; y++) {
            for(let x=0; x<this.cols; x++) {
                const c = this.grid[y][x];
                const px = x * TS; const py = y * TS;
                
                if (c.type === 0) { // Buildable
                    ctx.fillStyle = CONFIG.COLORS.GRASS; ctx.fillRect(px, py, TS, TS); 
                    ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.strokeRect(px, py, TS, TS);
                }
                else if (c.type === 2) { // Decor
                    ctx.fillStyle = CONFIG.COLORS.DECOR_BG; ctx.fillRect(px, py, TS, TS);
                    ctx.fillStyle = c.decor === 'rock' ? CONFIG.COLORS.DECOR_ROCK : CONFIG.COLORS.DECOR_TREE;
                    ctx.beginPath(); ctx.arc(px + TS/2, py + TS/2, TS/3, 0, Math.PI*2); ctx.fill();
                }
                else if (c.type === 3) { // Obelisk
                    this.drawObelisk(ctx, px, py, TS);
                }
            }
        }

        // --- Рисуем ПУТЬ одной линией (чтобы не было стыков) ---
        if (this.path.length > 0) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = TS * 0.8;
            ctx.strokeStyle = CONFIG.COLORS.PATH;
            ctx.beginPath();
            ctx.moveTo(this.path[0].x * TS + TS/2, this.path[0].y * TS + TS/2);
            for(let i=1; i<this.path.length; i++) {
                ctx.lineTo(this.path[i].x * TS + TS/2, this.path[i].y * TS + TS/2);
            }
            ctx.stroke();
        }
    }

    private drawObelisk(ctx: CanvasRenderingContext2D, px: number, py: number, TS: number) {
         ctx.fillStyle = '#222'; ctx.fillRect(px, py, TS, TS);
         if (this.obelisk.active) {
            ctx.shadowBlur = 20; ctx.shadowColor = CONFIG.COLORS.OBELISK;
         }
         ctx.fillStyle = this.obelisk.active ? '#fff' : CONFIG.COLORS.OBELISK;
         ctx.beginPath();
         ctx.moveTo(px + TS/2, py + 10);
         ctx.lineTo(px + 10, py + TS - 10);
         ctx.lineTo(px + TS - 10, py + TS - 10);
         ctx.fill();
         ctx.shadowBlur = 0;
    }
}