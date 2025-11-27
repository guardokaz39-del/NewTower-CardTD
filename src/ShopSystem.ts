import { Game } from './Game';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export class ShopSystem {
    private game: Game;
    private elShopBtn: HTMLButtonElement;
    private elShopSlots: HTMLElement;
    
    // Храним текущие карты в магазине (3 штуки)
    private shopCards: any[] = []; 
    // Индекс выбранного слота (-1 если ничего не выбрано)
    private selectedSlot: number = -1;
    
    public readonly baseCost: number = 100;

    constructor(game: Game) {
        this.game = game;
        this.elShopBtn = document.getElementById('shop-btn') as HTMLButtonElement;
        this.elShopSlots = document.getElementById('shop-slots') as HTMLElement;
        
        // Генерируем стартовый ассортимент
        this.rerollSlot(0);
        this.rerollSlot(1);
        this.rerollSlot(2);
        
        this.initListeners();
        this.render();
    }

    private initListeners() {
        this.elShopBtn.addEventListener('click', () => this.buySelected());
    }

    // Заполнить конкретный слот случайной картой
    private rerollSlot(index: number) {
        const keys = Object.keys(CONFIG.CARD_TYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const type = (CONFIG.CARD_TYPES as any)[randomKey];
        
        this.shopCards[index] = {
            id: generateUUID(),
            type: type,
            level: 1,
            cost: this.baseCost
        };
    }

    // Выбор слота (при клике)
    public selectSlot(index: number) {
        if (this.selectedSlot === index) {
            this.selectedSlot = -1; // Снять выделение
        } else {
            this.selectedSlot = index;
        }
        this.render();
        this.updateBtnState();
    }

    public buySelected() {
        if (this.selectedSlot === -1) return;

        const cardInfo = this.shopCards[this.selectedSlot];
        const cost = cardInfo.cost;

        // 1. Проверка денег
        if (this.game.money < cost) {
            this.game.showFloatingText("Не хватает золота!", this.game.canvas.width - 150, this.game.canvas.height - 100, 'red'); 
            return;
        }

        // 2. Попытка добавить в руку (CardSystem сама проверит лимит/продажу)
        // Нам нужно знать ключ типа карты
        let typeKey = 'FIRE';
        for (const key in CONFIG.CARD_TYPES) {
            if ((CONFIG.CARD_TYPES as any)[key].id === cardInfo.type.id) typeKey = key;
        }
        
        // Снимаем деньги
        this.game.money -= cost;
        
        // Добавляем карту
        this.game.cardSys.addCard(typeKey, 1);
        
        this.game.effects.add({
            type: 'text', text: `- ${cost}💰`, 
            x: this.game.canvas.width - 100, y: this.game.canvas.height - 50,
            life: 60, color: 'gold', vy: -1
        });

        // 3. Обновляем слот (новая карта)
        this.rerollSlot(this.selectedSlot);
        this.selectedSlot = -1; // Сбрасываем выделение
        
        this.render();
        this.game.ui.update();
    }

    public updateBtnState() {
        if (this.selectedSlot === -1) {
            this.elShopBtn.disabled = true;
            this.elShopBtn.innerHTML = `<span>🛒</span> ВЫБЕРИТЕ КАРТУ`;
            return;
        }

        const cost = this.shopCards[this.selectedSlot].cost;
        const canBuy = this.game.money >= cost;

        this.elShopBtn.disabled = !canBuy;
        this.elShopBtn.innerHTML = `<span>🛒</span> КУПИТЬ (${cost}💰)`;
    }

    public render() {
        this.elShopSlots.innerHTML = '';
        
        this.shopCards.forEach((card, idx) => {
            const el = document.createElement('div');
            // Добавляем класс 'selected' если этот слот выбран
            const isSelected = this.selectedSlot === idx;
            el.className = `card type-${card.type.id} shop-preview ${isSelected ? 'selected' : ''}`;
            
            el.innerHTML = `
                <div class="card-level">${card.level}</div>
                <div class="card-icon">${card.type.icon}</div>
                <div style="position:absolute; bottom:5px; font-size:12px; font-weight:bold;">${card.cost}💰</div>
            `;
            
            // Клик по карте выбирает её
            el.onclick = () => this.selectSlot(idx);
            
            this.elShopSlots.appendChild(el);
        });
        
        this.updateBtnState();
    }
}