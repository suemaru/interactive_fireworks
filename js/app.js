/**
 * Application Entry Point
 * インタラクティブ瞳花火システムの初期化とエラーハンドリング
 */

// アプリケーション設定
const APP_CONFIG = {
    // アセット設定
    backgroundImage: 'assets/bg.png',
    maskImage: 'assets/mask.png',
    
    // 花火設定
    fireworkSize: 2, // 0-4 のサイズ
    quality: 'normal', // 'low', 'normal', 'high'
    
    // レンダリング設定
    blendMode: 'screen', // 'screen', 'lighter', 'multiply', 'overlay'
    targetFPS: 30, // 30FPS目標に変更
    
    // デバッグ設定
    debug: true // デバッグモードを有効化
};

// アプリケーションインスタンス
let app = null;

// 初期化フラグ
let isInitializing = false;

/**
 * アプリケーションの初期化
 */
async function initializeApp() {
    if (isInitializing || app) {
        return;
    }
    
    isInitializing = true;
    
    try {
        console.log('Initializing Interactive Pupil Fireworks System...');
        
        // ブラウザ互換性チェック
        if (!checkBrowserCompatibility()) {
            throw new Error('Your browser does not support the required features for this application.');
        }
        
        // アプリケーション作成
        app = new PupilFireworksApp(APP_CONFIG);
        
        // 初期化完了を待つ
        await waitForInitialization();
        
        // アプリケーション開始
        app.start();
        
        // デバッグ情報の表示
        if (APP_CONFIG.debug) {
            setupDebugInfo();
        }
        
        // キーボードショートカット設定
        setupKeyboardShortcuts();
        
        // タップヒントを表示
        showTapHint();
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showInitializationError(error);
    } finally {
        isInitializing = false;
    }
}

/**
 * 初期化完了を待つ
 */
function waitForInitialization() {
    return new Promise((resolve, reject) => {
        const maxWaitTime = 10000; // 10秒
        const checkInterval = 100; // 100ms
        let elapsed = 0;
        
        const checkReady = () => {
            if (app && app.isInitialized) {
                resolve();
                return;
            }
            
            elapsed += checkInterval;
            if (elapsed >= maxWaitTime) {
                reject(new Error('Initialization timeout'));
                return;
            }
            
            setTimeout(checkReady, checkInterval);
        };
        
        checkReady();
    });
}

/**
 * ブラウザ互換性チェック
 */
function checkBrowserCompatibility() {
    // Canvas 2D Context のサポートチェック
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
        console.error('Canvas not supported');
        return false;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Canvas 2D context not supported');
        return false;
    }
    
    // requestAnimationFrame のサポートチェック
    if (!window.requestAnimationFrame) {
        console.error('requestAnimationFrame not supported');
        return false;
    }
    
    // Pointer Events のサポートチェック
    if (!window.PointerEvent) {
        console.warn('Pointer Events not supported, falling back to mouse/touch events');
    }
    
    return true;
}

/**
 * デバッグ情報の設定
 */
