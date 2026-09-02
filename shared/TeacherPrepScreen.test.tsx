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
    expect(question).toHaveTextContent("杜威");
    fireEvent.click(screen.getByRole("button", { name: /^C進步主義$/ }));
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByText("答對！知識獵徑亮起。")).toBeInTheDocument();
    expect(screen.getByText(/進步主義以兒童經驗為核心/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /下一題/ })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /下一題/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("囤積式教育");
  });

  it("shows wrong styling, correct answer, and explanation after an incorrect choice", () => {
    const onAnswer = vi.fn();
    render(<TeacherPrepScreen progress={progress} onAnswer={onAnswer} />);
    const wrong = screen.getByRole("button", { name: /^A永恆主義$/ });
    fireEvent.click(wrong);
    expect(onAnswer).toHaveBeenCalledWith(false);
    expect(wrong).toHaveClass("wrong");
    expect(screen.getByText("正解是 C。" )).toBeInTheDocument();
    expect(screen.getByText(/進步主義以兒童經驗為核心/)).toBeInTheDocument();
  });
});
