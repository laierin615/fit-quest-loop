import type { TeacherQuestion } from "./teacherQuestions";

export function gradeTeacherQuestion(question: TeacherQuestion, selected: number) {
  const correct = selected === question.answer;
  return { correct, feedbackClass: correct ? "correct" : "wrong", showExplanation: true, answer: question.answer, explanation: question.explanation } as const;
}

export function nextQuestionIndex(current: number, total: number) {
  return total > 0 ? (current + 1) % total : 0;
}
