import { Game } from './Game';
import { CONFIG } from './Config';

export class ShopSystem {
    private game: Game;
    public readonly cost: number = CONFIG.ECONOMY.SHOP_COST;
    
    // Текущие карты в магазине (конфиги карт)
    public shopCards: (any | null)[] = [null, null, null];
    // Индекс выбранной карты
    public selectedSlotIndex: number = -1;

    constructor(game: Game) {
        this.game = game;
        this.rerollShop(); // Заполняем магазин при старте
    }

    // Заполнить пустые слоты новыми случайными картами
    public rerollShop() {
        const cardKeys = Object.keys(CONFIG.CARD_TYPES);
        for (let i = 0; i < this.shopCards.length; i++) {
            if (this.shopCards[i] === null) {
                const randomKey = cardKeys[Math.floor(Math.random() * cardKeys.length)];
                this.shopCards[i] = CONFIG.CARD_TYPES[randomKey];
            }
        }
    }

    // Выбор карты в UI
    public selectCard(index: number) {
        if (this.shopCards[index] !== null) {
            this.selectedSlotIndex = index;
            this.game.ui.update(); // Обновляем UI для подсветки
        }
    }

    public buyCard(): boolean {
        // 0. Проверка выбора
        if (this.selectedSlotIndex === -1 || this.shopCards[this.selectedSlotIndex] === null) {
             return false;
        }

        // 1. Проверка денег
        if (this.game.money < this.cost) {
            this.game.showFloatingText("Не хватает золота!", 800, 800, 'red'); 
            return false;
        }
        
        // 2. Проверка лимита руки
        if (this.game.cardSys.hand.length >= CONFIG.PLAYER.HAND_LIMIT) {
             this.game.showFloatingText("Рука переполнена!", 800, 800, 'orange');
             return false;
        }

        // 3. Покупка
        this.game.money -= this.cost;
        
        // Получаем ключ типа карты по её конфигу
        const cardTypeConfig = this.shopCards[this.selectedSlotIndex];
        let typeKey = 'FIRE'; // фоллбэк
        for(const key in CONFIG.CARD_TYPES) {
            if(CONFIG.CARD_TYPES[key].id === cardTypeConfig.id) {
                typeKey = key;
                break;
            }
        }
        
        this.game.cardSys.addCard(typeKey, 1);
        
        // Эффекты
        this.game.effects.add({
            type: 'text', text: `- ${this.cost}💰`, 
            x: this.game.canvas.width - 200, y: this.game.canvas.height - 100,
            life: 60, color: 'gold', vy: -1
        });

        // Удаляем купленную карту из магазина и сбрасываем выбор
        this.shopCards[this.selectedSlotIndex] = null;
        this.selectedSlotIndex = -1;
        
        // Заполняем пустой слот новой картой
        this.rerollShop();
        
        this.game.ui.update();
        return true;
    }

    public canBuy(): boolean {
        return this.game.money >= this.cost && 
               this.game.cardSys.hand.length < CONFIG.PLAYER.HAND_LIMIT &&
               this.selectedSlotIndex !== -1; // Обязательно должна быть выбрана карта
    }
}