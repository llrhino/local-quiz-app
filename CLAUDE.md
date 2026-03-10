# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run dev              # Start Vite dev server (Tauri WebView connects to this)
npm run build            # Production build
npx vitest run           # Run all frontend tests
npx vitest run path/to/test.ts  # Run a single test file

# Tauri / Rust
cd src-tauri && cargo build      # Build Rust backend
cd src-tauri && cargo test       # Run Rust tests
npm run tauri dev                # Run full app in dev mode (frontend + backend)
npm run tauri build              # Production build (creates installer)
```

## Architecture

### Responsibility Split

- **Frontend (React):** UI rendering, quiz session state (Zustand), answer judging (pure functions in `src/lib/judge.ts`)
- **Backend (Rust):** All data persistence via SQLite, quiz pack import/validation, file dialogs, history aggregation, app settings

Communication is via Tauri's `invoke` API. Frontend never touches SQLite directly.

### Frontend Layers

```
Pages → Components → Hooks → Commands (src/lib/commands.ts) → Types (src/lib/types.ts)
```

### Backend Layers

```
commands/ (thin request/response layer) → services/ (business logic) → repositories/ (DB ops) → models/ (structs)
```

Commands layer only does request/response conversion; all logic goes in services.

### Key Design Decisions

- Answer judging runs in frontend for UI responsiveness; results are sent to Rust for persistence
- Learning history is saved per-question immediately (not at session end) to prevent data loss on crash
- `correct_answer` is stored as TEXT in SQLite regardless of question type (boolean→"true"/"false", string→as-is)
- Quiz pack questions table uses composite PK: `{pack_id}_{question_id}`

## Quiz Pack JSON Format

Quiz packs are single JSON files with `pack` (id, name, description) and `questions` array. Three question types: `multiple_choice`, `true_false`, `text_input`. See `docs/requirements.md` §7 for full schema.

## Adding a New Question Type

1. Add type to `src/lib/types.ts`
2. Create UI component in `src/components/quiz/`
3. Add branch in `QuestionRenderer.tsx`
4. Add judge strategy in `src/lib/judge.ts`
5. Add validation in Rust `import_service.rs`

No DB schema changes needed (question_type and choices_json are TEXT).

## Important Constraints

- All external network communication must be blocked in `tauri.conf.json`
- Text input judging uses `trim()` exact match only (case-sensitive, no normalization)
- SQLite uses WAL mode (`PRAGMA journal_mode=WAL`)
- Use `std::path::PathBuf` in Rust (never string concatenation for paths)
- Handle BOM-prefixed UTF-8 when parsing imported JSON files
- Release builds: `strip` + `opt-level = "s"` for binary size

## Development Process

- **常にTDD（テスト駆動開発）で実装すること。** 以下の手順を守る:
  1. **Red:** まず失敗するテストを書く
  2. **Green:** テストを通す最小限の実装を書く
  3. **Refactor:** テストが通る状態を維持しつつコードを整理する
- テストを書く前にプロダクションコードを書いてはならない
- フロントエンドは Vitest + React Testing Library、Rust は cargo test を使用する

## Design Documents

- `docs/requirements.md` — Full functional/non-functional requirements
- `docs/technical-design.md` — Architecture, data model, API design, processing flows
