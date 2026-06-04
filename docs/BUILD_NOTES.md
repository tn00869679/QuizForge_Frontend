# QuizForge Frontend — Build Notes（技術決策，by Tech Lead）

> 權威來源 = 本檔 + `docs/SPEC.md`（§7 頁面、§8 互動）。**所有 sub-agent 動手前必讀本檔**。

## Stack（已定，勿換）
- React 18 + Vite + TypeScript · `react-router-dom` v6 · 原生 `fetch`（自寫 api client）
- **不引 UI kit**，自己寫 CSS（深色主題，CSS variables tokens）。
- **不引狀態管理庫**（Rule 2 簡單優先）：用 React state/context + localStorage。
- 不引 axios / tailwind / mui。保持依賴最小。

## 專案 layout
```
index.html · vite.config.ts · tsconfig.json · .env（VITE_API_BASE）
src/main.tsx · src/App.tsx · src/routes.tsx
src/api/client.ts        # fetch wrapper，解 {data,error} envelope，throw ApiError
src/api/types.ts         # 與後端對齊的型別（Category/Subject/Session/Question/...）
src/store/local.ts       # localStorage：作答紀錄 + 設定 + 匯出/匯入
src/theme/tokens.css     # CSS variables
src/theme/global.css     # reset + base
src/components/           # Nav, QuestionCard, OptionList, QuestionGrid, ProgressRing, FilterPanel, AnswerExplain, Pagination ...
src/pages/                # Home, Practice, Exam, WrongBook, Favorites, Uncertain, Custom
src/hooks/                # useExamTimer, useQuestionSet ...
```

## API base
`import.meta.env.VITE_API_BASE`，預設 `http://localhost:8080/api/v1`。client 統一解 envelope：`error!=null` → throw `ApiError{code,message}`；否則回 `data`。

## 路由（react-router）
`/` Home · `/practice` 練習 · `/exam` 模擬考 · `/wrong` 錯題本 · `/favorites` 收藏 · `/uncertain` 不確定 · `/custom` 自創題（**本輪只放 placeholder 頁**，scope M1–M4）。
頂部固定 Nav：首頁／練習／自創題／模擬考／錯題本／收藏／不確定，右上「清除本機紀錄」。

## 狀態模型（核心，務必一致）
- **未登入 = 純本機**：`store/local.ts` 以 `question_id` 為 key 存 `{selected, is_correct, is_marked_uncertain, is_favorite, mode, ts}`，外加 `settings`（上次篩選）。提供 `exportJSON()` / `importJSON()` 備份。
- 本輪預設走「未登入本機模式」（後端 attempts 端點已存在但前端先以 localStorage 為主；若帶 `X-User-Id` 才同步後端，本輪不強制）。
- **練習模式**：作答即時回饋（選項著色、解析展開、統計即時更新、錯題進快速回顧、題號盤著色）。
- **模擬考模式**：作答中**不**顯示答案/解析/收藏/不確定；交卷後呼叫 `POST /exam/grade` 顯示成績單。
- 題號盤狀態色：未作答 / 已答對 / 已答錯 / 標記不確定。
- 所有篩選變更後 → 重新產生題組。

## 主題 tokens（深色）
`--bg:#0f1115 · --surface:#1a1d24 · --surface-2:#232733 · --border:#2d323d · --text:#e6e8ec · --muted:#9aa0aa · --primary:#4f8cff · --correct:#2ecc71 · --wrong:#e74c3c · --warn:#f1c40f`
圓角 10px、卡片陰影、等寬來源標籤 chip。

## 後端契約重點（對齊 api/types.ts）
- envelope：`{data,error}`，error=`{code,message}`。分頁 data=`{items,page,page_size,total}`。
- `GET /categories` · `GET /categories/:id/subjects` · `GET /exam-sessions?category_id=`
- `GET /questions`：params `category_id, subject_id（多值）, session_ids（多值）, keyword, status(unanswered|wrong|favorite), limit(5|10|20|50|all), random(bool), page, page_size`。
- `GET /questions/:id?include_answer=false`：模擬考用，回傳不含 answer/explanation。
- `POST /practice/generate`：body 同 questions 篩選 → 回 `{question_ids:[]}`。
- `POST /exam/start`：body `{category_id, per_subject_n, duration_sec}` → `{exam_token, duration_sec, questions:[（不含答案）]}`。
- `POST /exam/grade`：body `{exam_token, answers:[{question_id,selected}]}` → `{total_score, per_subject:[{subject,score,correct,total}], items:[{question_id,selected,answer,is_correct,explanation}]}`。
- `POST /attempts` · `PATCH /attempts/:question_id` · `GET /stats` · `GET /attempts?status=`：需 `X-User-Id` header；本輪前端以 localStorage 為主，這些可選接。

## 明確 stub / 不做
- `/custom` 自創題本輪只 placeholder（M5 選配）。
- 登入/OAuth 不做；以本機模式為主。
- 題目來源資料來自後端 seed。
