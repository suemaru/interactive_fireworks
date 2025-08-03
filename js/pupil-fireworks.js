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
        
        // モバイル：どこをタップしてもスペースキー相当の動作
        // 瞳領域内のランダム位置から遠近感のある花火を発射
        this.createRandomDepthFireworks();
        
        console.log(`Random depth fireworks launched from mobile tap!`);
    }
    
    createFirework(x, y, depthOptions = {}) {
        // デフォルトの深度オプション
        const depth = depthOptions.depth || 'middle';
        const sizeMultiplier = depthOptions.sizeMultiplier || 1.0;
        const intensityMultiplier = depthOptions.intensityMultiplier || 1.0;
        
        // ランダムな花火タイプを選択
        const shellTypes = [
            FireworksCore.crysanthemumShell,
            FireworksCore.ringShell,
            FireworksCore.willowShell,
            FireworksCore.palmShell
        ];
        
        const shellType = shellTypes[Math.floor(Math.random() * shellTypes.length)];
        
        // 深度に応じてサイズ調整
        const adjustedSize = Math.max(0, Math.min(4, this.config.fireworkSize * sizeMultiplier));
        const shell = new FireworksCore.Shell(shellType(adjustedSize));
        
        // 深度情報を保存（描画時に使用）
        shell.depthLayer = depth;
        shell.intensityMultiplier = intensityMultiplier;
        
        shell.burst(x, y);
        
        console.log(`Firework created at (${x}, ${y}) with depth: ${depth}, size: ${adjustedSize.toFixed(1)}`);
    }
    
    /**
     * 遠近感のある花火発射システム
     * タップ位置を中心に手前・中間・奥の花火をランダム配置
     */
    createDepthVariationFireworks(tapX, tapY) {
        const fireworkCount = 3 + Math.floor(Math.random() * 3); // 3〜5発
        
        // 深度レイヤー定義
        const depthLayers = [
            {
                name: 'background',
                weight: 0.3, // 30%の確率
                sizeMultiplier: 0.4, // 40%のサイズ
                intensityMultiplier: 0.3, // 30%の明度
                spreadRadius: 200, // 広い分散範囲
                heightOffset: -80 // より高い位置
            },
            {
                name: 'middle',
                weight: 0.4, // 40%の確率
                sizeMultiplier: 0.7, // 70%のサイズ
                intensityMultiplier: 0.6, // 60%の明度
                spreadRadius: 120, // 中程度の分散範囲
                heightOffset: -40 // 中程度の高さ
            },
            {
                name: 'foreground',
                weight: 0.3, // 30%の確率
                sizeMultiplier: 1.2, // 120%のサイズ
                intensityMultiplier: 1.0, // 100%の明度
                spreadRadius: 80, // 狭い分散範囲
                heightOffset: 0 // 手前は元の高さ
            }
        ];
        
        // 各花火の発射
        for (let i = 0; i < fireworkCount; i++) {
            // 深度レイヤーをランダム選択（重み付き）
            const layer = this.selectRandomDepthLayer(depthLayers);
            
            // タップ位置からの分散計算
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * layer.spreadRadius;
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            // 最終的な発射位置
            const finalX = tapX + offsetX;
            const finalY = tapY + offsetY + layer.heightOffset;
            
            // 発射タイミングを遅延（自然な時差）
            const delay = i * (100 + Math.random() * 200); // 100〜300msの間隔
            
            setTimeout(() => {
                this.createFirework(finalX, finalY, {
                    depth: layer.name,
                    sizeMultiplier: layer.sizeMultiplier,
                    intensityMultiplier: layer.intensityMultiplier
                });
            }, delay);
        }
    }
    
    /**
     * 重み付きランダム選択
     */
    selectRandomDepthLayer(layers) {
        const totalWeight = layers.reduce((sum, layer) => sum + layer.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const layer of layers) {
            random -= layer.weight;
            if (random <= 0) {
                return layer;
            }
        }
        
        return layers[layers.length - 1]; // フォールバック
    }
    
    createRandomDepthFireworks() {
        // 瞳領域内のランダムな位置を取得（3〜5発分）
        const fireworkCount = 3 + Math.floor(Math.random() * 3); // 3〜5発
        const positions = this.getRandomMaskPositions(fireworkCount);
        
        if (positions.length > 0) {
            // 各花火に遠近感を付けて発射（スペースキー相当）
            for (let i = 0; i < positions.length; i++) {
                const position = positions[i];
                
                // 遠近感の深度レイヤー定義
                const depthLayers = [
                    { name: 'background', weight: 2, sizeMultiplier: 0.6, intensityMultiplier: 0.4, heightOffset: 0 },
                    { name: 'middle', weight: 5, sizeMultiplier: 1.0, intensityMultiplier: 1.0, heightOffset: 50 },
                    { name: 'foreground', weight: 3, sizeMultiplier: 1.6, intensityMultiplier: 1.3, heightOffset: 100 }
                ];
                
                const layer = this.selectRandomDepthLayer(depthLayers);
                
                // ランダムな高さオフセットを追加（より自然に）
                const heightVariation = -50 + Math.random() * 100; // ±50pxの変化
                const finalY = Math.max(50, position.y + layer.heightOffset + heightVariation);
                
                // 発射タイミングを遅延（自然な時差）
                const delay = i * (100 + Math.random() * 200); // 100〜300msの間隔
                
                setTimeout(() => {
                    this.createFirework(position.x, finalY, {
                        depth: layer.name,
                        sizeMultiplier: layer.sizeMultiplier,
                        intensityMultiplier: layer.intensityMultiplier
                    });
                }, delay);
            }
            
            console.log(`${fireworkCount} random depth fireworks launched from pupil area!`);
        } else {
            // フォールバック：画面中央で花火発射
            const centerX = this.stages.main.width / 2;
            const centerY = this.stages.main.height / 2;
            this.createFirework(centerX, centerY);
            console.log('Fallback: firework launched from center');
        }
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
    
    isPointInMask(x, y) {
        // マスク画像がない場合は常にtrue
        if (!this.assets.mask) {
            return true;
        }
        
        const stage = this.stages.main;
        const displayWidth = stage.width;
        const displayHeight = stage.height;
        
        // 座標が画面外の場合はfalse
        if (x < 0 || y < 0 || x >= displayWidth || y >= displayHeight) {
            return false;
        }
        
        // マスクを一時的にキャンバスに描画してピクセル情報を取得
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = displayWidth;
        maskCanvas.height = displayHeight;
        
        // マスクを描画（表示サイズに合わせてスケール）
        maskCtx.drawImage(this.assets.mask, 0, 0, displayWidth, displayHeight);
        const imageData = maskCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
        const alpha = imageData.data[3];
        
        // 半透明以上なら有効領域
        return alpha > 128;
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
        
        // 花火と爆発フラッシュを一緒にマスク適用
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
        
        // 爆発フラッシュを先に描画（マスク適用対象）
        this.renderBurstFlashes(this.offscreenCtx);
        
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
        // 深度順にレンダリング（奥から手前へ）
        const depthOrder = ['background', 'middle', 'foreground'];
        
        depthOrder.forEach(depthLayer => {
            this.renderFireworksLayer(ctx, depthLayer);
        });
    }
    
    renderFireworksLayer(ctx, targetDepth) {
        // 深度に応じた透明度設定（線の太さは美しさ重視で固定）
        const depthSettings = {
            'background': { alpha: 0.4, glowEffect: false },
            'middle': { alpha: 0.8, glowEffect: true },
            'foreground': { alpha: 1.0, glowEffect: true }
        };
        
        const settings = depthSettings[targetDepth] || depthSettings['middle'];
        
        // Starsの描画（深度フィルタリング） - 美しい2層炎描画
        ctx.lineCap = 'round';
        
        FireworksCore.COLOR_CODES.forEach(color => {
            const stars = FireworksCore.Star.active[color];
            
            // 対象深度のパーティクルのみフィルタリング
            const depthFilteredStars = stars.filter(star => {
                return star.depthLayer === targetDepth || (!star.depthLayer && targetDepth === 'middle');
            });
            
            if (depthFilteredStars.length === 0) return;
            
            // 2層描画：外炎（太い）→ 内炎（細い）の順序で美しいグラデーション
            depthFilteredStars.forEach(star => {
                if (!star.visible) return;
                
                const lifeRatio = star.life / star.fullLife;
                const intensity = settings.alpha * lifeRatio;
                
                // 動的色変化の計算
                const evolutionColor = FireworksCore.interpolateColorEvolution(star.colorEvolution, lifeRatio);
                
                // 外炎描画（太い線、色彩豊か）
                ctx.globalAlpha = intensity * 0.8;
                ctx.lineWidth = FireworksCore.Star.drawWidth + 1;
                ctx.strokeStyle = evolutionColor || star.colorVariation || star.color;
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(star.prevX, star.prevY);
                ctx.stroke();
                
                // 内炎描画（細い線、白熱）
                ctx.globalAlpha = intensity;
                ctx.lineWidth = Math.max(1, FireworksCore.Star.drawWidth - 1);
                ctx.strokeStyle = star.flameGradient ? star.flameGradient.inner : star.color;
                ctx.beginPath();
                ctx.moveTo(star.x, star.y);
                ctx.lineTo(star.prevX, star.prevY);
                ctx.stroke();
            });
        });
        
        // Sparksの描画（深度フィルタリング）- 繊細で美しい火花表現
        ctx.lineCap = 'round';
        
        FireworksCore.COLOR_CODES.forEach(color => {
            const sparks = FireworksCore.Spark.active[color];
            
            // 対象深度のパーティクルのみフィルタリング
            const depthFilteredSparks = sparks.filter(spark => {
                return spark.depthLayer === targetDepth || (!spark.depthLayer && targetDepth === 'middle');
            });
            
            if (depthFilteredSparks.length === 0) return;
            
            // 個別に美しい火花を描画
            depthFilteredSparks.forEach(spark => {
                const lifeRatio = spark.life / spark.fullLife;
                const intensity = settings.alpha * lifeRatio;
                
                // 動的色変化の計算
                const evolutionColor = FireworksCore.interpolateColorEvolution(spark.colorEvolution, lifeRatio);
                const currentColor = evolutionColor || spark.colorVariation || spark.color;
                
                // グロー効果（寿命に応じて変化）
                if (settings.glowEffect && lifeRatio > 0.3) {
                    ctx.globalAlpha = intensity * 0.4;
                    ctx.lineWidth = Math.max(1.2, FireworksCore.Spark.drawWidth * 1.4);
                    ctx.strokeStyle = currentColor;
                    ctx.beginPath();
                    ctx.moveTo(spark.x, spark.y);
                    ctx.lineTo(spark.prevX, spark.prevY);
                    ctx.stroke();
                }
                
                // メイン火花描画（細く美しく）
                ctx.globalAlpha = intensity;
                ctx.lineWidth = Math.max(0.4, FireworksCore.Spark.drawWidth * 0.7);
                
                // 寿命後半は内炎色（より白く）に変化、またはevolution色使用
                if (lifeRatio < 0.5 && spark.flameGradient && !evolutionColor) {
                    ctx.strokeStyle = spark.flameGradient.inner;
                } else {
                    ctx.strokeStyle = currentColor;
                }
                
                ctx.beginPath();
                ctx.moveTo(spark.x, spark.y);
                ctx.lineTo(spark.prevX, spark.prevY);
                ctx.stroke();
            });
        });
        
        // アルファ値をリセット
        ctx.globalAlpha = 1.0;
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
        Object.keys(FireworksCore.Star.active).forEach(color => {
            const particles = FireworksCore.Star.active[color];
            if (particles.length > 0) {
                data.colors.push({ color, count: particles.length });
                data.particleCount += particles.length;
            }
        });
        
        // Spark（火花）をカウント
        Object.keys(FireworksCore.Spark.active).forEach(color => {
            const sparks = FireworksCore.Spark.active[color];
            if (sparks.length > 0) {
                data.particleCount += sparks.length * 0.3; // 火花は重み軽め
            }
        });
        
        // BurstFlash（爆発フラッシュ）をカウント
        data.burstCount = FireworksCore.BurstFlash.active.length;
        
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