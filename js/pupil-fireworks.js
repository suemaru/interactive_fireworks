/**
 * PupilFireworksApp - インタラクティブ瞳花火システム
 * マスキング、アセット管理、レンダリング、インタラクションを統合
 */
class PupilFireworksApp {
    constructor(config = {}) {
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            backgroundImage: 'assets/bg.png',
            maskImage: 'assets/mask.png',
            blendMode: 'screen',
            targetFPS: 60,
            fireworkSize: 2, // 0-4 のサイズ
            quality: 'normal', // 'low', 'normal', 'high'
            ...config
        };
        
        // 状態管理
        this.isInitialized = false;
        this.isRunning = false;
        this.assets = {};
        this.lastFrameTime = 0;
        this.simulationSpeed = 1;
        
        // キャンバス関連
        this.stages = {};
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        // アスペクト比管理
        this.aspectRatio = 4 / 3; // デフォルト
        
        // パフォーマンス監視
        this.fpsCounter = {
            frames: 0,
            lastTime: 0,
            currentFPS: 60
        };
        
        // パフォーマンス最適化フラグ
        this.frameSkipCounter = 0;
        
        this.init();
    }
    
    async init() {
        try {
            this.showLoading();
            
            // ステージ初期化
            this.initStages();
            
            // アセット読み込み
            await this.loadAssets();
            
            // マスキングシステム初期化
            this.initMaskingSystem();
            
            // イベントリスナー設定
            this.bindEvents();
            
            // 初期サイズ設定
            this.handleResize();
            
            this.isInitialized = true;
            this.hideLoading();
            
            console.log('PupilFireworksApp initialized successfully');
        } catch (error) {
            this.showError(error.message);
            console.error('Initialization failed:', error);
        }
    }
    
    initStages() {
        this.stages.trails = new Stage('trails-canvas');
        this.stages.main = new Stage('main-canvas');
        
        // アニメーションループ設定（シンプル版）
        this.stages.main.addEventListener('ticker', (event) => {
            if (this.isRunning) {
                this.update(event.frameTime, event.lag);
            }
        });
    }
    
    async loadAssets() {
        const loadPromises = [];
        
        // 背景画像読み込み
        if (this.config.backgroundImage) {
            loadPromises.push(
                this.loadImage(this.config.backgroundImage, 'background')
            );
        }
        
        // マスク画像読み込み
        if (this.config.maskImage) {
            loadPromises.push(
                this.loadImage(this.config.maskImage, 'mask')
            );
        }
        
        await Promise.all(loadPromises);
        
        // アスペクト比計算
        if (this.assets.background) {
            this.aspectRatio = this.assets.background.width / this.assets.background.height;
        }
    }
    
    loadImage(url, key) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets[key] = img;
                console.log(`Asset loaded: ${key} (${img.width}x${img.height})`);
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }
    
    initMaskingSystem() {
        // オフスクリーンキャンバス作成
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        // マスクキャンバス作成
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');
    }
    
    bindEvents() {
        // インタラクションイベント
        this.stages.main.addEventListener('pointerstart', (event) => {
            this.handleInteraction(event);
        });
        
        // リサイズイベント
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // フォーカスイベント（パフォーマンス最適化）
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    handleInteraction(event) {
        if (!this.isRunning) return;
        
        // タップヒントを隠す
        if (window.hideTapHint) {
            window.hideTapHint();
        }
        
        // スペースキーと全く同じ処理：画面中央付近で2箇所時間差花火発射
        const centerX = this.stages.main.width / 2 - 30;
        const centerY = this.stages.main.height / 2 - 30;
        
        // 1つ目の花火を即座に発射
        this.createFirework(centerX, centerY);
        
        // 2つ目の花火を0.2秒後に発射（少しずらして）
        setTimeout(() => {
            const offsetX = centerX + (Math.random() - 0.5) * 100;
            const offsetY = centerY + (Math.random() - 0.5) * 100;
            this.createFirework(offsetX, offsetY);
        }, 200);
        
        console.log('Dual fireworks launched from click/tap!');
    }
    
    createFirework(x, y) {
        // ランダムな花火タイプを選択
        const shellTypes = [
            FireworksCore.crysanthemumShell,
            FireworksCore.ringShell,
            FireworksCore.willowShell,
            FireworksCore.palmShell
        ];
        
        const shellType = shellTypes[Math.floor(Math.random() * shellTypes.length)];
        const shell = new FireworksCore.Shell(shellType(this.config.fireworkSize));
        
        shell.burst(x, y);
        
        console.log(`Firework created at (${x}, ${y})`);
    }
    
    createDualFireworks() {
        // マスク内のランダムな2点を取得
        const positions = this.getRandomMaskPositions(2);
        
        if (positions.length >= 2) {
            // 1つ目の花火を即座に発射
            this.createFirework(positions[0].x, positions[0].y);
            
            // 2つ目の花火を0.2秒後に発射
            setTimeout(() => {
                this.createFirework(positions[1].x, positions[1].y);
            }, 200);
            
            console.log(`Dual fireworks launched at (${positions[0].x}, ${positions[0].y}) and (${positions[1].x}, ${positions[1].y})`);
        } else {
            // フォールバック：画面中央で花火発射
            const centerX = this.stages.main.width / 2;
            const centerY = this.stages.main.height / 2;
            this.createFirework(centerX, centerY);
        }
    }
    
    getRandomMaskPositions(count = 2) {
        const positions = [];
        const stage = this.stages.main;
        
        // Stageクラスと同じ座標系を使用（表示サイズ）
        const displayWidth = stage.width;
        const displayHeight = stage.height;
        
        console.log(`Display size: ${displayWidth}x${displayHeight}`);
        console.log(`Mask image size: ${this.assets.mask ? this.assets.mask.width + 'x' + this.assets.mask.height : 'No mask'}`);
        
        // マスク画像がない場合は画面内のランダム位置を返す
        if (!this.assets.mask) {
            for (let i = 0; i < count; i++) {
                positions.push({
                    x: Math.random() * displayWidth,
                    y: Math.random() * displayHeight
                });
            }
            console.log('No mask found, using random display positions:', positions);
            return positions;
        }
        
        // マスク領域内のランダム位置を探す（表示サイズで処理）
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = displayWidth;
        maskCanvas.height = displayHeight;
        
        // マスクを描画（表示サイズに合わせてスケール）
        maskCtx.drawImage(this.assets.mask, 0, 0, displayWidth, displayHeight);
        const imageData = maskCtx.getImageData(0, 0, displayWidth, displayHeight);
        const pixels = imageData.data;
        
        // 有効な位置（アルファ値が0より大きい）を収集
        const validPositions = [];
        for (let y = 0; y < displayHeight; y += 2) { // パフォーマンス向上のため2pixel間隔
            for (let x = 0; x < displayWidth; x += 2) {
                const index = (y * displayWidth + x) * 4;
                const alpha = pixels[index + 3];
                if (alpha > 128) { // 半透明以上の領域
                    validPositions.push({ x, y });
                }
            }
        }
        
        // ランダムに選択
        console.log(`Found ${validPositions.length} valid mask positions`);
        for (let i = 0; i < count && validPositions.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * validPositions.length);
            positions.push(validPositions[randomIndex]);
            validPositions.splice(randomIndex, 1); // 重複避け
        }
        
        console.log(`Selected mask positions:`, positions);
        return positions;
    }
    
    handleResize() {
        const container = document.getElementById('stage-container');
        const containerRect = container.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // アスペクト比を維持してサイズ計算
        let canvasWidth, canvasHeight;
        
        if (windowWidth / windowHeight > this.aspectRatio) {
            // 高さを基準に幅を計算
            canvasHeight = Math.min(windowHeight, 800);
            canvasWidth = canvasHeight * this.aspectRatio;
        } else {
            // 幅を基準に高さを計算
            canvasWidth = Math.min(windowWidth, 1200);
            canvasHeight = canvasWidth / this.aspectRatio;
        }
        
        // ステージリサイズ
        Object.values(this.stages).forEach(stage => {
            stage.resize(canvasWidth, canvasHeight);
        });
        
        // オフスクリーンキャンバスリサイズ
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = canvasWidth;
            this.offscreenCanvas.height = canvasHeight;
        }
        
        if (this.maskCanvas) {
            this.maskCanvas.width = canvasWidth;
            this.maskCanvas.height = canvasHeight;
        }
        
        // コンテナサイズ設定
        container.style.width = canvasWidth + 'px';
        container.style.height = canvasHeight + 'px';
        
        // キャンバスリサイズ完了
        
        console.log(`Canvas resized to ${canvasWidth}x${canvasHeight}`);
    }
    
    update(frameTime, lag) {
        const speed = this.simulationSpeed * lag;
        
        // FPS計算
        this.updateFPS(frameTime);
        
        // 花火物理演算更新
        FireworksCore.updateFireworks(frameTime, speed);
        
        // レンダリング
        this.render(speed);
    }
    
    updateFPS(frameTime) {
        const now = performance.now();
        this.fpsCounter.frames++;
        
        if (now - this.fpsCounter.lastTime >= 1000) {
            this.fpsCounter.currentFPS = this.fpsCounter.frames;
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
            
            // パフォーマンス調整
            if (this.fpsCounter.currentFPS < 25) { // 45から25に変更
                console.warn(`Low FPS detected: ${this.fpsCounter.currentFPS}`);
                // 必要に応じてパーティクル数を削減
            }
        }
    }
    
    render(speed) {
        const trailsCtx = this.stages.trails.ctx;
        const mainCtx = this.stages.main.ctx;
        const width = this.stages.main.width;
        const height = this.stages.main.height;
        
        // 背景描画（毎フレーム実行してフェードアウトを防ぐ）
        this.renderBackground(trailsCtx, width, height);
        
        // トレイル効果（背景描画後に適用、軽量化）
        trailsCtx.globalCompositeOperation = 'source-over';
        trailsCtx.fillStyle = `rgba(0, 0, 0, ${0.05 * speed})`; // より軽い効果に調整
        trailsCtx.fillRect(0, 0, width, height);
        
        // メインキャンバスクリア
        mainCtx.clearRect(0, 0, width, height);
        
        // 爆発フラッシュ描画
        this.renderBurstFlashes(trailsCtx);
        
        // 花火描画（マスク適用）
        this.renderFireworksWithMask(trailsCtx, mainCtx, width, height);
        
        // 顔全体へのグローエフェクト（C: 色温度変化 + D: 動的明度変化）
        this.renderFaceGlow(trailsCtx, width, height);
    }
    
    renderBackground(ctx, width, height) {
        if (!this.assets.background) return;
        
        // 背景画像を画面全体にフィット
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.assets.background, 0, 0, width, height);
    }
    
    renderBurstFlashes(ctx) {
        while (FireworksCore.BurstFlash.active.length) {
            const bf = FireworksCore.BurstFlash.active.pop();
            
            const burstGradient = ctx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
            burstGradient.addColorStop(0.024, 'rgba(255, 255, 255, 1)');
            burstGradient.addColorStop(0.125, 'rgba(255, 160, 20, 0.2)');
            burstGradient.addColorStop(0.32, 'rgba(255, 140, 20, 0.11)');
            burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
            ctx.fillStyle = burstGradient;
            ctx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
            
            FireworksCore.BurstFlash.returnInstance(bf);
        }
    }
    
    renderFireworksWithMask(trailsCtx, mainCtx, width, height) {
        // オフスクリーンキャンバスで花火を描画
        this.offscreenCtx.clearRect(0, 0, width, height);
        
        // 花火描画
        this.renderFireworks(this.offscreenCtx);
        
        // マスク適用
        if (this.assets.mask) {
            this.applyMask(width, height);
        }
        
        // メインキャンバスに合成
        trailsCtx.globalCompositeOperation = this.config.blendMode;
        trailsCtx.drawImage(this.offscreenCanvas, 0, 0);
        trailsCtx.globalCompositeOperation = 'source-over';
    }
    
    renderFireworks(ctx) {
        // Starsの描画
        ctx.lineWidth = FireworksCore.Star.drawWidth;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        FireworksCore.COLOR_CODES.forEach(color => {
            const stars = FireworksCore.Star.active[color];
            ctx.strokeStyle = color;
            ctx.beginPath();
            stars.forEach(star => {
                if (star.visible) {
                    ctx.moveTo(star.x, star.y);
                    ctx.lineTo(star.prevX, star.prevY);
                }
            });
            ctx.stroke();
        });
        
        // Sparksの描画
        ctx.lineWidth = FireworksCore.Spark.drawWidth;
        ctx.lineCap = 'butt';
        
        FireworksCore.COLOR_CODES.forEach(color => {
            const sparks = FireworksCore.Spark.active[color];
            ctx.strokeStyle = color;
            ctx.beginPath();
            sparks.forEach(spark => {
                ctx.moveTo(spark.x, spark.y);
                ctx.lineTo(spark.prevX, spark.prevY);
            });
            ctx.stroke();
        });
    }
    
    applyMask(width, height) {
        // マスク画像の準備
        this.maskCtx.clearRect(0, 0, width, height);
        this.maskCtx.drawImage(this.assets.mask, 0, 0, width, height);
        
        // 花火にマスクを適用
        this.offscreenCtx.globalCompositeOperation = 'destination-in';
        this.offscreenCtx.drawImage(this.maskCanvas, 0, 0);
        this.offscreenCtx.globalCompositeOperation = 'source-over';
    }
    
    start() {
        if (!this.isInitialized) {
            console.warn('App not initialized yet');
            return;
        }
        
        this.isRunning = true;
        this.stages.main.startTicker();
        console.log('PupilFireworksApp started');
    }
    
    pause() {
        this.isRunning = false;
        console.log('PupilFireworksApp paused');
    }
    
    resume() {
        if (this.isInitialized) {
            this.isRunning = true;
            console.log('PupilFireworksApp resumed');
        }
    }
    
    stop() {
        this.isRunning = false;
        this.stages.main.stopTicker();
        console.log('PupilFireworksApp stopped');
    }
    
    destroy() {
        this.stop();
        Object.values(this.stages).forEach(stage => stage.destroy());
        window.removeEventListener('resize', this.handleResize);
        console.log('PupilFireworksApp destroyed');
    }
    
    // UI管理
    showLoading() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
    
    showError(message) {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const errorMessage = document.getElementById('error-message');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }
    
    // 設定変更
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('Config updated:', this.config);
        
        // 必要に応じてリロード
        if (newConfig.blendMode !== undefined) {
            // ブレンドモード変更時の処理
        }
    }
    
    // デバッグ情報
    getDebugInfo() {
        const starCount = FireworksCore.COLOR_CODES.reduce((total, color) => {
            return total + FireworksCore.Star.active[color].length;
        }, 0);
        
        const sparkCount = FireworksCore.COLOR_CODES.reduce((total, color) => {
            return total + FireworksCore.Spark.active[color].length;
        }, 0);
        
        return {
            fps: this.fpsCounter.currentFPS,
            isRunning: this.isRunning,
            starCount,
            sparkCount,
            canvasSize: {
                width: this.stages.main.width,
                height: this.stages.main.height
            }
        };
    }
    
    /**
     * 顔全体グローエフェクト
     * C: 色温度の変化 + D: 動的な明度変化（強調版）
     */
    renderFaceGlow(ctx, width, height) {
        // アクティブな花火データを収集
        const fireworkData = this.getActiveFireworkData();
        
        if (fireworkData.totalIntensity === 0) {
            return; // 花火がない場合は何もしない
        }
        
        // 花火の色に基づく色温度計算
        const dominantColor = this.calculateDominantColor(fireworkData.colors);
        const lightColor = this.getColorTemperature(dominantColor);
        
        // 動的明度計算（パーティクル数と爆発に基づく）
        const intensity = this.calculateLightIntensity(fireworkData);
        
        // 顔全体に放射状グラデーション適用（合成モードは内部で設定）
        this.applyFaceGradient(ctx, width, height, lightColor, intensity);
    }
    
    /**
     * アクティブな花火データ収集
     */
    getActiveFireworkData() {
        const data = {
            colors: [],
            totalIntensity: 0,
            burstCount: 0,
            particleCount: 0
        };
        
        // Star（メインパーティクル）をカウント
        Object.keys(Star.active).forEach(color => {
            const particles = Star.active[color];
            if (particles.length > 0) {
                data.colors.push({ color, count: particles.length });
                data.particleCount += particles.length;
            }
        });
        
        // Spark（火花）をカウント
        Object.keys(Spark.active).forEach(color => {
            const sparks = Spark.active[color];
            if (sparks.length > 0) {
                data.particleCount += sparks.length * 0.3; // 火花は重み軽め
            }
        });
        
        // BurstFlash（爆発フラッシュ）をカウント
        data.burstCount = BurstFlash.active.length;
        
        // 総強度計算
        data.totalIntensity = Math.min(1.0, 
            (data.particleCount * 0.001) + (data.burstCount * 0.3)
        );
        
        return data;
    }
    
    /**
     * 支配的な色を計算
     */
    calculateDominantColor(colorData) {
        if (colorData.length === 0) return 'white';
        
        // 最も多いパーティクル数の色を選択
        let maxCount = 0;
        let dominantColor = 'white';
        
        colorData.forEach(({ color, count }) => {
            if (count > maxCount) {
                maxCount = count;
                dominantColor = color;
            }
        });
        
        return dominantColor;
    }
    
    /**
     * C: 色温度の変化 - 花火の色に基づく照明色を決定（バランス版）
     */
    getColorTemperature(fireworkColor) {
        const colorMap = {
            // 暖色系（オレンジ・赤系の花火）- 適度な暖色
            'orange': { r: 255, g: 190, b: 100, temp: 'warm' },   // 適度なオレンジ
            'red': { r: 255, g: 140, b: 80, temp: 'warm' },       // 適度な赤
            'yellow': { r: 255, g: 235, b: 130, temp: 'warm' },   // 適度な黄色
            'gold': { r: 255, g: 210, b: 110, temp: 'warm' },     // 適度なゴールド
            
            // 寒色系（青・緑系の花火）- 適度な寒色
            'blue': { r: 130, g: 180, b: 255, temp: 'cool' },     // 適度な青
            'cyan': { r: 100, g: 210, b: 255, temp: 'cool' },     // 適度なシアン
            'green': { r: 130, g: 255, b: 160, temp: 'cool' },    // 適度な緑
            'purple': { r: 190, g: 130, b: 255, temp: 'cool' },   // 適度な紫
            
            // ニュートラル（白・銀系の花火）
            'white': { r: 255, g: 255, b: 255, temp: 'neutral' },
            'silver': { r: 230, g: 230, b: 255, temp: 'neutral' },
            
            // デフォルト
            'default': { r: 255, g: 210, b: 150, temp: 'warm' }
        };
        
        return colorMap[fireworkColor] || colorMap['default'];
    }
    
    /**
     * D: 動的明度変化 - パーティクル数と爆発に基づく光の強さ（バランス版）
     */
    calculateLightIntensity(fireworkData) {
        // ベース強度（0.0 - 1.0）- 適度に強化
        let intensity = fireworkData.totalIntensity * 1.2; // 1.2倍の適度な強化
        
        // 爆発フラッシュによる瞬間的な明度アップ（適度に）
        if (fireworkData.burstCount > 0) {
            intensity += fireworkData.burstCount * 0.6; // 0.6で適度な効果
        }
        
        // パーティクル密度による調整（適度に敏感）
        const particleDensity = Math.min(1.0, fireworkData.particleCount / 700); // 700で適度な敏感さ
        intensity = Math.min(1.0, intensity + particleDensity * 0.4); // 0.4で適度な効果
        
        // 振動効果（パーティクルの動きに連動したちらつき）- 適度に
        const baseFlicker = Math.sin(Date.now() * 0.015) * 0.15 + 0.85; // 適度なちらつき
        intensity *= baseFlicker;
        
        // パーティクル数による追加の脈動効果（控えめに）
        if (fireworkData.particleCount > 300) {
            const pulse = Math.sin(Date.now() * 0.008) * 0.2 + 0.8;
            intensity *= pulse;
        }
        
        return Math.max(0.0, Math.min(1.2, intensity)); // 最大値を1.2に調整
    }
    
    /**
     * 顔全体に放射状グラデーション適用（バランス版）
     */
    applyFaceGradient(ctx, width, height, lightColor, intensity) {
        if (intensity <= 0) return;
        
        // 瞳の中心点を光源として設定（画面中央付近）
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        
        // 適度な合成モードを使用
        ctx.globalCompositeOperation = 'overlay'; // overlayに戻して適度に
        
        // 放射状グラデーション作成
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,                    // 内側の円（瞳の中心）
            centerX, centerY, Math.max(width, height) * 0.85  // 外側の円を適度に
        );
        
        // グラデーションの色設定（バランス調整）
        const alpha = Math.min(0.7, intensity * 0.7); // 最大70%の透明度で適度に
        const centerAlpha = alpha;
        const midAlpha = alpha * 0.6;
        const edgeAlpha = alpha * 0.12;
        
        gradient.addColorStop(0, 
            `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${centerAlpha})`
        );
        gradient.addColorStop(0.25, 
            `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${midAlpha})`
        );
        gradient.addColorStop(0.6, 
            `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${midAlpha * 0.4})`
        );
        gradient.addColorStop(0.85, 
            `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${edgeAlpha})`
        );
        gradient.addColorStop(1, 
            `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0)`
        );
        
        // グラデーション描画
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 追加の強化効果：中心部により強い光（控えめに）
        if (intensity > 0.4) {
            const coreGradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, Math.min(width, height) * 0.15
            );
            
            const coreIntensity = (intensity - 0.4) * 1.0; // 1.0に抑えて適度に
            coreGradient.addColorStop(0, 
                `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, ${coreIntensity * 0.25})`
            );
            coreGradient.addColorStop(1, 
                `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0)`
            );
            
            ctx.fillStyle = coreGradient;
            ctx.fillRect(0, 0, width, height);
        }
        
        // 合成モードを元に戻す
        ctx.globalCompositeOperation = 'source-over';
    }
}

// グローバルに公開
window.PupilFireworksApp = PupilFireworksApp; 