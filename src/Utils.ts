import { CONFIG } from './Config';

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class ObjectPool<T> {
    private createFn: () => T;
    private pool: T[] = [];
    constructor(createFn: () => T) { this.createFn = createFn; }
    public obtain(): T { return this.pool.length > 0 ? this.pool.pop()! : this.createFn(); }
    public free(obj: T): void {
        if ((obj as any).reset) (obj as any).reset();
        this.pool.push(obj);
    }
}

// --- НОВОЕ: Рекомендация аналитика ---
export function screenToTile(screenX: number, screenY: number, canvas: HTMLCanvasElement): { col: number, row: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (screenX - rect.left) * scaleX;
    const y = (screenY - rect.top) * scaleY;

    return {
        col: Math.floor(x / CONFIG.TILE_SIZE),
        row: Math.floor(y / CONFIG.TILE_SIZE)
    };
}

// --- НОВОЕ: Генератор пути без дырок (Manhattan Path) ---
export function generateManhattanPath(cols: number, rows: number): {x: number, y: number}[] {
    const path: {x: number, y: number}[] = [];
    let current = { x: 0, y: Math.floor(rows / 2) }; // Старт слева
    const end = { x: cols - 1, y: Math.floor(rows / 2) }; // Финиш справа

    path.push({ ...current });

    // Идем к финишу
    while (current.x < end.x) {
        // Решаем, куда шагнуть: вперед или вбок?
        // 70% шанс пойти вперед, 30% сделать изгиб, если мы не на линии финиша
        const moveForward = Math.random() < 0.7 || current.x === end.x;
        
        if (moveForward) {
            current.x++;
        } else {
            // Изгиб вверх или вниз, но не за пределы карты
            const dir = Math.random() > 0.5 ? 1 : -1;
            const nextY = current.y + dir;
            if (nextY > 1 && nextY < rows - 2) {
                current.y = nextY;
            } else {
                current.x++; // Если уперлись в стену, идем вперед
            }
        }
        path.push({ ...current });
    }
    return path;
}