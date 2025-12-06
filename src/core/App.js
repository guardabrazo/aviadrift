import * as Tone from 'tone';
import { MapManager } from '../map/MapManager';
import { UIManager } from '../ui/UIManager';
import { Director } from '../logic/Director';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export class App {
    constructor() {
        this.mapManager = new MapManager(MAPBOX_TOKEN);
        this.uiManager = new UIManager();
        this.director = new Director(this.mapManager, this.uiManager);
        this.animationFrameId = null;
    }

    async init() {
        // 1. Init UI
        this.uiManager.init();
        this.wireUIEvents();

        // 2. Init Map
        await this.mapManager.init('map');

        // 3. Silent Start (Load Audio Buffers & Start Logic)
        try {
            console.log('Loading Audio Buffers...');
            await this.director.initAudio();
            console.log('Audio Buffers Loaded. Starting Director...');
            this.director.start();
        } catch (e) {
            console.error('Auto-start failed:', e);
        }

        // 4. Resume Audio Context on First Interaction (Browser Policy)
        const resumeAudio = async () => {
            this.uiManager.stopPlayButtonAnimation();

            if (Tone.context.state !== 'running') {
                console.log('Resuming Audio Context...');
                await Tone.start();
                console.log('Audio Context Resumed.');
            }
            document.removeEventListener('mousedown', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
        };

        document.addEventListener('mousedown', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);

        // 5. Start Animation Loop
        this.animate();
    }

    wireUIEvents() {
        this.uiManager.on('play', async () => {
            if (!this.director.audioInitialized) {
                try {
                    await Tone.start();
                    await this.director.initAudio();
                    this.uiManager.hideOverlay();
                } catch (e) {
                    console.error(e);
                    return;
                }
            }
            this.director.start();
        });

        this.uiManager.on('stop', () => this.director.stop());
        this.uiManager.on('setMapStyle', (style) => this.mapManager.setStyle(style));
        this.uiManager.on('setWanderMode', (mode) => this.director.wanderer.setMode(mode));
        this.uiManager.on('setWanderDirection', (deg) => this.director.wanderer.setBearing(deg));
        this.uiManager.on('setFlySpeed', (val) => this.director.wanderer.setSpeed(val));
    }

    animate() {
        const mapData = this.analyzeMap();
        this.director.update(mapData);
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    analyzeMap() {
        if (!this.mapManager.map) return { type: 'mix', elevation: 0 };

        const center = this.mapManager.getCenter();
        const centerPoint = this.mapManager.getProjectedCenter();

        // Get Elevation
        const elevation = this.mapManager.map.queryTerrainElevation(center) || 0;

        // Check if over water
        const centerFeatures = this.mapManager.getFeatures([
            [centerPoint.x - 1, centerPoint.y - 1],
            [centerPoint.x + 1, centerPoint.y + 1]
        ]);

        let isCenterWater = false;
        for (const f of centerFeatures) {
            if (f.layer.id.includes('water')) {
                isCenterWater = true;
                break;
            }
            if (f.layer.id.includes('building') || f.layer.id.includes('landuse') || f.layer.id.includes('park')) {
                break;
            }
        }

        // Determine terrain type
        let type = 'mix';
        if (elevation <= 0.5) {
            type = 'water';
        } else if (isCenterWater) {
            type = 'water';
        }

        return { type, elevation };
    }
}
