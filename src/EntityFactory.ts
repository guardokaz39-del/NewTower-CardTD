import { Enemy } from './Enemy';
import { Tower } from './Tower';
import { CONFIG } from './Config';
import { generateUUID } from './Utils';

export class EntityFactory {
    
    // Создание врага с учетом волны
    public static createEnemy(typeKey: string, wave: number, path: {x: number, y: number}[]): Enemy {
        const typeConf = (CONFIG.ENEMY_TYPES as any)[typeKey];
        if (!typeConf) throw new Error(`Unknown enemy type: ${typeKey}`);

        // Формула роста HP: База * Модификатор типа * (Множитель ^ (Волна - 1))
        const hp = CONFIG.ENEMY.BASE_HP * typeConf.hpMod * Math.pow(CONFIG.ENEMY.HP_GROWTH, wave - 1);

        const enemy = new Enemy({
            id: `e_${generateUUID()}`,
            health: hp,
            speed: typeConf.speed,
            path: path
        });
        
        // Сохраняем награду в объект (динамическое свойство)
        (enemy as any).reward = typeConf.reward;
        
        return enemy;
    }

    // Создание башни (пока просто, но готово к расширению)
    public static createTower(col: number, row: number): Tower {
        return new Tower(col, row);
    }
}