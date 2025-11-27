import { Game } from './Game';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export interface ICard {
    id: string;
    type: any;
    level: number;
    isDragging: boolean;
}

export class CardSystem {
    private game: Game;
    public hand: ICard[] = [];
    public forgeSlots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;
    
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;

    private handContainer: HTMLElement;
    private forgeContainers: HTMLElement[];

    constructor(game: Game) {
        this.game = game;
        this.handContainer = document.getElementById('hand')!;
        this.forgeContainers = [
            document.getElementById('forge-slot-0')!, 
            document.getElementById('forge-slot-1')!
        ];
        this.ghostEl = document.getElementById('drag-ghost')!;

        // Стартовый набор
        this.addCard('FIRE', 1);
        this.addCard('SNIPER', 1);
        this.addCard('MULTISHOT', 1);
    }

    public addCard(typeKey: string, level: number): boolean {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
            // Авто-продажа, если рука полна
            const sellPrice = CONFIG.ECONOMY.SELL_PRICE;
            this.game.money += sellPrice;
            this.game.effects.add({
                type: 'text', text: `+${sellPrice}💰 (Sold)`, 
                x: this.game.canvas.width/2, y: this.game.canvas.height - 100,
                life: 60, color: 'gold', vy: -1
            });
            return false;
        }

        const type = (CONFIG.CARD_TYPES as any)[typeKey];
        if (!type) return false;

        const card: ICard = { id: generateUUID(), type, level, isDragging: false };
        this.hand.push(card);
        this.render();
        return true;
    }

    public startDrag(card: ICard, e: MouseEvent) {
        if (this.isForging) return;
        
        this.dragCard = card;
        card.isDragging = true;
        
        this.ghostEl.style.display = 'flex';
        this.ghostEl.className = `card type-${card.type.id}`;
        this.ghostEl.innerHTML = `
            <div class="card-level">${card.level}</div>
            <div class="card-icon">${card.type.icon}</div>
        `;
        
        this.updateDrag(e.clientX, e.clientY);
        this.render();
    }

    public updateDrag(x: number, y: number) {
        if (!this.dragCard) return;
        // Центрируем призрак относительно курсора
        this.ghostEl.style.left = (x - 32) + 'px';
        this.ghostEl.style.top = (y - 45) + 'px';
    }

    public endDrag(e: MouseEvent) {
        if (!this.dragCard) return;

        this.ghostEl.style.display = 'none';
        let actionSuccess = false;

        // 1. Проверка зоны Кузницы (через DOM)
        const forgeRect = document.getElementById('forge-container')!.getBoundingClientRect();
        const isInForge = 
            e.clientX >= forgeRect.left && e.clientX <= forgeRect.right &&
            e.clientY >= forgeRect.top && e.clientY <= forgeRect.bottom;

        if (isInForge) {
            // Определяем слот (левый или правый)
            const idx = e.clientX < (forgeRect.left + forgeRect.width/2) ? 0 : 1;
            this.putInForge(idx, this.dragCard);
            actionSuccess = true;
        } 
        // 2. Проверка Игрового Поля (Raycast / Математика)
        else {
            const rect = this.game.canvas.getBoundingClientRect();
            
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                
                // Переводим экранные координаты в игровые (клетки)
                const gameX = e.clientX - rect.left;
                const gameY = e.clientY - rect.top;
                
                const col = Math.floor(gameX / CONFIG.TILE_SIZE);
                const row = Math.floor(gameY / CONFIG.TILE_SIZE);

                // Пытаемся применить карту
                actionSuccess = this.game.handleCardDrop(this.dragCard, col, row);
            }
        }

        if (actionSuccess) {
            // Удаляем карту из руки
            this.hand = this.hand.filter(c => c.id !== this.dragCard!.id);
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.render();
    }

    public putInForge(slotIdx: number, card: ICard) {
        if (this.forgeSlots[slotIdx]) {
            this.hand.push(this.forgeSlots[slotIdx]!);
        }
        this.forgeSlots[slotIdx] = card;
        this.hand = this.hand.filter(c => c.id !== card.id);
        this.render();
        this.game.ui.update();
    }

    public canForge(): boolean {
        const [c1, c2] = this.forgeSlots;
        return !!(c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level);
    }

    public tryForge() {
        const cost = CONFIG.ECONOMY.FORGE_COST;
        if (!this.canForge() || this.game.money < cost) return;
        
        this.game.money -= cost;
        this.isForging = true;
        this.game.ui.update();
        
        // Визуал тряски
        const c1El = this.forgeContainers[0].firstElementChild;
        const c2El = this.forgeContainers[1].firstElementChild;
        if(c1El) c1El.animate([{transform: 'translateX(-2px)'}, {transform: 'translateX(2px)'}], {duration: 100, iterations: 5});
        if(c2El) c2El.animate([{transform: 'translateX(-2px)'}, {transform: 'translateX(2px)'}], {duration: 100, iterations: 5});

        setTimeout(() => {
            const c1 = this.forgeSlots[0]!;
            const newLevel = c1.level + 1;
            
            // Находим ключ типа карты по ID
            let typeKey = 'FIRE';
            for (const key in CONFIG.CARD_TYPES) {
                if ((CONFIG.CARD_TYPES as any)[key].id === c1.type.id) typeKey = key;
            }

            this.game.effects.add({
                type: 'text', text: 'SUCCESS!', x: this.game.canvas.width/2, y: this.game.canvas.height - 150,
                life: 60, color: '#00ff00', vy: -2
            });

            this.forgeSlots = [null, null];
            this.isForging = false;
            this.addCard(typeKey, newLevel);
            this.render();
            this.game.ui.update();
        }, 600);
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach(card => {
            const el = this.createCardElement(card);
            el.onmousedown = (e) => this.startDrag(card, e);
            if(card.isDragging) el.classList.add('dragging-placeholder');
            this.handContainer.appendChild(el);
        });

        this.forgeContainers.forEach((el, idx) => {
            el.innerHTML = '';
            const slotCard = this.forgeSlots[idx];
            if (slotCard) {
                const cardEl = this.createCardElement(slotCard);
                cardEl.onclick = () => {
                    this.forgeSlots[idx] = null;
                    this.hand.push(slotCard);
                    this.render();
                    this.game.ui.update();
                };
                el.appendChild(cardEl);
            }
        });
    }

    private createCardElement(card: ICard): HTMLElement {
        const el = document.createElement('div');
        el.className = `card type-${card.type.id}`;
        el.innerHTML = `<div class="card-level">${card.level}</div><div class="card-icon">${card.type.icon}</div>`;
        return el;
    }
}