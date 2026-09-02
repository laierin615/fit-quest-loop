import { describe, expect, it } from "vitest";
import { TEACHER_QUESTIONS } from "./teacherQuestions";
import { gradeTeacherQuestion, nextQuestionIndex } from "./studyFlow";

describe("teacher study flow", () => {
  it("returns immediate correct feedback and explanation", () => {
    const question = TEACHER_QUESTIONS[0]!;
    const result = gradeTeacherQuestion(question, question.answer);
    expect(result).toMatchObject({ correct: true, feedbackClass: "correct", showExplanation: true, answer: question.answer });
    expect(result.explanation).toBe(question.explanation);
  });

  it("returns wrong feedback while revealing the correct answer and explanation", () => {
    const question = TEACHER_QUESTIONS[0]!;
    const wrongOption = question.answer === 0 ? 1 : 0;
    const result = gradeTeacherQuestion(question, wrongOption);
    expect(result).toMatchObject({ correct: false, feedbackClass: "wrong", showExplanation: true, answer: question.answer });
    expect(result.explanation.length).toBeGreaterThan(10);
  });

  it("moves to the next question and wraps after the last one", () => {
    expect(nextQuestionIndex(0, TEACHER_QUESTIONS.length)).toBe(1);
    expect(nextQuestionIndex(TEACHER_QUESTIONS.length - 1, TEACHER_QUESTIONS.length)).toBe(0);
  });
});
