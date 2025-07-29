/**
 * Fireworks Core System - 既存システムの高度な物理演算を移植
 * Star, Spark, Shell, BurstFlash システムとオブジェクトプール
 * 
 * Based on firework-simulator-v2
 * Original work: Copyright (c) 2025 Caleb Miller (https://codepen.io/MillerTime/pen/XgpNwb)
 * Licensed under MIT License
 */

// 定数定義
const GRAVITY = 0.9;
const PI_2 = Math.PI * 2;
const PI_HALF = Math.PI * 0.5;

const COLOR = {
    Red: '#ff0043',
    Green: '#14fc56',
    Blue: '#1e7fff',
    Purple: '#e60aff',
    Gold: '#ffbf36',
    White: '#ffffff'
};

// 特殊な非表示色
const INVISIBLE = '_INVISIBLE_';

// 色管理システム
const COLOR_NAMES = Object.keys(COLOR);
const COLOR_CODES = COLOR_NAMES.map(colorName => COLOR[colorName]);
const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];

// RGB値のマップ
const COLOR_TUPLES = {};
COLOR_CODES.forEach(hex => {
    COLOR_TUPLES[hex] = {
        r: parseInt(hex.substr(1, 2), 16),
        g: parseInt(hex.substr(3, 2), 16),
        b: parseInt(hex.substr(5, 2), 16),
    };
});

// ランダム色選択
function randomColorSimple() {
    return COLOR_CODES[Math.random() * COLOR_CODES.length | 0];
}

let lastColor;
function randomColor(options = {}) {
    const notSame = options.notSame;
    const notColor = options.notColor;
    const limitWhite = options.limitWhite;
    let color = randomColorSimple();
    
    // 白の選択頻度を制限
    if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
        color = randomColorSimple();
    }
    
    if (notSame) {
        while (color === lastColor) {
            color = randomColorSimple();
        }
    }
    
    if (notColor) {
        while (color === notColor) {
            color = randomColorSimple();
        }
    }
    
    lastColor = color;
    return color;
}

// パーティクルコレクション作成ヘルパー
function createParticleCollection() {
    const collection = {};
    COLOR_CODES_W_INVIS.forEach(color => {
        collection[color] = [];
    });
    return collection;
}

// Star（メインパーティクル）システム
const Star = {
    // 描画プロパティ
    drawWidth: 3,
    airDrag: 0.98,
    airDragHeavy: 0.992,
    
    // アクティブなパーティクル（色別）
    active: createParticleCollection(),
    _pool: [],
    
    _new() {
        return {};
    },

    add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
        const instance = this._pool.pop() || this._new();
        
        instance.visible = true;
        instance.heavy = false;
        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
        instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
        instance.life = life;
        instance.fullLife = life;
        instance.spinAngle = Math.random() * PI_2;
        instance.spinSpeed = 0.8;
        instance.spinRadius = 0;
        instance.sparkFreq = 0;
        instance.sparkSpeed = 1;
        instance.sparkTimer = 0;
        instance.sparkColor = color;
        instance.sparkLife = 750;
        instance.sparkLifeVariation = 0.25;
        instance.strobe = false;
        
        this.active[color].push(instance);
        return instance;
    },

    returnInstance(instance) {
        // onDeathハンドラーの実行
        instance.onDeath && instance.onDeath(instance);
        
        // クリーンアップ
        instance.onDeath = null;
        instance.secondColor = null;
        instance.transitionTime = 0;
        instance.colorChanged = false;
        
        // プールに戻す
        this._pool.push(instance);
    }
};

// Spark（火花）システム
const Spark = {
    // 描画プロパティ
    drawWidth: 0.75,
    airDrag: 0.9,
    
    // アクティブなパーティクル（色別）
    active: createParticleCollection(),
    _pool: [],
    
    _new() {
        return {};
    },

    add(x, y, color, angle, speed, life) {
        const instance = this._pool.pop() || this._new();
        
        instance.x = x;
        instance.y = y;
        instance.prevX = x;
        instance.prevY = y;
        instance.color = color;
        instance.speedX = Math.sin(angle) * speed;
        instance.speedY = Math.cos(angle) * speed;
        instance.life = life;
        
        this.active[color].push(instance);
        return instance;
    },

    returnInstance(instance) {
        this._pool.push(instance);
    }
};

// BurstFlash（爆発フラッシュ）システム
const BurstFlash = {
    active: [],
    _pool: [],
    
    _new() {
        return {};
    },
    
    add(x, y, radius) {
        const instance = this._pool.pop() || this._new();
        instance.x = x;
        instance.y = y;
        instance.radius = radius;
        this.active.push(instance);
        return instance;
    },
    
    returnInstance(instance) {
        this._pool.push(instance);
    }
};

