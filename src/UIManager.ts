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
    
    private elGameOver: HTMLElement;
    private elFinalWave: HTMLElement;
    private elRestartBtn: HTMLButtonElement;
    private elGameOverTitle: HTMLElement; 
    private elStatsContainer: HTMLElement; 

    constructor(game: Game) {
        this.game = game;
        this.shop = new ShopSystem(game);
        
        this.elMoney = document.getElementById('money')!;
        this.elWave = document.getElementById('wave')!;
        this.elLives = document.getElementById('lives')!;
        this.elForgeBtn = document.getElementById('forge-btn') as HTMLButtonElement;
        this.elStartBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
        
        this.elGameOver = document.getElementById('game-over')!;
        this.elFinalWave = document.getElementById('final-wave')!;
        this.elRestartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
        this.elGameOverTitle = this.elGameOver.querySelector('h1')!;
        
        // Создаем контейнер для статистики
        let stats = document.getElementById('stats-table');
        if (!stats) {
            stats = document.createElement('div');
            stats.id = 'stats-table';
            stats.style.marginTop = '20px';
            stats.style.maxHeight = '300px';
            stats.style.overflowY = 'auto';
            stats.style.width = '80%';
            stats.style.background = 'rgba(0,0,0,0.5)';
            stats.style.padding = '10px';
            stats.style.borderRadius = '10px';
            this.elGameOver.insertBefore(stats, this.elRestartBtn);
        }
        this.elStatsContainer = stats;

        // ВАЖНО: Клик всегда вызывает startWave. Логика "начала" или "раша" внутри Game.
        this.elStartBtn.addEventListener('click', () => this.game.startWave());
        this.elRestartBtn.addEventListener('click', () => {
            this.game.restart();
        });
    }

    public showGameOver(wave: number, isVictory: boolean) {
        this.elFinalWave.innerText = wave.toString();
        this.elGameOver.style.display = 'flex';
        
        if (isVictory) {
            this.elGameOverTitle.innerText = "VICTORY!";
            this.elGameOverTitle.style.color = '#00ff00';
        } else {
            this.elGameOverTitle.innerText = "DEFEAT";
            this.elGameOverTitle.style.color = '#ff3333';
        }

        let html = '<h3 style="color:#eee; text-align:center">Damage Report</h3>';
        html += '<table style="width:100%; color:#ccc; text-align:left; border-collapse: collapse;">';
        html += '<tr style="border-bottom:1px solid #555"><th>Tower</th><th>Dmg</th><th>Cards</th></tr>';
        
        const towers = [...this.game.towers].sort((a, b) => b.damageDealt - a.damageDealt);
        
        towers.forEach((t, i) => {
            const cardsInfo = t.cards.map(c => c.type.icon).join(' ');
            html += `
                <tr style="border-bottom:1px solid #333">
                    <td>#${i+1} (${t.col},${t.row})</td>
                    <td style="color:gold; font-weight:bold">${Math.floor(t.damageDealt)}</td>
                    <td>${cardsInfo || '-'}</td>
                </tr>
            `;
        });
        html += '</table>';
        this.elStatsContainer.innerHTML = html;
    }

    public hideGameOver() {
        this.elGameOver.style.display = 'none';
    }

    public update() {
        this.elMoney.innerText = this.game.money.toString();
        this.elLives.innerText = this.game.lives.toString();
        this.elWave.innerText = this.game.wave + "/" + CONFIG.WAVES.length;
        
        const cardSys = this.game.cardSys;
        const forgeCost = CONFIG.ECONOMY.FORGE_COST;
        const canForge = cardSys && cardSys.canForge();
        const hasMoney = this.game.money >= forgeCost;

        if (canForge && hasMoney) {
            this.elForgeBtn.disabled = false;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> KOVAT`;
            this.elForgeBtn.onclick = () => this.game.cardSys.tryForge();
        } else {
            this.elForgeBtn.disabled = true;
            this.elForgeBtn.innerHTML = `<span>⚒️</span> ${forgeCost}💰`;
            this.elForgeBtn.onclick = null;
        }

        // Логика кнопки волны
        this.elStartBtn.style.display = 'flex';
        if (this.game.isWaveActive) {
            this.elStartBtn.innerHTML = '⏩'; 
            this.elStartBtn.title = "Call Next Wave (+Bonus)";
        } else {
            this.elStartBtn.innerHTML = '⚔️';
            this.elStartBtn.title = "Start Wave";
        }
    }
}