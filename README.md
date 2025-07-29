# Interactive Pupil Fireworks ✨

瞳の中に美しい花火を表示するインタラクティブWebアプリケーション

![Pupil Fireworks Demo](assets/demo.png)

## 概要

このプロジェクトは、イラストの瞳の領域内にリアルタイムで花火パーティクルを表示するWebベースのインタラクティブシステムです。高度な物理演算と美しいブレンドモードを使用して、まるで瞳の中で本物の花火が咲いているような幻想的な視覚体験を提供します。

## 主な機能

### 🎆 リアルタイム花火システム
- **高度な物理演算**: 重力、空気抵抗、スピン効果を含むリアルな物理シミュレーション
- **多様な花火タイプ**: Chrysanthemum、Ring、Willow、Palm など複数の花火パターン
- **パーティクル効果**: メインスター、スパーク、バーストフラッシュによる豊かな視覚効果

### 🎭 インタラクティブ体験
- **クリック/タッチ対応**: 画面上の任意の場所をクリック・タップして花火発射
- **キーボードショートカット**: 
  - `Space`: 花火発射
  - `B`: ブレンドモード切り替え
  - `P`: 一時停止/再生
  - `D`: デバッグ情報表示切り替え

### 🎨 高品質レンダリング
- **マスキングシステム**: Photoshopで作成したマスクによる正確な瞳領域制限
- **ブレンドモード**: Screen、Lighter、Multiply、Overlay、Difference
- **60FPS対応**: 滑らかなアニメーション（デバイス性能に応じて最適化）

### 📱 レスポンシブ対応
- **アスペクト比維持**: 様々な画面サイズで背景画像の縦横比を保持
- **デバイス最適化**: デスクトップ・タブレット・モバイル対応
- **HiDPI対応**: 高解像度ディスプレイでの鮮明な表示

## 技術仕様

### アーキテクチャ
- **HTML5 Canvas**: デュアルキャンバス構成（trails + main）
- **オブジェクトプール**: メモリ効率的なパーティクル管理
- **色別バッチ描画**: パフォーマンス最適化レンダリング

### パフォーマンス最適化
- **フレームレート制御**: 30FPS目標で安定動作
- **背景キャッシュ**: 一度描画した背景の再利用
- **メモリ管理**: オブジェクトプールによるガベージコレクション削減

## ファイル構成

```
250729_瞳の花火/
├── index.html                 # メインHTMLファイル
├── assets/
│   ├── bg.png                 # 背景画像（目のイラスト）
│   └── mask.png               # 瞳マスク画像
├── js/
│   ├── stage.js               # Canvas管理・イベント処理
│   ├── fireworks-core.js      # 花火物理演算システム
│   ├── pupil-fireworks.js     # メインアプリケーション
│   └── app.js                 # エントリーポイント
└── README.md                  # このファイル
```

## インストール・実行方法

### 必要環境
- モダンブラウザ（Chrome、Firefox、Safari）
- ローカルHTTPサーバー（開発時）

### 実行手順

1. **リポジトリクローン**
   ```bash
   git clone [repository-url]
   cd 250729_瞳の花火
   ```

2. **HTTPサーバー起動**
   ```bash
   # Python 3の場合
   python3 -m http.server 8000
   
   # Node.jsの場合
   npx serve .
   ```

3. **ブラウザでアクセス**
   ```
   http://localhost:8000
   ```

## 使用方法

### 基本操作
- **花火発射**: 画面をクリック・タップ、またはSpaceキー
- **一時停止**: Pキー
- **ブレンドモード変更**: Bキー
- **デバッグ情報**: Dキー

### カスタマイズ

設定は `js/app.js` の `APP_CONFIG` で変更可能：

```javascript
const APP_CONFIG = {
    fireworkSize: 2,        // 花火サイズ (0-4)
    quality: 'normal',      // 品質 ('low', 'normal', 'high')
    blendMode: 'screen',    // ブレンドモード
    debug: false            // デバッグモード
};
```

## 開発・カスタマイズ

### 新しい花火タイプの追加

```javascript
const customShell = (size) => ({
    spreadSize: 200 + size * 50,
    starLife: 1000 + size * 200,
    starCount: Math.round(30 + size * 10),
    color: '#ff6b6b',
    glitter: 'heavy'
});
```

### ブレンドモードの追加

```javascript
// js/app.js の blendModes 配列に追加
const blendModes = ['screen', 'lighter', 'multiply', 'overlay', 'difference', 'color-dodge'];
```

## トラブルシューティング

### よくある問題

1. **花火が表示されない**
   - ブラウザのコンソールでエラーを確認
   - アセット（bg.png、mask.png）の存在確認

2. **パフォーマンスが低い**
   - デバッグモードでFPSを確認
   - 品質設定を 'low' に変更

3. **マスクが正しく適用されない**
   - mask.png が白い領域で瞳を表現しているか確認
   - 背景画像とマスクのサイズ比率確認

## ライセンス

このプロジェクトは複数のソースからのコードを含んでいます：

### パーティクルシステム
[firework-simulator-v2](https://codepen.io/MillerTime/pen/XgpNwb) をベースとしています  
Original work: Copyright (c) 2025 Caleb Miller  
Licensed under MIT License

### その他のコンポーネント
顔全体グローエフェクト、瞳マスキングシステム、統合コード: オリジナル実装  
Created by: 優花 (AI Assistant) & すえまるさん  
Date: 2025年7月29日

## クレジット

- **パーティクル物理演算**: [Caleb Miller's firework-simulator-v2](https://codepen.io/MillerTime/pen/XgpNwb) (MIT License)
- **顔グローエフェクト**: オリジナル実装
- **瞳マスキングシステム**: オリジナル実装  
- **UI・UX設計**: オリジナル実装
- **アセット**: ユーザー提供

---

⭐ このプロジェクトが気に入ったら、スターをお願いします！ 