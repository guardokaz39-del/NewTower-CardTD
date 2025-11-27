export const CONFIG = {
    TILE_SIZE: 64,
    
    COLORS: { 
        GRASS: '#8bc34a', 
        PATH: '#ded29e', 
        BASE: '#3f51b5', 
        SPAWN: '#d32f2f', 
        TOWER_BASE: '#9e9e9e', 
        DECOR_BG: '#558b2f', 
        DECOR_TREE: '#2e7d32', 
        DECOR_ROCK: '#78909c',
        OBELISK: '#00bcd4', // Цвет Обелиска
        CRIT: '#ff0000',     // Цвет крита
        RANGE_CIRCLE: 'rgba(255, 255, 255, 0.15)',
        TOOLTIP_BG: 'rgba(0, 0, 0, 0.8)'
    },
    
    CONTROLS: { BUILD_HOLD_MS: 300 },

    PLAYER: {
        START_MONEY: 250, 
        START_LIVES: 20, 
        HAND_LIMIT: 10
    },
    
    ECONOMY: {
        WAVE_CLEAR_REWARD: 50, // Награда за волну
        DROP_CHANCE: 0.15,     // Шанс дропа карты
        EARLY_WAVE_BONUS: 30,  // Бонус за ранний вызов
        TOWER_COST: 55,
        FORGE_COST: 50,
        SELL_PRICE: 25,
        OBELISK_COST: 30       // Цена активации обелиска
    },

    OBELISK: {
        DURATION: 300, // 5 секунд (при 60 FPS)
        SLOW_POWER: 0.5, // 50% замедления
        COOLDOWN: 600 // 10 секунд перезарядки
    },
    
    TOWER: {
        BASE_RANGE: 150, 
        BASE_DMG: 10, 
        BASE_CD: 40, // ~1.5 выстрела в сек
        BASE_SPEED: 8
    },

    // Враги
    ENEMY: { 
        BASE_HP: 30, 
        HP_GROWTH: 1.25 
    },

    ENEMY_TYPES: {
        GRUNT: { id: 'grunt', name: 'Гоблин', symbol: '👾', hpMod: 1.0, speed: 1.5, reward: 5, color: '#9c27b0' },
        SCOUT: { id: 'scout', name: 'Мышь', symbol: '🦇', hpMod: 0.5, speed: 3.5, reward: 3, color: '#ffeb3b' },
        TANK:  { id: 'tank',  name: 'Орк', symbol: '🐗', hpMod: 3.0, speed: 1.0, reward: 12, color: '#795548' },
        BOSS:  { id: 'boss',  name: 'ДЕМОН', symbol: '👹', hpMod: 20.0, speed: 0.6, reward: 200, color: '#ff0000' }
    } as Record<string, any>,

    CARD_TYPES: {
        FIRE: { id: 'fire', name: 'Огонь', icon: '🔥', color: '#f44336' },
        ICE: { id: 'ice', name: 'Лед', icon: '❄️', color: '#00bcd4' },
        SNIPER: { id: 'sniper', name: 'Снайпер', icon: '🎯', color: '#4caf50' },
        MULTISHOT: { id: 'multi', name: 'Залп', icon: '💥', color: '#ff9800' }
    } as Record<string, any>,
    
    // 10 Волн
    WAVES: [
        [ { type: 'GRUNT', count: 10, interval: 80 } ], 
        [ { type: 'GRUNT', count: 15, interval: 60 }, { type: 'SCOUT', count: 5, interval: 40 } ], 
        [ { type: 'TANK', count: 3, interval: 100 }, { type: 'GRUNT', count: 10, interval: 50 } ], 
        [ { type: 'SCOUT', count: 20, interval: 20 } ], 
        [ { type: 'TANK', count: 10, interval: 80 }, { type: 'BOSS', count: 1, interval: 200 } ],
        [ { type: 'GRUNT', count: 30, interval: 30 } ],
        [ { type: 'TANK', count: 15, interval: 70 }, { type: 'SCOUT', count: 10, interval: 30 } ],
        [ { type: 'BOSS', count: 2, interval: 300 } ],
        [ { type: 'SCOUT', count: 50, interval: 15 } ],
        [ { type: 'BOSS', count: 3, interval: 200 }, { type: 'TANK', count: 20, interval: 50 } ]
    ]
};