// 粒子アーク作成ヘルパー
function createParticleArc(start, arcLength, count, randomness, particleFactory) {
    const angleDelta = arcLength / count;
    const end = start + arcLength - (angleDelta * 0.5);
    
    if (end > start) {
        for (let angle = start; angle < end; angle = angle + angleDelta) {
            particleFactory(angle + Math.random() * angleDelta * randomness);
        }
    } else {
        for (let angle = start; angle > end; angle = angle + angleDelta) {
            particleFactory(angle + Math.random() * angleDelta * randomness);
        }
    }
}

// 球状爆発作成ヘルパー
function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
    // 球面の表面積を基準にした計算
    const R = 0.5 * Math.sqrt(count / Math.PI);
    const C = 2 * R * Math.PI;
    const C_HALF = C / 2;
    
    // 球面に沿ってリング状に配置
    for (let i = 0; i <= C_HALF; i++) {
        const ringAngle = i / C_HALF * PI_HALF;
        const ringSize = Math.cos(ringAngle);
        const partsPerFullRing = C * ringSize;
        const partsPerArc = partsPerFullRing * (arcLength / PI_2);
        
        const angleInc = PI_2 / partsPerFullRing;
        const angleOffset = Math.random() * angleInc + startAngle;
        const maxRandomAngleOffset = angleInc * 0.33;
        
        for (let i = 0; i < partsPerArc; i++) {
            const randomAngleOffset = Math.random() * maxRandomAngleOffset;
            let angle = angleInc * i + angleOffset + randomAngleOffset;
            particleFactory(angle, ringSize);
        }
    }
}

// エフェクト関数群
function crossetteEffect(star) {
    const startAngle = Math.random() * PI_HALF;
    createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
        Star.add(
            star.x,
            star.y,
            star.color,
            angle,
            Math.random() * 0.6 + 0.75,
            600
        );
    });
}

function floralEffect(star) {
    const count = 12;
    createBurst(count, (angle, speedMult) => {
        Star.add(
            star.x,
            star.y,
            star.color,
            angle,
            speedMult * 2.4,
            1000 + Math.random() * 300,
            star.speedX,
            star.speedY
        );
    });
    BurstFlash.add(star.x, star.y, 46);
}

function crackleEffect(star) {
    const count = 16;
    createParticleArc(0, PI_2, count, 1.8, (angle) => {
        Spark.add(
            star.x,
            star.y,
            COLOR.Gold,
            angle,
            Math.pow(Math.random(), 0.45) * 2.4,
            300 + Math.random() * 200
        );
    });
}

// Shell（花火本体）クラス
class Shell {
    constructor(options) {
        Object.assign(this, options);
        this.starLifeVariation = options.starLifeVariation || 0.125;
        this.color = options.color || randomColor();
        this.glitterColor = options.glitterColor || this.color;
        
        // デフォルトのstar数設定（1.3倍に増量）
        if (!this.starCount) {
            const density = options.starDensity || 1;
            const scaledSize = this.spreadSize / 54;
            this.starCount = Math.max(7, Math.floor(scaledSize * scaledSize * density * 1.7));
        }
    }
    
    burst(x, y) {
        // スピードとライフのばらつき計算
        const speed = this.spreadSize / 96;
        const starLife = this.starLife || 1500;
        const variation = this.starLifeVariation;
        
        // メイン爆発
        createBurst(this.starCount, (angle, speedMult) => {
            const star = Star.add(
                x,
                y,
                this.color,
                angle,
                speedMult * speed,
                starLife + starLife * (Math.random() - 0.5) * variation
            );
            
            // エフェクト適用（火花量1.3倍に増量）
            if (this.glitter === 'light') {
                star.sparkFreq = 308; // 400 / 1.3 ≈ 308
                star.sparkSpeed = 0.3;
                star.sparkLife = 300;
                star.sparkColor = this.glitterColor;
            } else if (this.glitter === 'medium') {
                star.sparkFreq = 154; // 200 / 1.3 ≈ 154
                star.sparkSpeed = 0.44;
                star.sparkLife = 700;
                star.sparkColor = this.glitterColor;
            } else if (this.glitter === 'heavy') {
                star.sparkFreq = 62; // 80 / 1.3 ≈ 62
                star.sparkSpeed = 0.8;
                star.sparkLife = 1400;
                star.sparkColor = this.glitterColor;
            }
            
            // 特殊エフェクト
            if (this.crossette) {
                star.onDeath = crossetteEffect;
            }
            if (this.floral) {
                star.onDeath = floralEffect;
            }
            if (this.crackle) {
                star.onDeath = crackleEffect;
            }
        });
        
        // バーストフラッシュ
        BurstFlash.add(x, y, this.spreadSize / 4);
        
        return this;
    }
}

