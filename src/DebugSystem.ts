import { Game } from './Game';

export class DebugSystem {
    private game: Game;
    private elDebugPanel: HTMLElement;
    private logs: string[] = [];
    private maxLogs: number = 50;

    constructor(game: Game) {
        this.game = game;
        this.createUI();
        this.log("Debug System Initialized");
    }

    private createUI() {
        // Кнопка открытия
        const btn = document.createElement('button');
        btn.innerText = '🐞';
        btn.style.position = 'absolute';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '10000';
        btn.onclick = () => this.togglePanel();
        document.body.appendChild(btn);

        // Панель
        this.elDebugPanel = document.createElement('div');
        Object.assign(this.elDebugPanel.style, {
            position: 'absolute', top: '50px', right: '10px',
            width: '300px', height: '400px', background: 'rgba(0,0,0,0.9)',
            color: '#0f0', fontFamily: 'monospace', fontSize: '11px',
            padding: '10px', display: 'none', flexDirection: 'column',
            overflow: 'hidden', zIndex: '10000', border: '1px solid #0f0'
        });

        const copyBtn = document.createElement('button');
        copyBtn.innerText = '📋 COPY REPORT';
        copyBtn.style.marginBottom = '10px';
        copyBtn.onclick = () => this.copyReport();
        this.elDebugPanel.appendChild(copyBtn);

        const content = document.createElement('div');
        content.id = 'debug-content';
        content.style.whiteSpace = 'pre-wrap';
        content.style.overflowY = 'auto';
        content.style.flex = '1';
        this.elDebugPanel.appendChild(content);

        document.body.appendChild(this.elDebugPanel);
    }

    public log(msg: string) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        const line = `[${time}] ${msg}`;
        this.logs.push(line);
        if (this.logs.length > this.maxLogs) this.logs.shift();
    }

    public update() {
        if (this.elDebugPanel.style.display === 'none') return;

        const info = [
            `FPS Frame: ${this.game.frames}`,
            `Enemies: ${this.game.enemies.length}`,
            `Towers: ${this.game.towers.length}`,
            `Projectiles: ${this.game.projectiles.length}`,
            `Money: ${this.game.money} | Lives: ${this.game.lives}`,
            `Wave: ${this.game.wave} (Active: ${this.game.waveManager.isWaveActive})`,
            `Build Mode: ${this.game.getActiveTower() ? 'ON' : 'OFF'}`,
            `----------------`,
            ...this.logs.slice().reverse() // Показываем новые сверху
        ].join('\n');

        const el = document.getElementById('debug-content');
        if (el) el.innerText = info;
    }

    private togglePanel() {
        const isHidden = this.elDebugPanel.style.display === 'none';
        this.elDebugPanel.style.display = isHidden ? 'flex' : 'none';
    }

    private copyReport() {
        const report = {
            meta: { ua: navigator.userAgent, res: `${window.innerWidth}x${window.innerHeight}` },
            state: {
                money: this.game.money,
                wave: this.game.wave,
                frames: this.game.frames,
                enemiesCount: this.game.enemies.length,
                towersCount: this.game.towers.length
            },
            logs: this.logs
        };
        
        const text = "```json\n" + JSON.stringify(report, null, 2) + "\n```";
        navigator.clipboard.writeText(text).then(() => {
            this.log("Report copied to clipboard!");
            alert("Report copied!");
        });
    }
}