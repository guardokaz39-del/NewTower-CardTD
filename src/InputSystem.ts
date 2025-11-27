import { Game } from './Game';
import { CONFIG } from './Config';

export class InputSystem {
    private game: Game;
    private canvas: HTMLCanvasElement;

    // Курсор
    public mouseX: number = 0;
    public mouseY: number = 0;
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    // Логика удержания
    public isMouseDown: boolean = false;
    private holdStartTime: number = 0;
    public holdProgress: number = 0; // от 0.0 до 1.0
    private hasBuilt: boolean = false; // Флаг, чтобы не строить 2 башни за 1 клик

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initListeners();
    }

    private initListeners() {
        // 1. Движение
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePos(e);

            // Если сдвинули мышь на другую клетку — сбрасываем прогресс
            // (Нужно пересчитать hoverCol перед сравнением, это делается в updateMousePos)
        });

        // 2. Нажатие
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // ЛКМ
                this.isMouseDown = true;
                this.holdStartTime = Date.now();
                this.hasBuilt = false;
            }
        });

        // 3. Отпускание
        window.addEventListener('mouseup', (e) => {
            this.isMouseDown = false;
            this.resetHold();
            
            // Если тащили карту
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.endDrag(e);
            }
        });
    }

    // Централизованный метод расчета координат (screenToTile)
    private updateMousePos(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;

        const newCol = Math.floor(this.mouseX / CONFIG.TILE_SIZE);
        const newRow = Math.floor(this.mouseY / CONFIG.TILE_SIZE);

        // Если перешли на новую клетку, сбрасываем таймер стройки
        if (newCol !== this.hoverCol || newRow !== this.hoverRow) {
            this.resetHold();
        }

        this.hoverCol = newCol;
        this.hoverRow = newRow;

        // Обновляем визуальный drag карты
        if (this.game.cardSys.dragCard) {
            this.game.cardSys.updateDrag(e.clientX, e.clientY);
        }
    }

    private resetHold() {
        this.holdProgress = 0;
        this.hasBuilt = false;
        this.holdStartTime = Date.now();
    }

    // Вызывается в Game loop
    public update() {
        // Если тащим карту - строить нельзя
        if (this.game.cardSys.dragCard) {
            this.resetHold();
            return;
        }

        if (this.isMouseDown && !this.hasBuilt) {
            // Проверяем валидность места через Game
            if (this.game.canBuildAt(this.hoverCol, this.hoverRow)) {
                
                const elapsed = Date.now() - this.holdStartTime;
                this.holdProgress = Math.min(1, elapsed / CONFIG.CONTROLS.BUILD_HOLD_MS);

                // Таймер истек — строим!
                if (this.holdProgress >= 1) {
                    this.game.buildBaseTower(this.hoverCol, this.hoverRow);
                    this.hasBuilt = true;
                    this.holdProgress = 0;
                }
            } else {
                this.resetHold();
            }
        } else {
            this.holdProgress = 0;
        }
    }
}