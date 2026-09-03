import { describe, expect, it } from "vitest";
import { EXAM_FORMAT_NOTES, EXAM_SCOPE, scopeFor, totalIndicators } from "./examScope";
import { STUDY_NOTES, notePointCount, notesBySubject } from "./studyNotes";
import { TEACHER_SUBJECTS } from "./teacherQuestions";

describe("official exam scope", () => {
  it("covers the three professional subjects in the same order as the question bank", () => {
    expect(EXAM_SCOPE.map(item => item.subject)).toEqual([...TEACHER_SUBJECTS]);
  });

  it("carries the 國小類科 indicator counts from the 命題作業要點 (4 / 5 / 5)", () => {
    expect(EXAM_SCOPE.map(item => item.indicators.length)).toEqual([4, 5, 5]);
    expect(totalIndicators()).toBe(14);
  });

  it("keeps every indicator verbatim-shaped and every subject tagged with fields", () => {
    for (const item of EXAM_SCOPE) {
      expect(item.fields.length).toBeGreaterThanOrEqual(4);
      for (const indicator of item.indicators) {
        expect(indicator.endsWith("。")).toBe(true);
        expect(indicator.length).toBeGreaterThan(15);
      }
    }
    expect(scopeFor("課程教學與評量")?.preamble).toContain("高層次思考");
    expect(scopeFor("教育理念與實務")?.preamble).toBeUndefined();
    expect(EXAM_FORMAT_NOTES.some(note => note.includes("四選一"))).toBe(true);
  });

  it("says 國民小學 rather than 中等學校 in every indicator that names a school level", () => {
    for (const item of EXAM_SCOPE) for (const indicator of item.indicators) expect(indicator).not.toContain("中等學校");
  });
});

describe("second-brain study notes", () => {
  it("spreads notes across all three subjects with sourced memory points", () => {
    for (const subject of TEACHER_SUBJECTS) expect(notesBySubject(subject).length).toBeGreaterThanOrEqual(4);
    expect(notesBySubject("all")).toHaveLength(STUDY_NOTES.length);
    expect(notePointCount()).toBeGreaterThanOrEqual(60);
  });

  it("keeps ids unique and every note traceable back to a vault note", () => {
    const ids = new Set<string>();
    for (const note of STUDY_NOTES) {
      expect(ids.has(note.id)).toBe(false);
      ids.add(note.id);
      expect(note.source).toContain("40-教檢準備");
      expect(note.hook.length).toBeGreaterThan(10);
      expect(note.points.length).toBeGreaterThanOrEqual(3);
      for (const point of note.points) expect(point.detail.length).toBeGreaterThan(5);
    }
  });
});
