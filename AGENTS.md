# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## 言語設定

- **すべての応答・コメント・コミットメッセージ・ドキュメントは日本語で記述すること。**
- **アプリのUI表示（ボタンラベル、見出し、メッセージ、プレースホルダー等）も日本語で実装すること。**
- コード中の識別子（変数名・関数名・型名など）は英語のままでよいが、コメントやdocstring、エラーメッセージの説明は日本語を使用する。
- Git コミットメッセージも日本語で書くこと。

## Project Overview

Local Quiz App — a Windows desktop quiz application for offline knowledge training. Built with Tauri v2 (Rust backend + React frontend), fully offline with no network communication.

## Tech Stack

- **Desktop framework:** Tauri v2
- **Frontend:** React 19 + TypeScript (strict mode) + Vite 6
- **State management:** Zustand
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **Backend:** Rust (stable) with SQLite (rusqlite)
- **Testing:** Vitest + React Testing Library (frontend), cargo test (Rust)

## Common Commands

```bash
# Frontend
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Production build
npx vitest run           # Run all frontend tests
npx vitest run path/to/test.ts  # Run a single test file

# Tauri / Rust
cd src-tauri && cargo build      # Build Rust backend
cd src-tauri && cargo test       # Run Rust tests
npm run tauri dev                # Run full app in dev mode
npm run tauri build              # Production build
```

## Development Process

- **常にTDD（テスト駆動開発）で実装すること。** 以下の手順を守る:
  1. **Red:** まず失敗するテストを書く
  2. **Green:** テストを通す最小限の実装を書く
  3. **Refactor:** テストが通る状態を維持しつつコードを整理する
- テストを書く前にプロダクションコードを書いてはならない
- フロントエンドは Vitest + React Testing Library、Rust は cargo test を使用する

## issue対応の手順

GitHub issue番号が指定された場合、以下の手順を順番に実行すること。

### 1. issueの内容を取得
```bash
gh issue view <issue番号>
```
issueのタイトル・本文・関連設計書を読み取り、対応内容を把握する。

### 2. 関連する設計書・既存コードを調査
issueに記載された関連設計書や既存コードを読み、実装方針を理解する。

### 3. TDDで実装
上記の開発プロセスに従い、TDD（Red → Green → Refactor）で実装する。
- まず失敗するテストを書く
- テストを通す最小限の実装を書く
- テストが通る状態を維持しつつコードを整理する

### 4. 全テストの通過を確認
```bash
cd src-tauri && cargo test   # Rustテスト
npx vitest run               # フロントエンドテスト（変更がある場合）
```
変更した領域に応じて適切なテストコマンドを実行する。

### 5. コミット・プッシュ
- 変更をコミットする（コミットメッセージは日本語、本文に `Closes #<issue番号>` を含める）
- `origin` にプッシュする

### 6. issueのクローズを確認
`Closes #番号` によりissueが自動クローズされることを確認する。自動クローズされない場合は手動でクローズする:
```bash
gh issue close <issue番号>
```

### 7. 完了報告
実装内容のサマリを報告する。
