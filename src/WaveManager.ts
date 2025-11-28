import { Game } from './Game';
import { CONFIG } from './Config';

export class WaveManager {
    private game: Game;
    
    public currentWaveIdx: number = 0; // Индекс текущей волны (0..N)
    public isWaveActive: boolean = false;
    
    // Состояние текущей волны
    private currentWaveConfig: any[] = [];
    private subWaveIdx: number = 0;      // Какая группа врагов сейчас идет
    private spawnedInSubWave: number = 0; // Сколько врагов из группы уже вышло
    private nextSpawnFrame: number = 0;   // Когда спавнить следующего

    constructor(game: Game) {
        this.game = game;
    }

    public startNextWave() {
        if (this.isWaveActive) {
            // Если волна уже идет - даем бонус
            if (this.game.enemies.length > 0) {
                this.game.money += CONFIG.ECONOMY.EARLY_WAVE_BONUS;
                this.game.showFloatingText(`RISK! +${CONFIG.ECONOMY.EARLY_WAVE_BONUS}💰`, this.game.map.cols/2, this.game.map.rows/2, '#ffd700');
            } else {
                // Если ждем окончания (пауза между группами) - ускоряем
                this.nextSpawnFrame = this.game.frames;
            }
            return;
        }

        this.game.wave++; // Увеличиваем счетчик для UI
        this.currentWaveIdx = (this.game.wave - 1) % CONFIG.WAVES.length;
        this.currentWaveConfig = CONFIG.WAVES[this.currentWaveIdx];
        
        // Сброс счетчиков
        this.subWaveIdx = 0;
        this.spawnedInSubWave = 0;
        this.isWaveActive = true;
        this.nextSpawnFrame = this.game.frames + 60; // Небольшая пауза перед стартом

        this.game.ui.update();
    }

    public update() {
        // 1. Проверяем условие победы в волне
        if (this.isWaveActive && this.subWaveIdx >= this.currentWaveConfig.length && this.game.enemies.length === 0) {
            this.finishWave();
            return;
        }

        // 2. Логика спавна
        if (this.isWaveActive && this.subWaveIdx < this.currentWaveConfig.length) {
            if (this.game.frames >= this.nextSpawnFrame) {
                this.spawnNextEnemy();
            }
        }
    }

    private spawnNextEnemy() {
        const group = this.currentWaveConfig[this.subWaveIdx];
        
        // Спавним врага через Game (так как там список врагов)
        this.game.spawnEnemy(group.type);
        this.spawnedInSubWave++;

        if (this.spawnedInSubWave >= group.count) {
            // Группа закончилась, переходим к следующей
            this.subWaveIdx++;
            this.spawnedInSubWave = 0;
            
            if (this.subWaveIdx < this.currentWaveConfig.length) {
                // Пауза перед следующей группой (берем interval следующей группы * 5)
                const nextGroup = this.currentWaveConfig[this.subWaveIdx];
                this.nextSpawnFrame = this.game.frames + nextGroup.interval * 5;
            }
        } else {
            // Пауза между врагами внутри группы
            this.nextSpawnFrame = this.game.frames + group.interval;
        }
    }

    private finishWave() {
        this.isWaveActive = false;
        
        // Награда
        for(let i=0; i < CONFIG.ECONOMY.WAVE_CLEAR_REWARD; i++) {
            this.game.giveRandomCard();
        }
        
        this.game.showFloatingText("WAVE CLEAR!", this.game.map.cols/2, this.game.map.rows/2, '#00ff00');
        this.game.ui.update();
    }
}