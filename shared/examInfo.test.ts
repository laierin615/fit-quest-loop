import { describe, expect, it } from "vitest";
import { EXAM_DATE_ISO, EXAM_PASS_RULES, EXAM_SUBJECTS, dailyQuestionPace, daysUntilExam, examCountdown } from "./examInfo";
import { TEACHER_QUESTIONS, TEACHER_SUBJECTS, questionsBySubject } from "./teacherQuestions";

describe("exam countdown", () => {
  it("counts calendar days to 116/6/13 regardless of time of day", () => {
    expect(daysUntilExam(new Date(2027, 5, 12, 23, 59))).toBe(1);
    expect(daysUntilExam(new Date(2027, 5, 13, 0, 1))).toBe(0);
    expect(daysUntilExam(new Date(2027, 5, 14, 8, 0))).toBe(-1);
    expect(daysUntilExam(new Date(2026, 8, 3))).toBe(283);
  });

  it("targets the announced exam date", () => {
    expect(EXAM_DATE_ISO).toBe("2027-06-13");
  });

  it("labels the four countdown states", () => {
    expect(examCountdown(new Date(2026, 8, 3)).state).toBe("far");
    expect(examCountdown(new Date(2027, 4, 20)).state).toBe("near");
    expect(examCountdown(new Date(2027, 5, 13)).state).toBe("today");
    expect(examCountdown(new Date(2027, 5, 20)).state).toBe("past");
    expect(examCountdown(new Date(2027, 5, 3)).label).toBe("倒數 10 天");
  });

  it("derives a daily question pace that finishes the bank in time", () => {
    expect(dailyQuestionPace(0, 0)).toBe(0);
    expect(dailyQuestionPace(10, 30)).toBe(3);
    expect(dailyQuestionPace(300, 60)).toBe(1);
    expect(dailyQuestionPace(0, 12)).toBe(12);
  });

  it("lists five 國小類科 subjects, three of them covered by the bank", () => {
    expect(EXAM_SUBJECTS).toHaveLength(5);
    expect(EXAM_SUBJECTS.filter(item => item.covered).map(item => item.name)).toEqual([...TEACHER_SUBJECTS]);
    expect(EXAM_PASS_RULES).toHaveLength(3);
  });
});

describe("teacher question bank", () => {
  it("keeps every question well formed with a unique id and a labelled source", () => {
    const ids = new Set<string>();
    for (const item of TEACHER_QUESTIONS) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.options.length).toBeGreaterThanOrEqual(4);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(item.options.length);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.explanation.length).toBeGreaterThan(20);
      expect(item.source).toMatch(/編寫/);
    }
  });

  it("covers all three professional subjects with at least 20 questions each", () => {
    expect(TEACHER_QUESTIONS.length).toBeGreaterThanOrEqual(60);
    for (const subject of TEACHER_SUBJECTS) expect(questionsBySubject(subject).length).toBeGreaterThanOrEqual(20);
    expect(questionsBySubject("all")).toHaveLength(TEACHER_QUESTIONS.length);
  });
});
