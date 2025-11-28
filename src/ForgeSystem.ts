import { Game } from './Game';
import { ICard } from './CardSystem';
import { CONFIG } from './Config';

export class ForgeSystem {
    private game: Game;
    
    // Слоты теперь живут здесь
    public slots: (ICard | null)[] = [null, null];
    public isForging: boolean = false;
    
    private slotEls: HTMLElement[];

    constructor(game: Game) {
        this.game = game;
        this.slotEls = [
            document.getElementById('forge-slot-0')!,
            document.getElementById('forge-slot-1')!
        ];
    }

    /**
     * Проверяет, бросили ли карту на один из слотов кузницы
     */
    public tryDropCard(mouseX: number, mouseY: number, card: ICard): boolean {
        if (this.isForging) return false;

        // Проверяем попадание в каждый слот
        for (let i = 0; i < this.slotEls.length; i++) {
            const rect = this.slotEls[i].getBoundingClientRect();
            if (
                mouseX >= rect.left && mouseX <= rect.right &&
                mouseY >= rect.top && mouseY <= rect.bottom
            ) {
                this.putInSlot(i, card);
                return true; // Карта принята кузницей
            }
        }
        return false;
    }

    private putInSlot(index: number, card: ICard) {
        // Если в слоте уже была карта, возвращаем её в руку
        if (this.slots[index]) {
            this.game.cardSys.hand.push(this.slots[index]!);
        }
        
        this.slots[index] = card;
        // Удаляем карту из руки (это делает вызывающий метод, но для надежности можно и тут вернуть true)
        this.game.ui.update();
    }

    /**
     * Возвращает карту из слота обратно в руку (при клике)
     */
    public removeCardFromSlot(index: number) {
        if (this.isForging) return;
        
        const card = this.slots[index];
        if (card) {
            this.game.cardSys.hand.push(card);
            this.slots[index] = null;
            this.game.cardSys.render(); // Обновляем руку
            this.game.ui.update();
        }
    }

    public canForge(): boolean {
        const [c1, c2] = this.slots;
        // Проверка: есть обе карты, они одного типа, одного уровня и уровень < 3
        return !!(c1 && c2 && c1.type.id === c2.type.id && c1.level === c2.level && c1.level < 3);
    }

    public startForging() {
        const cost = CONFIG.ECONOMY.FORGE_COST;
        if (!this.canForge() || this.game.money < cost) return;

        this.game.money -= cost;
        this.isForging = true;
        this.game.ui.update();

        // Визуальный эффект тряски
        this.slotEls.forEach(el => el.classList.add('shaking'));

        setTimeout(() => {
            this.finalizeForge();
        }, 600);
    }

    private finalizeForge() {
        this.slotEls.forEach(el => el.classList.remove('shaking'));
        
        const c1 = this.slots[0]!;
        const newLevel = c1.level + 1;
        
        // Определяем тип карты
        let typeKey = 'FIRE';
        for (const key in CONFIG.CARD_TYPES) {
            if ((CONFIG.CARD_TYPES as any)[key].id === c1.type.id) typeKey = key;
        }

        // Эффект успеха
        this.game.effects.add({
            type: 'explosion', x: window.innerWidth / 2, y: window.innerHeight - 150,
            life: 40, radius: 60, color: '#fff'
        });
        this.game.showFloatingText("SUCCESS!", 1, 1, '#00ff00'); // Координаты не важны для UI текста

        // Очищаем слоты и даем новую карту
        this.slots = [null, null];
        this.isForging = false;
        
        this.game.cardSys.addCard(typeKey, newLevel);
        this.game.ui.update();
    }
}