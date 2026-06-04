# QuizForge Frontend

證券營業員刷題網站的前端：React 18 + Vite + TypeScript 單頁應用（深色主題，未引 UI / 狀態管理庫）。

> 這份是**前端的** quick start。要把整個系統（含後端 API + PostgreSQL）一起跑起來，見 [QuizForge_Backend/README.md](../QuizForge_Backend/README.md) 的〈跑起整個系統〉。

## 技術棧

- React 18 + Vite 5 + TypeScript（strict）
- `react-router-dom` v6
- 原生 `fetch`（自寫 api client，統一解 `{data,error}` envelope、throw `ApiError`）
- 狀態：React state / context + localStorage（**無** Redux / zustand 等狀態庫）
- 深色主題：CSS variables，**無** UI kit

## 前置需求

- Node.js **20+** 與 npm
- 一個可連線的後端 API（預設 `http://localhost:8080/api/v1`）。如何啟動後端見上方連結。

## 快速開始

```bash
npm install
npm run dev        # → http://localhost:5173
```

後端不在預設位址時，建立 `.env` 覆寫：

```bash
cp .env.example .env   # 內含 VITE_API_BASE=http://localhost:8080/api/v1
```

## 指令

| 指令 | 作用 |
|------|------|
| `npm run dev` | 開發伺服器（HMR）→ :5173 |
| `npm run build` | type-check（`tsc -b`）+ production build → `dist/` |
| `npm run preview` | 預覽 production build |
| `npm run typecheck` | 只跑 `tsc --noEmit` |

## 環境變數

| 變數 | 預設 | 說明 |
|------|------|------|
| `VITE_API_BASE` | `http://localhost:8080/api/v1` | 後端 API base URL |

## 專案結構

```
src/
  api/         client.ts（fetch wrapper + ApiError）、types.ts（對齊後端契約）
  store/       local.ts（localStorage：作答紀錄 / 設定 / 匯出入）
  theme/       tokens.css、global.css（深色 CSS variables）
  components/  Nav、QuestionCard、OptionList、AnswerExplain、ProgressRing、
               QuestionGrid、FilterPanel、BackupPanel、Scorecard
  hooks/       useExamTimer、useQuestionSet
  pages/       Home、Practice、PracticeView、Exam、WrongBook、Favorites、
               Uncertain、Custom（placeholder）
```

## 功能與模式

- **練習**：三欄式（左篩選 / 中題目卡 / 右進度 + 題號盤），作答即時回饋、收藏、標記不確定。
- **模擬考**：倒數計時、考試中不顯示答案；交卷後成績單（總分 / 各科 / 逐題檢視）。
- **錯題本 / 收藏 / 不確定**：復用練習版型，由 localStorage 篩出對應題目。
- **本機模式**：未登入，紀錄全存瀏覽器 localStorage；練習頁右欄可匯出 / 匯入 JSON 備份。`/custom` 自創題與登入同步為後續選配。

## 文件

- 系統規格：[docs/SPEC.md](docs/SPEC.md)
- 前端技術決策：[docs/BUILD_NOTES.md](docs/BUILD_NOTES.md)
- 後端 API 契約：[../QuizForge_Backend/docs/API_REFERENCE.md](../QuizForge_Backend/docs/API_REFERENCE.md)
