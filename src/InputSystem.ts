import { Game } from './Game';
import { CONFIG } from './Config';

export class InputSystem {
    private game: Game;
    private canvas: HTMLCanvasElement;

    public mouseX: number = 0;
    public mouseY: number = 0;
    public hoverCol: number = -1;
    public hoverRow: number = -1;

    public isMouseDown: boolean = false;
    
    // Таймеры постройки
    private holdTimer: number = 0;
    private holdStartCol: number = -1;
    private holdStartRow: number = -1;
    private readonly HOLD_THRESHOLD: number = 10;

    constructor(game: Game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initListeners();
    }

    public getHoldTimer() { return this.holdTimer; }

    // Принудительный пересчет координат
    public updateMousePos(clientX: number, clientY: number) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Коррекция на масштаб канваса (если CSS размер отличается от реального)
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.mouseX = (clientX - rect.left) * scaleX;
        this.mouseY = (clientY - rect.top) * scaleY;

        // Защита от отрицательных значений
        if (this.mouseX < 0 || this.mouseY < 0 || this.mouseX > this.canvas.width || this.mouseY > this.canvas.height) {
            this.hoverCol = -1;
            this.hoverRow = -1;
        } else {
            this.hoverCol = Math.floor(this.mouseX / CONFIG.TILE_SIZE);
            this.hoverRow = Math.floor(this.mouseY / CONFIG.TILE_SIZE);
        }
    }

    // СБРОС ВСЕХ СОСТОЯНИЙ (Вызывать при любом глюке)
    public forceReset() {
        this.isMouseDown = false;
        this.holdTimer = 0;
        this.holdStartCol = -1;
        this.holdStartRow = -1;
        this.game.stopBuildingTower();
    }

    private initListeners() {
        window.addEventListener('mousemove', (e) => {
            this.updateMousePos(e.clientX, e.clientY);
            
            // Если тащим карту - обновляем ее позицию
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.updateDrag(e.clientX, e.clientY);
            }
        });

        // Слушаем mousedown НА КАНВАСЕ (чтобы UI не триггерил стройку)
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // ЛКМ
                this.isMouseDown = true;
                this.updateMousePos(e.clientX, e.clientY);
                
                // Старт таймера постройки
                if (this.hoverCol >= 0 && this.hoverRow >= 0) {
                    this.holdStartCol = this.hoverCol;
                    this.holdStartRow = this.hoverRow;
                    this.holdTimer = 0;
                }
                
                this.game.handleGridClick(this.hoverCol, this.hoverRow);
            }
        });

        // Слушаем mouseup ВЕЗДЕ (вдруг отпустили за пределами экрана)
        window.addEventListener('mouseup', (e) => {
            this.updateMousePos(e.clientX, e.clientY);

            // 1. Если тащили карту - бросаем её
            if (this.game.cardSys.dragCard) {
                this.game.cardSys.endDrag(e);
                // ВАЖНО: После броска карты мы НЕ должны сразу начинать строить
                this.forceReset();
                return;
            }

            // 2. Обычный сброс клика
            this.forceReset();
        });
    }

    public update() {
        // Логика постройки (только если не тащим карту)
        if (this.isMouseDown && !this.game.cardSys.dragCard) {
            if (this.hoverCol === this.holdStartCol && this.hoverRow === this.holdStartRow && this.hoverCol !== -1) {
                this.holdTimer++;
                if (this.holdTimer >= this.HOLD_THRESHOLD) {
                    this.game.startBuildingTower(this.hoverCol, this.hoverRow);
                }
            } else {
                // Сдвинули мышь с клетки - сброс таймера, но не клика
                this.holdTimer = 0;
                this.holdStartCol = this.hoverCol;
                this.holdStartRow = this.hoverRow;
                this.game.stopBuildingTower();
            }
        }
    }
}