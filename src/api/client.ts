import type {
  ErrorCode,
  Envelope,
  Page,
  Category,
  Subject,
  ExamSession,
  QuestionPublic,
  QuestionQuery,
  ExamStartRequest,
  ExamStartResponse,
  ExamGradeRequest,
  ExamGradeResponse,
} from './types'

const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8080/api/v1'

export class ApiError extends Error {
  constructor(public code: ErrorCode | string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(base + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (err) {
    throw new ApiError('INTERNAL', err instanceof Error ? err.message : String(err))
  }

  const body = (await res.json()) as Envelope<T>

  if (!res.ok || body.error != null) {
    throw new ApiError(
      body.error?.code ?? 'INTERNAL',
      body.error?.message ?? res.statusText,
    )
  }

  return body.data as T
}

function buildQuery(q: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(q)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
    } else if (typeof value === 'boolean') {
      params.append(key, value ? 'true' : 'false')
    } else {
      params.append(key, String(value))
    }
  }
  return params.toString()
}

export const api = {
  listCategories(): Promise<Category[]> {
    return request<Category[]>('/categories')
  },

  listSubjects(categoryId: number): Promise<Subject[]> {
    return request<Subject[]>(`/categories/${categoryId}/subjects`)
  },

  listExamSessions(categoryId: number): Promise<ExamSession[]> {
    return request<ExamSession[]>(`/exam-sessions?category_id=${categoryId}`)
  },

  listQuestions(query: QuestionQuery): Promise<Page<QuestionPublic>> {
    const qs = buildQuery(query as Record<string, unknown>)
    return request<Page<QuestionPublic>>(`/questions?${qs}`)
  },

  getQuestion(id: number, includeAnswer = true): Promise<QuestionPublic> {
    const suffix = includeAnswer === false ? '?include_answer=false' : ''
    return request<QuestionPublic>(`/questions/${id}${suffix}`)
  },

  examStart(body: ExamStartRequest): Promise<ExamStartResponse> {
    return request<ExamStartResponse>('/exam/start', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  examGrade(body: ExamGradeRequest): Promise<ExamGradeResponse> {
    return request<ExamGradeResponse>('/exam/grade', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