function setupDebugInfo() {
    // デバッグパネル作成
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        border-radius: 5px;
        z-index: 1000;
        pointer-events: none;
        display: none;
    `;
    document.body.appendChild(debugPanel);
    
    // デバッグ情報の更新
    setInterval(() => {
        if (app) {
            const debugInfo = app.getDebugInfo();
            debugPanel.innerHTML = `
                <div>FPS: ${debugInfo.fps}</div>
                <div>Running: ${debugInfo.isRunning}</div>
                <div>Stars: ${debugInfo.starCount}</div>
                <div>Sparks: ${debugInfo.sparkCount}</div>
                <div>Canvas: ${debugInfo.canvasSize.width}x${debugInfo.canvasSize.height}</div>
            `;
        }
    }, 1000);
}

/**
 * キーボードショートカットの設定
 */
let keyboardHandler = null; // 既存ハンドラー追跡用

function setupKeyboardShortcuts() {
    // 既存のキーボードハンドラーを削除
    if (keyboardHandler) {
        document.removeEventListener('keydown', keyboardHandler);
    }
    
    const blendModes = ['screen', 'lighter', 'multiply', 'overlay', 'difference'];
    let currentBlendIndex = 0;
    
    // 新しいハンドラーを作成
    keyboardHandler = (event) => {
        if (!app) return;
        
        switch (event.key) {
            case ' ': // スペースキー - 花火発射
                event.preventDefault();
                // タップヒントを隠す
                hideTapHint();
                
                if (app.isRunning) {
                    // 画面中央付近で2箇所時間差花火発射
                    const centerX = app.stages.main.width / 2 - 30;
                    const centerY = app.stages.main.height / 2 - 30;
                    
                    // 1つ目の花火を即座に発射
                    app.createFirework(centerX, centerY);
                    
                    // 2つ目の花火を0.2秒後に発射（少しずらして）
                    setTimeout(() => {
                        const offsetX = centerX + (Math.random() - 0.5) * 100;
                        const offsetY = centerY + (Math.random() - 0.5) * 100;
                        app.createFirework(offsetX, offsetY);
                    }, 200);
                    
                    console.log('Dual fireworks launched from spacebar!');
                } else {
                    app.resume();
                }
                break;
                
            case 'b':
            case 'B':
                // ブレンドモード切り替え
                currentBlendIndex = (currentBlendIndex + 1) % blendModes.length;
                const newBlendMode = blendModes[currentBlendIndex];
                app.updateConfig({ blendMode: newBlendMode });
                console.log(`Blend mode changed to: ${newBlendMode}`);
                break;
                
            case 'p':
            case 'P':
                // 一時停止/再生
                if (app.isRunning) {
                    app.pause();
                } else {
                    app.resume();
                }
                break;
                
            case 'd':
            case 'D':
                // デバッグ情報の切り替え
                const debugPanel = document.getElementById('debug-panel');
                if (debugPanel) {
                    debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
                }
                break;
                
            case 'r':
            case 'R':
                // リスタート
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    restartApp();
                }
                break;
        }
    };
    
    // 新しいハンドラーを登録
    document.addEventListener('keydown', keyboardHandler);
}

/**
 * アプリケーションの再起動
 */
async function restartApp() {
    console.log('Restarting application...');
    
    if (app) {
        app.destroy();
        app = null;
    }
    
    // 少し待ってから再初期化
    setTimeout(() => {
        initializeApp();
    }, 100);
}

/**
 * 初期化エラーの表示
 */
function showInitializationError(error) {
    const errorElement = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    
    if (loading) loading.style.display = 'none';
    if (errorElement) errorElement.style.display = 'block';
    if (errorMessage) {
        errorMessage.textContent = `Initialization failed: ${error.message}`;
    }
    
    // リトライボタンの追加
    if (errorElement && !document.getElementById('retry-button')) {
        const retryButton = document.createElement('button');
        retryButton.id = 'retry-button';
        retryButton.textContent = 'Retry';
        retryButton.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        retryButton.addEventListener('click', () => {
            errorElement.style.display = 'none';
            retryButton.remove();
            restartApp();
        });
        errorElement.appendChild(retryButton);
    }
}

/**
 * ページ読み込み時の処理
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    initializeApp();
});

/**
 * タップヒントの表示
 */
function showTapHint() {
    const tapHint = document.getElementById('tap-hint');
    if (tapHint) {
        // 少し遅延してからヒントを表示（アプリが完全に読み込まれてから）
        setTimeout(() => {
            tapHint.style.display = 'block';
        }, 500);
    }
}

/**
 * タップヒントの非表示
 */
function hideTapHint() {
    const tapHint = document.getElementById('tap-hint');
    if (tapHint) {
        tapHint.style.display = 'none';
    }
}

/**
 * ページ離脱時の処理
 */
window.addEventListener('beforeunload', () => {
    if (app) {
        console.log('Cleaning up application...');
        app.destroy();
    }
});

/**
 * エラーハンドリング
 */
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    if (event.error && event.error.message.includes('Canvas')) {
        showInitializationError(new Error('Canvas rendering error. Please refresh the page.'));
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// グローバル関数として公開（デバッグ用）
window.appDebug = {
    getApp: () => app,
    restart: restartApp,
    getConfig: () => APP_CONFIG,
    setConfig: (newConfig) => {
        Object.assign(APP_CONFIG, newConfig);
        if (app) {
            app.updateConfig(newConfig);
        }
    }
};

// グローバル関数として公開
window.showTapHint = showTapHint;
window.hideTapHint = hideTapHint; 