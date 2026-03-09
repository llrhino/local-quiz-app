# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

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
