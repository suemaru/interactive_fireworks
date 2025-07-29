/**
 * Stage class - Canvas要素のラッパークラス
 * HiDPI対応、イベント処理、リサイズ処理を提供
 */
class Stage {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element not found: ${canvasId}`);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        this.width = 0;
        this.height = 0;
        
        // イベントリスナーの管理
        this.eventListeners = new Map();
        
        // Canvas設定
        this.setupCanvas();
        
        // イベント処理のバインド
        this.bindEvents();
    }
    
    setupCanvas() {
        // HiDPI対応
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    bindEvents() {
        // ポインターイベント処理（マウス + タッチ対応）
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        
        // コンテキストメニュー無効化
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handlePointerDown(event) {
        const coords = this.getEventCoords(event);
        const customEvent = {
            ...coords,
            onCanvas: true,
            originalEvent: event
        };
        this.emit('pointerstart', customEvent);
    }
    
    handlePointerMove(event) {
        const coords = this.getEventCoords(event);
        const customEvent = {
            ...coords,
            onCanvas: true,
            originalEvent: event
        };
        this.emit('pointermove', customEvent);
    }
    
    handlePointerUp(event) {
        const coords = this.getEventCoords(event);
        const customEvent = {
            ...coords,
            onCanvas: true,
            originalEvent: event
        };
        this.emit('pointerend', customEvent);
    }
    
    getEventCoords(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    
    addEventListener(type, listener) {
        if (!this.eventListeners.has(type)) {
            this.eventListeners.set(type, []);
        }
        this.eventListeners.get(type).push(listener);
    }
    
    removeEventListener(type, listener) {
        if (!this.eventListeners.has(type)) return;
        const listeners = this.eventListeners.get(type);
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    emit(type, event) {
        if (!this.eventListeners.has(type)) return;
        const listeners = this.eventListeners.get(type);
        listeners.forEach(listener => listener(event));
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        
        // Canvas要素のサイズ設定
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Canvas描画サイズ設定（HiDPI対応）
        this.canvas.width = width * this.dpr;
        this.canvas.height = height * this.dpr;
        
        // スケール調整
        this.ctx.scale(this.dpr, this.dpr);
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    // アニメーションティッカー（30FPS目標でパフォーマンス向上）
    startTicker() {
        let lastTime = 0;
        const targetFPS = 30; // 60FPSから30FPSに変更
        const targetFrameTime = 1000 / targetFPS;
        
        const tick = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            
            if (deltaTime >= targetFrameTime) {
                const lag = Math.min(deltaTime / 33.33, 3); // 30FPS基準に調整
                
                this.emit('ticker', {
                    frameTime: deltaTime,
                    lag: lag,
                    currentTime: currentTime
                });
                
                lastTime = currentTime - (deltaTime % targetFrameTime);
            }
            
            this.rafId = requestAnimationFrame(tick);
        };
        
        this.rafId = requestAnimationFrame(tick);
    }
    
    stopTicker() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
    
    destroy() {
        this.stopTicker();
        this.eventListeners.clear();
        
        // Canvas要素からイベントリスナーを削除
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    }
} 