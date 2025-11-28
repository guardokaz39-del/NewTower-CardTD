import { CONFIG } from './Config';
import { Game } from './Game';
import { ShopSystem } from './ShopSystem';

export class UIManager {
    private game: Game;
    public shop: ShopSystem;
    
    private elMoney: HTMLElement;
    private elWave: HTMLElement;
    private elLives: HTMLElement;
    private elForgeBtn: HTMLButtonElement;
    private elStartBtn: HTMLButtonElement;
    
    // --- ИСПРАВЛЕНИЕ: Добавлено пропущенное свойство ---
    private elShopBtn: HTMLButtonElement; 
    // --------------------------------------------------

    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;
    
    // Элементы слотов кузницы
    private elForgeSlots: HTMLElement[];
    private elShopSlots: HTMLElement[];

    constructor(game: Game) {
        this.game = game;
        this.shop = new ShopSystem(game);
        
        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
        this.elShopBtn = document.getElementById('shop-btn') as HTMLButtonElement;
        
        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

        this.elForgeSlots = [
            document.getElementById('forge-slot-0')!,
            document.getElementById('forge-slot-1')!
        ];
        this.elShopSlots = Array.from(document.querySelectorAll('.shop-slot')) as HTMLElement[];

        this.initListeners();
    }

    private initListeners() {
        this.elStartBtn.addEventListener('click', () => this.game.waveManager.startNextWave());
        
        this.elRestartBtn.addEventListener('click', () => {
            this.game.restart();
            this.hideGameOver();
        });
        
        this.elShopBtn.addEventListener('click', () => this.shop.buyCard());

        this.elShopSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => this.shop.selectCard(index));
        });
    }

    public showGameOver(wave: number) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
    }

    public hideGameOver() {
        this.elGameOver.style.display = 'none';
    }

    public update() {
        // 1. Статы
        this.elMoney.innerText = this.game.money.toString();
        this.elLives.innerText = this.game.lives.toString();
        this.elWave.innerText = this.game.wave + "/" + CONFIG.WAVES.length;
        
        // 2. КУЗНИЦА (Используем ForgeSystem)
        const forge = this.game.forge;
        
        // Отрисовка слотов
        this.elForgeSlots.forEach((el, idx) => {
            el.innerHTML = '';
            const card = forge.slots[idx];
            if (card) {
                // Рисуем карту в слоте
                const cardEl = document.createElement('div');
                cardEl.className = `card type-${card.type.id}`;
                cardEl.style.transform = 'scale(0.8)';
                cardEl.style.margin = '0';
                cardEl.innerHTML = `<div class="card-level">${card.level}</div><div class="card-icon">${card.type.icon}</div>`;
                
                // Клик возвращает карту в руку
                cardEl.onclick = () => forge.removeCardFromSlot(idx);
                
                el.appendChild(cardEl);
            } else {
                el.innerText = (idx + 1).toString(); // Номер слота если пусто
            }
        });

        // Кнопка ковки
        const canForge = forge.canForge();
        const hasMoney = this.game.money >= CONFIG.ECONOMY.FORGE_COST;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> КОВАТЬ`;
            this.elForgeBtn.onclick = () => forge.startForging();
        } else {
            this.elForgeBtn.disabled = true;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> ${CONFIG.ECONOMY.FORGE_COST}💰`;
            this.elForgeBtn.onclick = null;
        }
        
        // 3. Магазин
        this.elShopSlots.forEach((slotEl, index) => {
            const cardConfig = this.shop.shopCards[index];
            slotEl.innerHTML = ''; 
            slotEl.classList.remove('selected');

            if (cardConfig) {
                const cardHtml = `
                    <div class="card type-${cardConfig.id}" style="pointer-events: none; transform: scale(0.85); width: 70px; height: 100px; margin: 0;">
                        <div class="card-level">1</div>
                        <div class="card-icon">${cardConfig.icon}</div>
                    </div>
                `;
                slotEl.innerHTML = cardHtml;
                if (index === this.shop.selectedSlotIndex) slotEl.classList.add('selected');
            } else {
                slotEl.innerHTML = `<span style="opacity: 0.3; font-size: 30px;">♻️</span>`;
            }
        });

        this.elShopBtn.disabled = !this.shop.canBuy();
        this.elShopBtn.innerHTML = `<span>🛒</span> КУПИТЬ (${CONFIG.ECONOMY.SHOP_COST}💰)`;
    }
}