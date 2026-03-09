# ローカルクイズアプリ 技術設計書

**バージョン:** 1.0
**作成日:** 2026-03-10
**ステータス:** 初版

---

## 1. 技術スタック詳細

### 1.1 コアスタック

| レイヤー | 技術 | バージョン | 備考 |
|---|---|---|---|
| デスクトップフレームワーク | Tauri v2 | 2.x | Rust製、軽量バイナリ |
| フロントエンド | React | 19.x | SPA構成 |
| ビルドツール | Vite | 6.x | HMR対応 |
| 言語（フロント） | TypeScript | 5.x | strict mode有効 |
| 言語（バック） | Rust | stable | Tauri側 |
| DB | SQLite | - | rusqlite |

### 1.2 フロントエンドライブラリ

| 用途 | ライブラリ | 理由 |
|---|---|---|
| 状態管理 | Zustand | ボイラープレートが少なく、本アプリのシンプルな状態に適合 |
| スタイリング | Tailwind CSS v4 | ユーティリティファーストで一貫したUIを維持しやすい |
| ルーティング | React Router v7 | ページ遷移制御 |

### 1.3 テスト

| 種別 | ツール | 対象 |
|---|---|---|
| ユニットテスト | Vitest | ユーティリティ関数、判定ロジック |
| コンポーネントテスト | Vitest + React Testing Library | UIコンポーネント |
| Rustテスト | cargo test | Tauriコマンド、DB操作 |

---

## 2. アーキテクチャ概要

### 2.1 責務分離

```
┌─────────────────────────────────────────────┐
│              Tauri WebView                  │
│  ┌───────────────────────────────────────┐  │
│  │     React SPA (TypeScript)            │  │
│  │                                       │  │
│  │  - UI描画・ユーザー操作               │  │
│  │  - クイズセッション状態管理            │  │
│  │  - 回答の正誤判定                     │  │
│  └──────────────┬────────────────────────┘  │
│                 │ invoke API                 │
│  ┌──────────────▼────────────────────────┐  │
│  │     Tauri Backend (Rust)              │  │
│  │                                       │  │
│  │  - SQLite CRUD操作                    │  │
│  │  - クイズパックインポート・バリデーション │  │
│  │  - ファイルダイアログ(OS連携)          │  │
│  │  - 学習履歴の集計処理                  │  │
│  │  - アプリ設定の永続化                  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**設計判断:**

- **正誤判定はフロントエンド側**で実行する。UIレスポンスの即時性を優先し、判定結果をRust側に送信して履歴保存する。判定ロジックは純粋関数に集約し、コンポーネントから分離する。
- **データ永続化は全てRust側**に閉じる。フロントエンドからSQLiteを直接操作しない。
- **学習履歴は1問ごとに即時保存**する。異常終了時のデータロストを防ぐ。

### 2.2 レイヤー構成

**フロントエンド:**

```
Pages（ルーティング単位）
  └─ Components（UIパーツ）
       └─ Hooks（ロジック抽出）
            └─ Commands（Tauri invokeラッパー）
                 └─ Types（共通型定義）
```

**バックエンド:**

```
main.rs（Tauriアプリ初期化）
  └─ commands/（Tauriコマンド定義 — 薄いレイヤー）
       └─ services/（ビジネスロジック）
            └─ repositories/（DB操作）
                 └─ models/（構造体定義）
```

commands層はリクエスト/レスポンスの変換のみ。ロジックはservices層に委譲する。

### 2.3 Tauriコマンド設計

```
コマンド名                        引数                           戻り値
──────────────────────────────────────────────────────────────────────
// クイズパック管理
import_quiz_pack              file_path: String              Result<QuizPack>
list_quiz_packs               (なし)                         Vec<QuizPackSummary>
get_quiz_pack                 pack_id: String                Result<QuizPack>
delete_quiz_pack              pack_id: String                Result<()>

// クイズ問題取得
get_questions_by_pack         pack_id: String                Vec<Question>

// 学習履歴
save_answer_record            record: AnswerRecord           Result<()>
get_learning_history          pack_id: String                Vec<AnswerRecord>
get_pack_statistics           pack_id: String                PackStatistics
get_weak_questions            pack_id: String                Vec<WeakQuestion>

// アプリ設定
get_settings                  (なし)                         AppSettings
update_setting                key: String, value: String     Result<()>

// ファイルダイアログ
open_file_dialog              (なし)                         Option<String>
```

TypeScript側の型安全ラッパー:

```typescript
// src/lib/commands.ts
import { invoke } from '@tauri-apps/api/core';
import type { QuizPack, Question, AnswerRecord } from './types';

export const importQuizPack = (filePath: string) =>
  invoke<QuizPack>('import_quiz_pack', { filePath });

export const listQuizPacks = () =>
  invoke<QuizPackSummary[]>('list_quiz_packs');

export const saveAnswerRecord = (record: AnswerRecord) =>
  invoke<void>('save_answer_record', { record });
