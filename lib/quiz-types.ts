export interface QuizOption {
  id: string
  text: string
  img?: string
}

export interface QuizQuestion {
  firebaseKey?: string
  questionText: string
  questionImage?: string
  options: QuizOption[]
  correctOptionId: string
  explanation?: string
  explanationImage?: string
}

export interface QuizSet {
  setId: string
  setName: string
  questions: QuizQuestion[]
}

export interface QuizData {
  sets: QuizSet[]
}
