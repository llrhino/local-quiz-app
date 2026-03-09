# Local Quiz App — Requirements & Concept

## 指示

- 下記の要求・コンセプトをもとに、要件定義をはじめとした開発に必要十分な設計書類を作成してください
- 作成に当たっては、devils advocateを含めた適切なエージェントチームを結成してください
- チーム間でインタラクティブに検討してください。必要に応じて検討用のファイルを作成してもかまいません
- 設計書類はdocs配下に日本語のmdファイルとして出力してください

## 1. Overview

This project is a **local desktop quiz application** designed to support **continuous learning of domain or business knowledge**.

The application is intended primarily for **individual learning on a local machine**, especially in environments where the learning materials may contain **confidential information**.

The repository will be **public**, allowing users to customize, fork, or extend the application if necessary.

---

# 2. Core Concept

## Knowledge Training Ground

The core concept of this application is:

> **A quiet, local knowledge training ground.**

The application should feel like a **place to practice and strengthen knowledge**, rather than a traditional quiz game or enterprise learning management system.

Users should be able to repeatedly engage in a simple cycle:

**Question → Answer → Result → Explanation**

The goal is not entertainment alone, but **steady accumulation of practical knowledge**.

---

## Desired Experience

The application should provide an experience that is:

- **Fast** — users can start answering questions immediately
- **Focused** — minimal distractions or unnecessary UI complexity
- **Private** — works fully offline with local data
- **Constructive** — mistakes should help users learn rather than discourage them
- **Accumulating** — users should feel their knowledge gradually improving

The tone should be:

- Calm
- Practical
- Slightly gamified but not playful or exaggerated

---

## What This App Is Not

The application intentionally avoids becoming:

- A social quiz game
- A corporate LMS platform
- A heavily gamified app
- A cloud-based system with accounts and synchronization

These may be implemented by users in custom versions if desired.

---

# 3. Goals

The system should allow users to:

- Learn domain knowledge through quizzes
- Quickly repeat learning cycles
- Accumulate learning history locally
- Identify weak areas
- Import quiz packs created by others

---

# 4. Scope

## Target Platform

Initial target:

- **Windows desktop**

Future platforms may be possible but are not part of the initial scope.

---

## Execution Model

- Runs locally on the user's machine
- Works **fully offline**
- No mandatory network access

---

## Data Storage

All application data should remain on the local machine.

Examples:

- Quiz packs
- Learning history
- Application settings

---

# 5. Content Import

## Quiz Pack Format

Quiz content is imported as a **single JSON file**.

Requirements:

- One file per quiz pack
- Human-editable
- Easy to copy and share
- No external dependencies

Typical usage:

1. A quiz pack is created by someone
2. The file is shared
3. Another user imports it locally

---

## Sample Quiz Pack

The application should include a **comprehensive sample quiz pack**.

Purpose:

- Demonstrate supported quiz types
- Serve as a starting point for creating new quiz packs

Users should be able to:

- Download the sample pack
- Copy and edit it
- Use it as a template for their own quiz packs

---

# 6. Supported Question Types

A quiz pack may contain multiple question types.

The following types must be supported at minimum.

---

## Multiple Choice (MCQ)

- Up to **4 choices**
- **Single correct answer**

---

## True / False

- Two choices
- Example: ○ / ×

---

## Text Input (Exact Match)

Users enter a text answer.

Answer validation rule:

```
trim()
```

Only leading and trailing whitespace should be removed.

No additional normalization is required.

This ensures question creation remains simple and predictable.

---

# 7. Quiz Pack Structure

Each quiz pack JSON should contain:

- Pack metadata
- Optional master definitions
- Question list

Example structure:

```json
{
  "pack": {},
  "master": {},
  "questions": []
}
```

The schema should remain **simple and human-editable**.

---

# 8. Import Validation

When a quiz pack is imported, the application should validate:

- Required fields
- Valid question type
- Valid answer format
- Duplicate question IDs

Errors should be shown in a **clear, human-readable format** so authors can easily fix the file.

Example:

```
Question ID: net-002
Field: answer
Error: invalid value
```

---

# 9. Learning Experience (MVP)

The basic learning loop should be:

1. Select quiz pack
2. Start quiz
3. Show question
4. Submit answer
5. Show result and explanation

The experience should emphasize **speed and clarity**.

---

# 10. Learning History

The application should record:

- Question ID
- Correct / incorrect result
- Timestamp

Purpose:

- Identify weak areas
- Enable future review mechanisms

All history is stored **locally only**.

---

# 11. Usage Model

The application is designed primarily for **individual learning**.

Out of scope for MVP:

- User accounts
- Online multiplayer
- Leaderboards
- Cloud synchronization

However:

- Quiz packs should be easily shareable
- The architecture should remain extensible

---

# 12. Technical Requirements (Minimum)

### Language

- TypeScript

### UI Framework

- React

### Desktop Runtime

- Tauri

### Build Tool

- Vite

### Data Storage

Local storage mechanism such as:

- SQLite
  or
- Local file storage

Implementation details may vary.

---

### Networking

No external network communication is required.

The application must function fully offline.

---

# 13. Non-Goals

The following are intentionally excluded from the initial scope:

- Authentication systems
- Cloud sync
- Enterprise LMS features
- Complex grading systems
- Social features

These may be implemented by users in custom versions if desired.

---

# 14. Design Philosophy

This project follows several guiding principles.

### Local-First

Learning should work completely offline and preserve confidentiality.

---

### Simplicity

The core system should remain lightweight and easy to understand.

---

### Extensibility

The repository is public.

Users may extend the system by:

- Adding question types
- Modifying quiz formats
- Implementing team features
- Adding integrations

---

### Training Ground Mentality

This application should feel like a **knowledge practice space**.

Users return repeatedly, gradually strengthening their understanding through practice.
