import { Game } from './Game';
import { screenToTile } from './Utils';

export class InputSystem {
    private game: Game;
    private canvas: HTMLCanvasElement;

    // Состояние курсора
    public mouseX: number = 0;
    public mouseY: number = 0;
    
    // Состояние сетки (над какой клеткой мышь)
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    // Состояние нажатия
    public isMouseDown: boolean = false;
    
    // Прогресс удержания кнопки (для постройки)
    public holdProgress: number = 0; 

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initListeners();
    }

    private initListeners() {
        // --- ДВИЖЕНИЕ МЫШИ ---
        this.canvas.addEventListener('mousemove', (e) => {
            // 1. Конвертируем пиксели экрана в координаты сетки
            const tile = screenToTile(e.clientX, e.clientY, this.canvas);
            
            this.hoverCol = tile.col;
            this.hoverRow = tile.row;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // 2. Если тащим карту, обновляем её позицию
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.updateDrag(e.clientX, e.clientY);
            }
        });

        // --- НАЖАТИЕ (КЛИК) ---
        this.canvas.addEventListener('mousedown', async (e) => {
            if (e.button === 0) { // Левая кнопка мыши
                this.isMouseDown = true;
                
                // ВАЖНО: Разблокируем звук при первом клике
                if (this.game.audio) {
                     // @ts-ignore: Игнорируем ошибку старых типов, если они еще не обновились
                     await this.game.audio.init(); 
                }

                // Обрабатываем клик по сетке (например, для Обелиска)
                this.game.handleGridClick(this.hoverCol, this.hoverRow);
            }
        });

        // --- ОТПУСКАНИЕ ---
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            // Если тащили карту — отпускаем её
            this.game.cardSys.endDrag();
        });
    }

    public update() {
        // Логика удержания кнопки мыши (для строительства башни)
        if (this.isMouseDown && !this.game.cardSys.dragCard) {
            this.holdProgress += 0.05; // Скорость заполнения круга
            
            if (this.holdProgress >= 1) {
                // Круг заполнился — строим башню
                this.game.buildBaseTower(this.hoverCol, this.hoverRow);
                this.holdProgress = 0; 
                this.isMouseDown = false; // Сбрасываем нажатие
            }
        } else {
            this.holdProgress = 0;
        }
    }
}