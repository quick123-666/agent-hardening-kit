# 🛡️ Agent Hardening Kit（日本語）

<div align="center">

[![ライセンス: MIT](https://img.shields.io/badge/ライセンス-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**AIコーディングエージェントをより安全に、より安定して、より信頼性の高いものに。**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

</div>

---

## ✨ なぜ Agent Hardening Kit が必要なのか？

現代のAIコーディングエージェントは強力ですが壊れやすいです。適切なガードレールがなければ：
- ❌ 重要なシステムファイルを削除する可能性がある
- ❌ `rm -rf /` などの危険なコマンドを実行する
- ❌ 長いセッションでコンテキストを失う
- ❌ 元の要件から逸脱する
- ❌ セッション間でユーザーの好みを忘れる

**Agent Hardening Kit** は、AIコーディングエージェントの**ガードレール**として機能する包括的な制約と拡張機能のセットを提供し、安全で安定した予測可能な動作を保証します。

---

## 🎯 コア機能

### 🔒 セキュリティ制約
- **パスのホワイトリスト** — ファイル操作をプロジェクトディレクトリに制限
- **危険なコマンドのインターセプト** — `rm -rf`、`chmod 777`、`curl|bash` などをブロック
- **コードインジェクション防止** — `eval()`、`exec()`、SQLインジェクション、パストラバーサルを検出
- **バイナリファイル作成のブロック** — `.exe`、`.dll`、`.bat`、`.ps1`、`.sh`を防止
- **コマンドホワイトリスト** — デフォルトで拒否、安全なコマンドのみ許可

### ⚡ 安定性制約
- **セッションラウンド制限** — 無限ループを防ぐ（デフォルト15ラウンド）
- **自動スナップショット** — ファイル変更前にスナップショットを作成
- **ノイズフィルタリング** — 重複エラーとデバッグログをフィルタリング
- **推論終了検出** — 無限の自己反省を防ぐ
- **セッション状態追跡** — 操作履歴を記録

### 📦 配信制約
- **変更粒度の制御** — 変更ごとに最大5ファイル
- **強制配信** — 3回以上の研磨ラウンド後に完了を促す
- **配信進捗追跡** — 視覚的なステータス表示
- **要件の固定** — 要件のドリフトを防ぐ

### 🧠 メモリ拡張
- **長期記憶** — セッション間で知識を永続化
- **自動観察** — 重要な操作を静かに記録
- **セッション横断検索** — 履歴セッションを検索
- **リカバリ mechanism** — 削除されたメモリを復元

---

## 🚀 クイックスタート

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# 依存関係をインストール
npm install
```

### 基本的な使用方法

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// セキュリティ制約を作成
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// 安定性制約を作成
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// メモリ拡張を作成
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// 初期化
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### Pi Coding Agent との統合

```bash
# すべての制約を読み込む
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 ドキュメント

- 📖 [はじめに](./docs/getting-started.md) — クイックスタートガイド
- 🔧 [API リファレンス](./docs/api-reference.md) — 詳細なAPIドキュメント
- 💡 [ベストプラクティス](./docs/best-practices.md) — 推奨パターン
- 🎓 [Pi Coding Agent ケーススタディ](./examples/pi/README.md) — 完全な例

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              Agent Hardening Kit                    │
├─────────────────────────────────────────────────────┤
│  🔒 セキュリティ    ⚡ 安定性      📦 配信         │
│     レイヤー          レイヤー        レイヤー        │
│                                                     │
│              ┌──────────────────┐                   │
│              │ ランタイムエンジン│                   │
│              │   （ゼロトラスト）│                   │
│              └──────────────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │   制約チェック    │                   │
│              │    パイプライン    │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐               │
│         │             │             │               │
│    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐            │
│    │コマンド │   │ファイル │   │メモリ  │            │
│    │ 操作   │   │  操作  │   │  操作  │            │
│    └────────┘   └────────┘   └────────┘            │
└─────────────────────────────────────────────────────┘
```

### 設計原則

1. **ゼロトラストセキュリティ** — すべての操作はランタイム検証を通過する必要があります
2. **多層防御** — 複数の制約層が連携して動作
3. **最小権限の原則** — デフォルトで拒否、明示的に許可
4. **フェイルセーフデフォルト** — 不明な場合は操作をブロック
5. **観測可能な動作** — すべての決定はログに記録

---

## 📂 プロジェクト構造

```
agent-hardening-kit/
├── core/                    # コアフレームワーク
│   ├── types.ts             # 型定義
│   ├── base-extension.ts    # 拡張ベースクラス
│   └── index.ts             # エントリーポイント
├── constraints/             # 制約実装
├── extensions/              # 拡張モジュール
├── examples/
│   └── pi/                  # Pi Coding Agent ケーススタディ
├── config/
│   └── default.json         # デフォルト設定
├── docs/                    # ドキュメント
├── README.md                # English
├── README.zh.md             # 简体中文
├── README.ja.md             # 日本語
├── README.es.md             # Español
├── README.fr.md             # Français
├── LICENSE
└── package.json
```

---

## 🤝 貢献

貢献を歓迎します！まず[貢献ガイドライン](./CONTRIBUTING.md)をお読みください。

1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m '素晴らしい機能を追加'`）
4. ブランチにプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを開く

---

## 📊 統計

- **コード行数**: ~3,000+
- **制約モジュール**: 10+
- **サポートされているAIエージェント**: Pi Coding Agent（さらに追加予定）
- **検出されるバグパターン**: 15+
- **言語**: TypeScript

---

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています — 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

---

## 🙏 謝辞

- より安全なAIコーディングツールの必要性にインスパイアされました
- 優れた [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent) の上に構築
- すべての[貢献者](https://github.com/quick123-666/agent-hardening-kit/graphs/contributors)に感謝

---

## 📬 お問い合わせ

- GitHub: [@quick123-666](https://github.com/quick123-666)
- 問題: [GitHub Issues](https://github.com/quick123-666/agent-hardening-kit/issues)

---

<div align="center">

**⭐ 便利だと思ったら、Star をお願いします！**

より安全なAIコーディングのために ❤️ を込めて作成

</div>
