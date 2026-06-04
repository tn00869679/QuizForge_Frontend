export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'INTERNAL'

export interface Envelope<T> { data: T | null; error: { code: ErrorCode; message: string } | null }

export interface Page<T> { items: T[]; page: number; page_size: number; total: number }

export interface Category { id: number; code: string; name: string; description: string; created_at: string }
export interface Subject { id: number; category_id: number; name: string; order_index: number; created_at: string }
export interface ExamSession { id: number; category_id: number; year: number; term: number; source_url: string; label: string; created_at: string }

export interface QuestionOption { key: string; text: string }
export interface QuestionPublic {
  id: number; subject_id: number; exam_session_id: number; number: number
  stem: string; options: QuestionOption[]; answer: string; explanation: string
  tags: string[]; difficulty: number
}
// 模擬考模式:answer/explanation 欄位「完全缺席」(後端 omitempty)
export type QuestionExamMode = Omit<QuestionPublic, 'answer' | 'explanation'>

export type AnswerKey = 'A' | 'B' | 'C' | 'D'

export interface QuestionQuery {
  category_id?: number
  subject_id?: number[]      // 多值
  session_ids?: number[]     // 多值
  keyword?: string
  status?: 'unanswered' | 'wrong' | 'favorite'  // 注意:後端此 filter 需 X-User-Id,本輪不送 → 前端自行處理,client 仍照傳
  random?: boolean
  limit?: '5' | '10' | '20' | '50' | 'all'
  page?: number
  page_size?: number
}

export interface ExamStartRequest { category_id: number; per_subject_n?: number; duration_sec?: number }
export interface ExamStartPerSubject { subject_id: number; subject: string; count: number }
export interface ExamStartResponse {
  exam_token: string; duration_sec: number; total: number
  per_subject: ExamStartPerSubject[]; questions: QuestionExamMode[]
}

export interface ExamGradeAnswer { question_id: number; selected: AnswerKey | '' }  // '' = 跳過
export interface ExamGradeRequest { exam_token: string; answers: ExamGradeAnswer[] }
export interface ExamGradePerSubject { subject_id: number; subject: string; correct: number; total: number; score: number }
export interface ExamGradeItem {
  question_id: number; number: number; selected: string; answer: string
  is_correct: boolean; explanation: string; subject: string
}
export interface ExamGradeResponse {
  score: number; correct: number; total: number; expired: boolean
  per_subject: ExamGradePerSubject[]; items: ExamGradeItem[]
}

// 前端本機統計(形狀對齊後端 stats)
export interface UserStats { answered: number; correct: number; accuracy: number; wrong: number; favorites: number; uncertain: number }
