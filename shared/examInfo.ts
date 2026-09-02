/** 國民小學教師資格考試（教檢）的公開資訊與倒數。純函式，方便測試。 */

export const EXAM_YEAR_LABEL = "116 年度";
export const EXAM_NAME = "高級中等以下學校及幼兒園教師資格考試";
/** 116 年 6 月 13 日（星期日）。教育部公告之考試日期。 */
export const EXAM_DATE_ISO = "2027-06-13";
export const EXAM_DATE_LABEL = "116 年 6 月 13 日（星期日）";
export const EXAM_OFFICIAL_URL = "https://tqa.rcpet.edu.tw/TEA_Exam/TEA01.aspx";
export const EXAM_PAST_PAPER_URL = "https://tqa.rcpet.edu.tw/TEA_Exam/TEA03.aspx";

export type ExamSubject = { name: string; group: "common" | "professional"; covered: boolean };

/** 國民小學類科應試科目共五科；本題庫涵蓋其中三科教育專業科目。 */
export const EXAM_SUBJECTS: ExamSubject[] = [
  { name: "國語文能力測驗", group: "common", covered: false },
  { name: "數學能力測驗", group: "common", covered: false },
  { name: "教育理念與實務", group: "professional", covered: true },
  { name: "學習者發展與適性輔導", group: "professional", covered: true },
  { name: "課程教學與評量", group: "professional", covered: true },
];

/** 及格標準依《高級中等以下學校及幼兒園教師資格考試辦法》第 9 條。 */
export const EXAM_PASS_RULES = [
  "應試科目總成績平均滿 60 分",
  "應試科目不得有二科成績均未滿 50 分",
  "應試科目不得有一科成績為零分",
];

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** 以「當地日曆日」計算剩餘天數：今天回傳 0，考完回傳負數。 */
export function daysUntilExam(today: Date, examDateIso: string = EXAM_DATE_ISO) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = parseDateKey(examDateIso);
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export type ExamCountdown = { days: number; label: string; note: string; state: "far" | "near" | "today" | "past" };

export function examCountdown(today: Date, examDateIso: string = EXAM_DATE_ISO): ExamCountdown {
  const days = daysUntilExam(today, examDateIso);
  if (days < 0) return { days, label: "已考完", note: `${EXAM_YEAR_LABEL}考試已於 ${EXAM_DATE_LABEL} 舉行。`, state: "past" };
  if (days === 0) return { days, label: "就是今天", note: "帶好准考證與身分證件，穩住呼吸，你準備很久了。", state: "today" };
  if (days <= 30) return { days, label: `倒數 ${days} 天`, note: "最後一個月：以歷屆試題與錯題複習為主，不要再開新進度。", state: "near" };
  return { days, label: `倒數 ${days} 天`, note: `距離 ${EXAM_YEAR_LABEL}教師資格考試還有 ${Math.floor(days / 7)} 週，每天走一題也走得到。`, state: "far" };
}

/** 依剩餘天數換算「每天至少幾題」才能把題庫走完一輪。 */
export function dailyQuestionPace(days: number, remainingQuestions: number) {
  if (remainingQuestions <= 0) return 0;
  if (days <= 0) return remainingQuestions;
  return Math.max(1, Math.ceil(remainingQuestions / days));
}
