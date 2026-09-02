export type TeacherQuestion = {
  id: string;
  subject: "教育理念與實務" | "學習者發展與適性輔導" | "課程教學與評量";
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
};

const scopeSource = "依教育部《高級中等以下學校及幼兒園教師資格考試命題作業要點》之國民小學教育專業科目範圍編寫";

export const TEACHER_QUESTIONS: TeacherQuestion[] = [
  { id: "edu-001", subject: "教育理念與實務", question: "下列何者最符合形成性評量的主要功能？", options: ["作為學期成績的唯一依據", "在學習歷程中提供回饋並調整教學", "依分數將學生固定分組", "取代所有課堂觀察"], answer: 1, explanation: "形成性評量發生於學習過程中，重點是蒐集學習證據、提供回饋並調整學生學習或教師教學，而非只在課程結束後評定成績。", source: scopeSource },
  { id: "edu-002", subject: "教育理念與實務", question: "教師在設計班級經營規範時，優先採取何種做法最能培養學生的自治責任？", options: ["由教師單方面宣布所有規定", "讓學生參與討論規範及其合理理由", "以高額扣分取代說明", "只處理違規、不檢視規範"], answer: 1, explanation: "讓學生理解規範目的並參與討論，有助於建立內在認同、責任感與民主參與經驗；教師仍需負責維持安全與公平。", source: scopeSource },
  { id: "learner-001", subject: "學習者發展與適性輔導", question: "依據維高斯基的近側發展區概念，教師較適切的支持方式是？", options: ["只安排學生已能獨立完成的任務", "提供適度鷹架，逐步移除支持", "直接公布所有答案", "完全不介入以避免影響自主"], answer: 1, explanation: "近側發展區指學生在協助下能完成、但尚未能獨立完成的範圍。鷹架應隨能力提升而逐步撤除，促進獨立學習。", source: scopeSource },
  { id: "learner-002", subject: "學習者發展與適性輔導", question: "面對學生持續出現學習挫折，教師第一步較適切的作法是？", options: ["立即以懲罰提高壓力", "蒐集學習表現與情境資料，了解困難來源", "直接替學生完成作業", "只通知家長要求加強練習"], answer: 1, explanation: "適性輔導應先進行資料蒐集與需求理解，辨識學習策略、先備能力、情緒、人際或家庭情境等可能因素，再共同規劃支持。", source: scopeSource },
  { id: "curriculum-001", subject: "課程教學與評量", question: "素養導向教學設計最重視下列何者？", options: ["背誦最多定義", "將知識、技能與態度運用於真實或情境化問題", "只增加考試題數", "所有學生完成完全相同的歷程"], answer: 1, explanation: "素養包含在情境中整合知識、技能與態度，進行理解、判斷與行動的能力，因此教學應提供有意義的脈絡與應用機會。", source: scopeSource },
  { id: "curriculum-002", subject: "課程教學與評量", question: "若學習目標要求學生能『分析』資料，最適切的評量任務是？", options: ["請學生背出名詞定義", "請學生辨認單一事實", "提供資料並請學生比較證據、說明推論", "請學生抄寫課本文句"], answer: 2, explanation: "分析涉及拆解資訊、比較關係、判讀證據與形成推論，評量任務應要求學生展現這些可觀察的思考歷程。", source: scopeSource },
];
