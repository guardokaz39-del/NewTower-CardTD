import { Enemy } from './Enemy';

export interface IProjectileStats {
    dmg: number;
    speed: number;
    color: string;
    effects: any[];
    pierce: number;
}

export class Projectile {
    public x: number = 0;
    public y: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public radius: number = 4;
    public alive: boolean = false;
    
    // Характеристики
    public damage: number = 0;
    public life: number = 0;
    public color: string = '#fff';
    public effects: any[] = [];
    public pierce: number = 0;
    
    // Кого мы уже ударили (храним ID, чтобы не держать ссылки на удаленные объекты)
    public hitList: string[] = [];

    constructor() {
        this.reset();
    }

    init(x: number, y: number, target: {x: number, y: number}, stats: IProjectileStats) {
        this.x = x; 
        this.y = y; 
        this.alive = true;
        this.damage = stats.dmg; 
        this.color = stats.color; 
        this.effects = stats.effects;
        this.pierce = stats.pierce || 0; 
        this.hitList = [];
        
        const angle = Math.atan2(target.y - y, target.x - x);
        const speed = stats.speed;
        this.vx = Math.cos(angle) * speed; 
        this.vy = Math.sin(angle) * speed;
        
        this.life = 120; // 2 секунды полета макс
    }

    reset() {
        this.x = 0; this.y = 0;
        this.hitList = [];
        this.alive = false;
    }

    // Только движение! Никакой физики.
    move() {
        if (!this.alive) return;
        this.x += this.vx; 
        this.y += this.vy; 
        this.life--;
        if(this.life <= 0) this.alive = false;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.alive) return;
        ctx.fillStyle = this.color; 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); 
        ctx.fill();
    }
}