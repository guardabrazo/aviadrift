export class UIManager {
    constructor() {
        this.callbacks = {};
        this.elements = {};
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        this.elements = {
            startOverlay: document.getElementById('start-overlay'),
            playBtn: document.getElementById('play-btn'),
            stopBtn: document.getElementById('stop-btn'),
            flySpeedInput: document.getElementById('fly-speed'),
            flySpeedVal: document.getElementById('fly-speed-val'),
            mapStyleInput: document.getElementById('map-style'),
            masterVolumeInput: document.getElementById('master-volume'),
            masterVolumeVal: document.getElementById('master-volume-val'),
            flightToggle: document.getElementById('flight-toggle'),
            autopilotToggle: document.getElementById('autopilot-toggle'),
            compassToggle: document.getElementById('compass-toggle'),
        };
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }

    setupEventListeners() {
        const { startOverlay, playBtn, stopBtn, flySpeedInput, mapStyleInput } = this.elements;

        if (startOverlay) {
            const start = () => {
                this.hideOverlay();
                this.emit('play');
            };
            startOverlay.addEventListener('click', start);
            startOverlay.addEventListener('touchstart', start);
        }

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.emit('play');
                playBtn.style.borderColor = 'var(--accent)';
                if (stopBtn) stopBtn.style.borderColor = '';
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.emit('stop');
                if (playBtn) playBtn.style.borderColor = '';
                stopBtn.style.borderColor = 'var(--accent)';
            });
        }

        if (flySpeedInput) {
            flySpeedInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.emit('setFlySpeed', val);
                if (this.elements.flySpeedVal) this.elements.flySpeedVal.textContent = val.toFixed(1);
            });
        }

        if (mapStyleInput) {
            mapStyleInput.addEventListener('change', (e) => {
                const style = e.target.value;
                this.emit('setMapStyle', style);

                // Update Compass Theme
                const compassContainer = document.getElementById('compass-container');
                if (compassContainer) {
                    compassContainer.classList.remove('theme-outdoors', 'theme-satellite');
                    if (style.includes('outdoors')) {
                        compassContainer.classList.add('theme-outdoors');
                    } else if (style.includes('satellite')) {
                        compassContainer.classList.add('theme-satellite');
                    }
                }
            });
        }

        if (this.elements.compassToggle) {
            this.elements.compassToggle.addEventListener('change', (e) => {
                this.emit('setCompass', e.target.checked);
            });
        }

        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.emit('forceRefresh');
            });
        }

        if (this.elements.masterVolumeInput) {
            this.elements.masterVolumeInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.emit('setMasterVolume', val);
                if (this.elements.masterVolumeVal) this.elements.masterVolumeVal.textContent = `${val}%`;
            });
        }

        if (this.elements.flightToggle) {
            this.elements.flightToggle.addEventListener('change', (e) => {
                this.emit('setFlight', e.target.checked);
            });
        }

        if (this.elements.autopilotToggle) {
            // Rotary Knob Logic
            this.knob = document.getElementById('heading-knob');
            this.isDraggingKnob = false;
            this.currentKnobAngle = 0;

            if (this.knob) {
                this.knob.addEventListener('mousedown', (e) => {
                    this.isDraggingKnob = true;
                    this.updateKnobFromEvent(e);
                    document.body.style.userSelect = 'none';
                });

                window.addEventListener('mousemove', (e) => {
                    if (this.isDraggingKnob) {
                        this.updateKnobFromEvent(e);
                    }
                });

                window.addEventListener('mouseup', () => {
                    this.isDraggingKnob = false;
                    document.body.style.userSelect = '';
                });
            }

            this.on('setAutopilot', (enabled) => {
                if (this.knob) {
                    if (enabled) {
                        this.knob.classList.add('disabled');
                    } else {
                        this.knob.classList.remove('disabled');
                    }
                }
            });

            this.elements.autopilotToggle.addEventListener('change', (e) => {
                const isAutopilot = e.target.checked;
                this.emit('setAutopilot', isAutopilot);

                if (!isAutopilot && this.currentKnobAngle !== undefined) {
                    this.emit('setWanderDirection', this.currentKnobAngle);
                }
            });
        }

        const zenBtn = document.getElementById('zen-mode-btn');
        if (zenBtn) {
            zenBtn.addEventListener('click', () => this.toggleZenMode());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('zen-mode')) {
                this.toggleZenMode();
            }
        });
    }

    updateKnobFromEvent(e) {
        if (!this.knob) return;

        const rect = this.knob.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        let angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);
        angleDeg += 90;
        if (angleDeg < 0) angleDeg += 360;

        this.currentKnobAngle = angleDeg;
        this.setKnobRotation(angleDeg);
        this.emit('setWanderDirection', angleDeg);
    }

    setKnobRotation(deg) {
        if (this.knob) {
            this.knob.style.transform = `rotate(${deg}deg)`;
        }
    }

    hideOverlay() {
        if (this.elements.startOverlay) this.elements.startOverlay.classList.add('hidden');
    }

    toggleZenMode() {
        document.body.classList.toggle('zen-mode');
        const isZen = document.body.classList.contains('zen-mode');

        if (isZen) {
            const overlay = document.getElementById('zen-overlay');
            if (overlay) {
                overlay.style.display = '';
                void overlay.offsetWidth;
                overlay.classList.remove('hidden');
                setTimeout(() => {
                    overlay.classList.add('hidden');
                }, 2000);
            }
        }

        this.emit('toggleZenMode', isZen);
    }

    stopPlayButtonAnimation() {
        if (this.elements.playBtn) {
            this.elements.playBtn.classList.remove('highlight-pulse');
        }
    }
}
