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
    
    public dragCard: ICard | null = null;
    private ghostEl: HTMLElement;
    private handContainer: HTMLElement;

    constructor(game: Game) {
        this.game = game;
        this.handContainer = document.getElementById('hand')!;
        this.ghostEl = document.getElementById('drag-ghost')!;
        
        // Ghost пропускает клики
        this.ghostEl.style.pointerEvents = 'none';

        // Стартовые карты
        this.addCard('FIRE', 1);
        this.addCard('ICE', 1);
        this.addCard('SNIPER', 1);
    }

    public startDrag(card: ICard, e: MouseEvent) {
        if (this.game.forge.isForging) return; // Нельзя таскать, пока куется
        
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
        this.ghostEl.style.left = (x - 35) + 'px';
        this.ghostEl.style.top = (y - 50) + 'px';
    }

    public endDrag(e: MouseEvent) {
        if (!this.dragCard) return;

        this.ghostEl.style.display = 'none';
        
        // 1. Сначала пробуем отдать карту в КУЗНИЦУ
        const droppedInForge = this.game.forge.tryDropCard(e.clientX, e.clientY, this.dragCard);
        
        if (droppedInForge) {
             // Удаляем из руки, так как она ушла в слот
            this.hand = this.hand.filter(c => c.id !== this.dragCard!.id);
        } 
        // 2. Если не в кузницу, пробуем на ПОЛЕ (башни)
        else {
            const success = this.game.handleCardDrop(this.dragCard);
            if (success) {
                this.hand = this.hand.filter(c => c.id !== this.dragCard!.id);
            }
        }

        this.dragCard.isDragging = false;
        this.dragCard = null;
        this.render();
    }

    public addCard(typeKey: string, level: number): boolean {
        if (this.hand.length >= CONFIG.PLAYER.HAND_LIMIT) return false;
        const type = (CONFIG.CARD_TYPES as any)[typeKey];
        if (!type) return false;

        const card: ICard = { id: generateUUID(), type, level, isDragging: false };
        this.hand.push(card);
        this.render();
        return true;
    }

    public render() {
        this.handContainer.innerHTML = '';
        this.hand.forEach(card => {
            const el = document.createElement('div');
            el.className = `card type-${card.type.id}`;
            el.innerHTML = `<div class="card-level">${card.level}</div><div class="card-icon">${card.type.icon}</div>`;
            
            el.onmousedown = (e) => this.startDrag(card, e);
            if(card.isDragging) el.classList.add('dragging-placeholder');
            
            this.handContainer.appendChild(el);
        });
    }
}