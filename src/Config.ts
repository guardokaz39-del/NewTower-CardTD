export const CONFIG = {
    TILE_SIZE: 64,
    
    COLORS: { 
        GRASS: '#8bc34a', PATH: '#ded29e', BASE: '#3f51b5', SPAWN: '#d32f2f', 
        TOWER_BASE: '#9e9e9e', DECOR_BG: '#558b2f', DECOR_TREE: '#2e7d32', DECOR_ROCK: '#78909c',
        UI_HOLD_RING: 'rgba(255, 255, 255, 0.8)' // Цвет кольца строительства
    },
    
    PLAYER: {
        START_MONEY: 150, 
        START_LIVES: 20, 
        HAND_LIMIT: 10
    },
    
    ECONOMY: {
        WAVE_CLEAR_REWARD: 2,
        DROP_CHANCE: 0.15,
        EARLY_WAVE_BONUS: 30,
        TOWER_COST: 55,
        FORGE_COST: 50,
        SELL_PRICE: 25
    },
    
    // ВРЕМЯ УДЕРЖАНИЯ ДЛЯ ПОСТРОЙКИ (в миллисекундах)
    CONTROLS: {
        BUILD_HOLD_MS: 400 // 0.4 секунды — быстро, но ощутимо
    },
    
    TOWER: {
        BASE_RANGE: 120, BASE_DMG: 5, BASE_CD: 45
    },
    
    ENEMY: {
        BASE_HP: 30, HP_GROWTH: 1.15, DROP_CHANCE: 0.08
    },

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Мортира', icon: '🔥', color: '#f44336' },
        ICE: { id: 'ice', name: 'Стужа', icon: '❄️', color: '#00bcd4' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800' }
    } as Record<string, any>,

    ENEMY_TYPES: {
        GRUNT: { id: 'grunt', symbol: '👾', hpMod: 1.0, speed: 1.5, reward: 5, color: '#9c27b0' },
        SCOUT: { id: 'scout', symbol: '🦇', hpMod: 0.5, speed: 3.5, reward: 3, color: '#ffeb3b' },
        TANK:  { id: 'tank',  symbol: '🐗', hpMod: 3.0, speed: 1.0, reward: 12, color: '#795548' },
        BOSS:  { id: 'boss', symbol: '👹', hpMod: 15.0, speed: 0.6, reward: 150, color: '#ff0000' }
    } as Record<string, any>,
    
    WAVES: [
        [ { type: 'GRUNT', count: 15, interval: 80 } ],
        [ { type: 'GRUNT', count: 12, interval: 60 }, { type: 'SCOUT', count: 7, interval: 40 } ],
        [ { type: 'GRUNT', count: 30, interval: 25 } ],
        [ { type: 'GRUNT', count: 12, interval: 50 }, { type: 'TANK', count: 5, interval: 120 } ],
        [ { type: 'SCOUT', count: 20, interval: 20 }, { type: 'BOSS', count: 1, interval: 100 } ]
    ]
};