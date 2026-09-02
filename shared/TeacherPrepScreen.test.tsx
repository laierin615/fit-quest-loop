// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeacherPrepScreen } from "../client/src/pages/Home";

const progress = { solved: 0, correct: 0, streak: 0, bestStreak: 0, chapter: 1, chestCount: 0 };

describe("TeacherPrepScreen UI", () => {
  it("shows immediate correct feedback, explanation, and advances to the next question", () => {
    const onAnswer = vi.fn();
    render(<TeacherPrepScreen progress={progress} onAnswer={onAnswer} />);
    const question = screen.getByRole("heading", { level: 2 });
    expect(question).toHaveTextContent("形成性評量");
    fireEvent.click(screen.getByRole("button", { name: /在學習歷程中提供回饋並調整教學/ }));
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByText("答對！知識獵徑亮起。")).toBeInTheDocument();
    expect(screen.getByText(/形成性評量發生於學習過程中/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /下一題/ })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /下一題/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("班級經營規範");
  });

  it("shows wrong styling, correct answer, and explanation after an incorrect choice", () => {
    const onAnswer = vi.fn();
    render(<TeacherPrepScreen progress={progress} onAnswer={onAnswer} />);
    const wrong = screen.getByRole("button", { name: /作為學期成績的唯一依據/ });
    fireEvent.click(wrong);
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(wrong).toHaveClass("wrong");
    expect(screen.getByText("正解是 B。" )).toBeInTheDocument();
    expect(screen.getByText(/形成性評量發生於學習過程中/)).toBeInTheDocument();
  });
});