// 物理演算更新システム
let currentFrame = 0;
function updateFireworks(frameTime, speed) {
    currentFrame++;
    
    const timeStep = frameTime;
    const starDrag = 1 - (1 - Star.airDrag) * speed;
    const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
    const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
    const gAcc = timeStep / 1000 * GRAVITY;
    
    COLOR_CODES_W_INVIS.forEach(color => {
        // Stars更新
        const stars = Star.active[color];
        for (let i = stars.length - 1; i >= 0; i--) {
            const star = stars[i];
            
            // フレーム重複チェック
            if (star.updateFrame === currentFrame) {
                continue;
            }
            star.updateFrame = currentFrame;
            
            star.life -= timeStep;
            if (star.life <= 0) {
                stars.splice(i, 1);
                Star.returnInstance(star);
            } else {
                const burnRate = Math.pow(star.life / star.fullLife, 0.5);
                const burnRateInverse = 1 - burnRate;

                star.prevX = star.x;
                star.prevY = star.y;
                star.x += star.speedX * speed;
                star.y += star.speedY * speed;
                
                // 空気抵抗適用
                if (!star.heavy) {
                    star.speedX *= starDrag;
                    star.speedY *= starDrag;
                } else {
                    star.speedX *= starDragHeavy;
                    star.speedY *= starDragHeavy;
                }
                star.speedY += gAcc;
                
                // スピン効果
                if (star.spinRadius) {
                    star.spinAngle += star.spinSpeed * speed;
                    star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
                    star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
                }
                
                // 火花生成
                if (star.sparkFreq) {
                    star.sparkTimer -= timeStep;
                    while (star.sparkTimer < 0) {
                        star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
                        Spark.add(
                            star.x,
                            star.y,
                            star.sparkColor,
                            Math.random() * PI_2,
                            Math.random() * star.sparkSpeed * burnRate,
                            star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife
                        );
                    }
                }
                
                // 色変化・ストロボ効果
                if (star.life < star.transitionTime) {
                    if (star.secondColor && !star.colorChanged) {
                        star.colorChanged = true;
                        star.color = star.secondColor;
                        stars.splice(i, 1);
                        Star.active[star.secondColor].push(star);
                        if (star.secondColor === INVISIBLE) {
                            star.sparkFreq = 0;
                        }
                    }
                    
                    if (star.strobe) {
                        star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
                    }
                }
            }
        }
        
        // Sparks更新
        const sparks = Spark.active[color];
        for (let i = sparks.length - 1; i >= 0; i--) {
            const spark = sparks[i];
            spark.life -= timeStep;
            if (spark.life <= 0) {
                sparks.splice(i, 1);
                Spark.returnInstance(spark);
            } else {
                spark.prevX = spark.x;
                spark.prevY = spark.y;
                spark.x += spark.speedX * speed;
                spark.y += spark.speedY * speed;
                spark.speedX *= sparkDrag;
                spark.speedY *= sparkDrag;
                spark.speedY += gAcc;
            }
        }
    });
}

// プリセット花火タイプ
const crysanthemumShell = (size) => ({
    spreadSize: 300 + size * 100,
    starLife: 900 + size * 200,
    starCount: Math.round(75 + size * 25),
    color: randomColor({ limitWhite: true }),
    glitter: 'light',
    glitterColor: COLOR.Gold
});

const ringShell = (size) => ({
    spreadSize: 300 + size * 100,
    starLife: 900 + size * 200,
    starCount: Math.round(75 + size * 25),
    color: randomColor({ limitWhite: true }),
    glitter: 'medium',
    glitterColor: COLOR.White
});

const willowShell = (size) => ({
    spreadSize: 300 + size * 100,
    starLife: 1400 + size * 300,
    starCount: Math.round(100 + size * 50),
    color: randomColor({ limitWhite: true }),
    glitter: 'willow',
    glitterColor: COLOR.Gold
});

const palmShell = (size) => ({
    spreadSize: 250 + size * 75,
    starLife: 1800 + size * 200,
    starCount: Math.round(40 + size * 20),
    color: randomColor({ limitWhite: true }),
    glitter: 'thick',
    glitterColor: randomColor({ notColor: COLOR.White })
});

window.FireworksCore = {
    COLOR,
    COLOR_CODES,
    INVISIBLE,
    Star,
    Spark,
    Shell,
    BurstFlash,
    updateFireworks,
    createBurst,
    createParticleArc,
    randomColor,
    crysanthemumShell,
    ringShell,
    willowShell,
    palmShell
}; 