// ...
```

---

## 3. データ設計

### 3.1 設計方針

正規化してDBに保存する。理由:
- 問題単位での学習履歴との結合が必要（弱点分析の集計クエリ）
- 問題タイプ別の絞り込みが発生する

### 3.2 SQLiteスキーマ

```sql
-- クイズパック
CREATE TABLE quiz_packs (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    question_count  INTEGER NOT NULL DEFAULT 0,
    imported_at     TEXT NOT NULL
);

-- 問題
CREATE TABLE questions (
    id              TEXT PRIMARY KEY,       -- "{pack_id}_{question_id}"
    pack_id         TEXT NOT NULL,
    question_id     TEXT NOT NULL,           -- パック内のオリジナルID
    question_type   TEXT NOT NULL,           -- 'multiple_choice' | 'true_false' | 'text_input'
    question_text   TEXT NOT NULL,
    choices_json    TEXT,                    -- JSON配列 (multiple_choiceの場合)
    correct_answer  TEXT NOT NULL,           -- 文字列に正規化して保存
    explanation     TEXT DEFAULT '',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE
);

CREATE INDEX idx_questions_pack_id ON questions(pack_id);

-- 学習履歴
CREATE TABLE learning_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pack_id         TEXT NOT NULL,
    question_id     TEXT NOT NULL,           -- パック内のオリジナルID
    is_correct      INTEGER NOT NULL,        -- 0 or 1
    user_answer     TEXT DEFAULT '',
    answered_at     TEXT NOT NULL,
    FOREIGN KEY (pack_id) REFERENCES quiz_packs(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_pack_question ON learning_history(pack_id, question_id);
CREATE INDEX idx_history_answered_at ON learning_history(answered_at);

-- アプリ設定
CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 初期データ
INSERT INTO app_settings (key, value) VALUES ('question_order', 'sequential');
INSERT INTO app_settings (key, value) VALUES ('theme', 'light');
```

### 3.3 `correct_answer` の保存ルール

JSONの `answer` フィールドは型が異なるため、DB保存時に文字列に統一する:

| 問題タイプ | JSON上の型 | DB保存値の例 |
|---|---|---|
| `multiple_choice` | string (選択肢ID) | `"d"` |
| `true_false` | boolean | `"true"` / `"false"` |
| `text_input` | string | `"RSA"` |

### 3.4 `choices_json` の保存形式

```json
[
  { "id": "a", "text": "128ビット" },
  { "id": "b", "text": "192ビット" },
  { "id": "c", "text": "256ビット" },
  { "id": "d", "text": "512ビット" }
]
```

---

## 4. ディレクトリ構成

```
local-quiz-app/
├── src/                              # React フロントエンド
│   ├── assets/                       # 静的アセット
│   ├── components/                   # UIコンポーネント
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── quiz/
│   │   │   ├── MultipleChoiceQuestion.tsx
│   │   │   ├── TrueFalseQuestion.tsx
│   │   │   ├── TextInputQuestion.tsx
│   │   │   ├── QuestionRenderer.tsx  # 問題タイプで子コンポーネント振り分け
│   │   │   ├── QuizProgress.tsx
│   │   │   └── QuizResult.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Modal.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── QuizPage.tsx
│   │   ├── HistoryPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   │   ├── useQuizSession.ts
│   │   └── useQuizPacks.ts
│   ├── stores/
│   │   ├── quizSessionStore.ts
│   │   └── appSettingsStore.ts
│   ├── lib/
│   │   ├── commands.ts               # Tauri invokeラッパー
│   │   ├── types.ts                  # 共通型定義
│   │   └── judge.ts                  # 正誤判定ロジック（純粋関数）
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                        # Rust バックエンド
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── quiz_pack.rs
│   │   │   ├── history.rs
│   │   │   └── settings.rs
│   │   ├── services/
│   │   │   ├── mod.rs
│   │   │   ├── import_service.rs
│   │   │   └── history_service.rs
│   │   ├── repositories/
│   │   │   ├── mod.rs
│   │   │   ├── quiz_pack_repo.rs
│   │   │   ├── question_repo.rs
│   │   │   ├── history_repo.rs
│   │   │   └── settings_repo.rs
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── quiz_pack.rs
│   │   │   ├── question.rs
│   │   │   └── history.rs
│   │   └── db/
│   │       ├── mod.rs
│   │       └── migrations.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 5. 主要処理フロー

### 5.1 クイズパックインポート

```
User          Frontend(React)              Backend(Rust)            SQLite
 │                 │                            │                     │
 │ インポート押下   │                            │                     │
 │────────────────>│                            │                     │
 │                 │ open_file_dialog            │                     │
 │                 │───────────────────────────>│                     │
 │                 │         file_path           │                     │
 │                 │<───────────────────────────│                     │
 │                 │ import_quiz_pack(path)      │                     │
 │                 │───────────────────────────>│                     │
 │                 │                            │ ファイル読み込み      │
 │                 │                            │ JSONパース           │
 │                 │                            │ バリデーション        │
 │                 │                            │ BEGIN TX             │
 │                 │                            │───────────────────>│
 │                 │                            │ INSERT quiz_packs   │
 │                 │                            │───────────────────>│
 │                 │                            │ INSERT questions ×N │
 │                 │                            │───────────────────>│
 │                 │                            │ COMMIT              │
 │                 │                            │───────────────────>│
 │                 │       Result<QuizPack>      │                     │
 │                 │<───────────────────────────│                     │
 │  成功/失敗通知   │                            │                     │
 │<────────────────│                            │                     │
```

バリデーション内容:
1. JSON構文チェック
2. `pack.id`, `pack.name`, `questions` の存在確認
3. 既存パックIDとの重複チェック
4. 各問題: `id`, `type`, `question`, `answer` の存在・妥当性チェック
5. `multiple_choice` の場合: `choices` が2〜4個、`answer` が `choices` のいずれかの `id`
6. パック内の問題ID重複チェック

### 5.2 クイズ実行

```
1. ユーザーがパックを選択し「開始」
2. get_questions_by_pack で問題一覧を取得
3. quizSessionStore を初期化
   - questions: 取得した問題配列（設定に応じてシャッフル）
   - currentIndex: 0
   - answers: []
4. QuestionRenderer が currentIndex の問題を描画
   - question_type に応じて子コンポーネントを切り替え
5. ユーザーが回答 → judge.ts の判定関数で正誤判定
6. SCR-RESULT に遷移し結果・解説を表示
7. save_answer_record で即座にDBに保存
8. 「次へ」で currentIndex++ → 4に戻る
9. 全問終了 → SCR-SUMMARY でスコア表示
```

### 5.3 正誤判定ロジック

```typescript
// src/lib/judge.ts

type JudgeFunction = (userAnswer: string, correctAnswer: string) => boolean;

const judgeStrategies: Record<string, JudgeFunction> = {
  multiple_choice: (userAnswer, correctAnswer) =>
    userAnswer === correctAnswer,

  true_false: (userAnswer, correctAnswer) =>
    userAnswer === correctAnswer,

  text_input: (userAnswer, correctAnswer) =>
    userAnswer.trim() === correctAnswer.trim(),
};

export function judgeAnswer(
  questionType: string,
  userAnswer: string,
  correctAnswer: string
): boolean {
  const strategy = judgeStrategies[questionType];
  if (!strategy) throw new Error(`Unknown question type: ${questionType}`);
  return strategy(userAnswer, correctAnswer);
}
```

### 5.4 学習履歴の集計

弱点分析クエリ例:

```sql
SELECT
  lh.question_id,
  q.question_text,
  COUNT(*) AS answer_count,
  SUM(lh.is_correct) AS correct_count,
  CAST(SUM(lh.is_correct) AS REAL) / COUNT(*) AS accuracy_rate
FROM learning_history lh
JOIN questions q ON q.pack_id = lh.pack_id
  AND q.question_id = lh.question_id
WHERE lh.pack_id = ?
GROUP BY lh.question_id
HAVING COUNT(*) >= 2
ORDER BY accuracy_rate ASC;
```

---

## 6. 拡張性の考慮

### 6.1 新しい問題タイプの追加手順

1. **型定義**: `types.ts` に新タイプを追加
2. **UIコンポーネント**: `components/quiz/` に新コンポーネント作成
3. **QuestionRenderer**: switch文に分岐追加
4. **判定ロジック**: `judge.ts` の `judgeStrategies` に追加
5. **バリデーション**: Rust側 `import_service.rs` に新タイプのルール追加

DBスキーマの変更は不要（`question_type` はTEXT型、`choices_json` / `correct_answer` はTEXT型のため）。

### 6.2 カスタマイズポイント一覧

| 拡張ポイント | 変更箇所 | 影響範囲 |
|---|---|---|
| 問題タイプ追加 | 型定義 + UIコンポーネント + judge.ts + バリデーション | 両方 |
| 判定ロジック変更（部分一致等） | judge.ts | フロントのみ |
| テーマ・外観 | Tailwind設定 + app_settings | フロントのみ |
| 統計項目追加 | Rust集計クエリ + Frontend表示 | 両方 |
| エクスポート機能 | 新規Tauriコマンド + UIボタン | 両方 |

---

## 付録: 技術的な注意事項

1. **SQLite WALモード**: パフォーマンスのため `PRAGMA journal_mode=WAL` を有効にする
2. **マイグレーション**: アプリ起動時にスキーマバージョンを確認し、必要に応じてマイグレーションを実行する
3. **ファイルパス**: Windows環境のためRustの `std::path::PathBuf` を使用し、文字列結合でパスを組み立てない
4. **文字コード**: UTF-8前提。BOM付きUTF-8も許容するようパース前にBOM除去処理を入れる
5. **バイナリサイズ**: リリースビルドでは `strip` と `opt-level = "s"` を設定する
6. **外部通信無効化**: `tauri.conf.json` で外部ドメインへの通信を全てブロックする
