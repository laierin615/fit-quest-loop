import type { TeacherSubject } from "./teacherQuestions";

/**
 * 重點筆記：整理自個人 Obsidian 第二大腦 `40-教檢準備/`。
 * 每則保留原筆記出處，方便回去看完整脈絡與圖卡。
 */
export type NoteKind = "口訣" | "速查" | "對照" | "圖卡";

export type StudyNote = {
  id: string;
  subject: TeacherSubject;
  kind: NoteKind;
  title: string;
  hook: string;
  points: { term: string; detail: string }[];
  source: string;
};

export const STUDY_NOTES: StudyNote[] = [
  // ── 教育理念與實務 ──────────────────────────────────────────────
  {
    id: "note-four-committees", subject: "教育理念與實務", kind: "口訣", title: "法規四會：教評會・專審會・考核會・校事會議",
    hook: "聘任解聘找教評會，教學不力找專審會，年終獎懲找考核會，校園事件先走校事會議。",
    points: [
      { term: "教師評審委員會", detail: "校內人事審議：聘任、解聘、不續聘、停聘、資遣。依《教師法》。" },
      { term: "教師專業審查會", detail: "主管機關層級，受理學校申請，處理教學不力或不能勝任案件。" },
      { term: "成績考核委員會", detail: "年終考核、另予考核與平時獎懲。依《公立高級中等以下學校教師成績考核辦法》。" },
      { term: "校園事件處理會議", detail: "疑似校園事件的前端受理與調查／處理分流。" },
    ],
    source: "40-教檢準備/教育法規/2026-07-26-教檢法規四會比較圖卡",
  },
  {
    id: "note-mobility", subject: "教育理念與實務", kind: "圖卡", title: "社會流動與資本類型",
    hook: "問「跟父母那一代比」就是代間流動；問「同一個人一生內」才是代內流動。",
    points: [
      { term: "代間流動", detail: "子女與父母世代相比的地位變動。例：父母家境清寒、子女成為醫師。" },
      { term: "代內流動", detail: "同一個人一生中的職業地位變動。" },
      { term: "結構流動", detail: "產業或職業結構改變帶動整體流動，非個人努力所致。" },
      { term: "文化資本三形式", detail: "具體化（習性、談吐）、客觀化（書籍器物）、制度化（學歷證書）。錯題常混淆前兩者。" },
      { term: "資本類型", detail: "Bourdieu：經濟資本、文化資本、社會資本、象徵資本。" },
    ],
    source: "40-教檢準備/01-教育社會學/2026-07-26-教檢教育社會學-教育功能社會資本社會流動",
  },
  {
    id: "note-sociology-schools", subject: "教育理念與實務", kind: "對照", title: "教育社會學三大取向",
    hook: "功能問「教育對社會有什麼用」，衝突問「誰得利」，解釋論問「教室裡實際發生什麼」。",
    points: [
      { term: "結構功能論", detail: "Durkheim 社會事實、Parsons 五種模式變項與 AGIL；教育負責社會化與選擇分配。" },
      { term: "衝突理論", detail: "Bowles & Gintis 符應理論、Willis 學做工；教育再製階級結構。" },
      { term: "解釋論", detail: "符號互動論、俗民方法論、知識社會學（Bernstein 語言符碼、Young 課程即社會建構）。" },
      { term: "文化再製 vs 文化差異", detail: "再製論看結構性優勢的複製，差異論主張弱勢文化不是缺陷而是不同。" },
    ],
    source: "40-教檢準備/01-教育社會學/README、教師資格考試申論擬答/01-教育理念與實務",
  },
  {
    id: "note-plato", subject: "教育理念與實務", kind: "圖卡", title: "柏拉圖洞穴寓言與 Peters 三規準",
    hook: "洞穴寓言不是「提高文化水準」，而是「教育協助人獲得真正的知識」。",
    points: [
      { term: "洞穴寓言", detail: "被綁在洞中的人把影子當真實；走出洞穴才見真知。屬理想主義，重心靈啟迪與理性。" },
      { term: "Peters 三規準", detail: "合認知性、合價值性、合自願性。灌輸違反的是「認知性」（不重視學生理解）。" },
      { term: "教育三種隱喻", detail: "接生（產婆法）、雕刻（塑造）、生長（Dewey）。" },
    ],
    source: "40-教檢準備/02-教育哲學/2026-07-26-教檢教育哲學-柏拉圖洞穴寓言",
  },
  {
    id: "note-philosophy-map", subject: "教育理念與實務", kind: "速查", title: "教育哲學派別定位",
    hook: "傳統派問「該教什麼永恆的東西」，進步派問「學生怎麼經驗」，批判派問「這是誰的知識」。",
    points: [
      { term: "永恆主義", detail: "經典名著、理性至上，教育內容跨時代不變。" },
      { term: "精粹主義", detail: "學科基本知識與能力，強調紀律與教師權威。" },
      { term: "進步主義", detail: "Dewey：教育即生長、做中學、民主生活。" },
      { term: "重建主義", detail: "教育應主動改造社會，處理社會不公。" },
      { term: "批判教育學", detail: "Freire 反囤積式教育，以對話與提問培養批判意識。" },
      { term: "存在主義／關懷倫理學", detail: "重個人選擇與責任；Noddings 以關懷關係為教育核心。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/01-教育理念與實務（該科重點清單）",
  },

  // ── 學習者發展與適性輔導 ──────────────────────────────────────
  {
    id: "note-effects", subject: "學習者發展與適性輔導", kind: "速查", title: "考場常見的各種效應",
    hook: "先分「這是誰的期望／誰被觀察／測驗工具出問題」三類，再對號入座。",
    points: [
      { term: "比馬龍效應", detail: "教師期望造成自我應驗預言。" },
      { term: "月暈效應", detail: "以單一印象概括全部評價，屬評定偏誤。" },
      { term: "霍桑效應", detail: "因知道自己被觀察而改變表現。" },
      { term: "強亨利效應", detail: "控制組因不甘示弱而額外努力。" },
      { term: "漣漪效應", detail: "Kounin：處理一位學生擴散影響旁觀者。" },
      { term: "普力馬克原則", detail: "以高頻活動增強低頻活動（阿嬤法則）。" },
      { term: "柴嘉妮效應", detail: "未完成的事比已完成的更容易被記住。" },
      { term: "天花板／地板效應", detail: "題目過易或過難，分數擠在上下限而失去鑑別度。" },
      { term: "馬太效應", detail: "優勢累積，強者愈強。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/02-學習者發展與適性輔導（各種效應）",
  },
  {
    id: "note-reinforcement", subject: "學習者發展與適性輔導", kind: "對照", title: "增強與懲罰四格",
    hook: "「正負」看給予或移除，「增強懲罰」看行為變多還變少——兩個軸分開想就不會錯。",
    points: [
      { term: "正增強", detail: "給予愉快刺激，行為增加。例：完成作業得到獎勵卡。" },
      { term: "負增強", detail: "移除嫌惡刺激，行為增加。例：達標可免寫罰寫。" },
      { term: "正懲罰", detail: "給予嫌惡刺激，行為減少。" },
      { term: "負懲罰", detail: "移除愉快刺激，行為減少。例：取消下課活動（剝奪）。" },
      { term: "三級增強物", detail: "物質性 → 活動性 → 社會性，逐步褪除外在酬賞以免過度辯證效應。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/02-學習者發展與適性輔導（教育心理學）",
  },
  {
    id: "note-guidance", subject: "學習者發展與適性輔導", kind: "口訣", title: "三級輔導與基本輔導技巧",
    hook: "全體→發展性，有需求→介入性，需專業矯治或身心治療→處遇性。",
    points: [
      { term: "發展性輔導", detail: "全體學生，生活、學習與生涯的預防性課程與活動。" },
      { term: "介入性輔導", detail: "適應困難或重複發生問題行為的學生，由輔導教師提供個別或小團體諮商。" },
      { term: "處遇性輔導", detail: "嚴重適應困難、行為偏差或身心障礙者，結合社政、衛政與司法等專業合作。" },
      { term: "場面構成", detail: "諮商初期說明角色、時間、次數、保密與限制，建立結構。" },
      { term: "摘要／立即性／澄清", detail: "摘要整理內容；立即性處理此時此地的關係；澄清釐清模糊訊息。" },
      { term: "同理心優先", detail: "先反映情緒與需求，建議與策略留到關係建立之後。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/02-學習者發展與適性輔導（輔導原理與實務）",
  },
  {
    id: "note-classroom", subject: "學習者發展與適性輔導", kind: "對照", title: "班級經營三家說法",
    hook: "Kounin 看「教師有沒有掌握全局」，Jones 看「肢體與獎勵結構」，Canter 看「教師敢不敢明確表態」。",
    points: [
      { term: "Kounin", detail: "掌握全局（withitness）、同時處理、漣漪效應、動作管理與團體警覺。" },
      { term: "Jones", detail: "正向班級經營：肢體語言、獎勵制度與有效的個別協助。" },
      { term: "Canter", detail: "果斷紀律：教師明確表達期待與後果，非敵意亦非懦弱。" },
      { term: "Dreikurs", detail: "四大錯誤行為目標：引起注意、爭取權力、報復、表現無能。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/02-學習者發展與適性輔導（班級經營）",
  },
  {
    id: "note-development", subject: "學習者發展與適性輔導", kind: "對照", title: "發展理論階段對照",
    hook: "題幹給年齡就先定位階段，再看它問的是認知、社會情緒還是道德。",
    points: [
      { term: "Piaget", detail: "感覺動作、前運思、具體運思（國小中高年級）、形式運思；同化與調適。" },
      { term: "Erikson", detail: "學齡期＝勤奮進取對自貶自卑；青春期＝自我認同對角色混淆。" },
      { term: "Kohlberg", detail: "成規前期（避罰、相對功利）、成規期（乖孩子、法律秩序）、成規後期（社會契約、普遍倫理）。" },
      { term: "Marcia", detail: "統合狀態四型：定向、未定、早閉、迷失，以「危機」與「承諾」兩軸交叉。" },
      { term: "Bronfenbrenner", detail: "微系統／中系統（親師互動）／外系統（家長職場）／鉅系統／時間系統。" },
      { term: "Baumrind", detail: "教養方式：權威開明、專制威權、放任溺愛、忽視型。" },
    ],
    source: "40-教檢準備/教師資格考試申論擬答/02-學習者發展與適性輔導（教育心理學）",
  },

  // ── 課程教學與評量 ────────────────────────────────────────────
  {
    id: "note-reliability", subject: "課程教學與評量", kind: "口訣", title: "信度與效度題幹判斷",
    hook: "信度問「穩不穩」，效度問「準不準」；信度是效度的必要但非充分條件。",
    points: [
      { term: "時間 → 重測信度", detail: "同一份測驗前後施測兩次的相關。" },
      { term: "等值題本 → 複本信度", detail: "兩份內容等值的題本之間的一致性。" },
      { term: "題目同心 → 內部一致性", detail: "折半信度、Cronbach α。" },
      { term: "不同評分者 → 評分者信度", detail: "實作與檔案評量特別重要，需搭配評分規準。" },
      { term: "範圍與目標 → 內容效度", detail: "雙向細目表就是內容效度的保障。" },
      { term: "現在或未來表現 → 效標關聯效度", detail: "同時效度與預測效度。" },
      { term: "抽象理論特質 → 建構效度", detail: "測驗是否真的測到理論構念。" },
    ],
    source: "40-教檢準備/2026-08-01-信度與效度聯想圖",
  },
  {
    id: "note-high-frequency", subject: "課程教學與評量", kind: "速查", title: "★★★ 超高頻考點",
    hook: "幾乎每年都出：ARCS、Bloom 修訂版、Gagné 第三步、UbD 順序、行為目標 ABCD。",
    points: [
      { term: "ARCS（Keller）", detail: "注意 A、相關 R、信心 C、滿足 S。「說明課程與生活的關係」＝R；「逐步鼓勵完成任務」＝C。" },
      { term: "Bloom 修訂版（2001）", detail: "記憶→了解→應用→分析→評鑑→創造。舊版最高是評鑑，修訂版最高是創造。" },
      { term: "Gagné 九大教學事件", detail: "第 1 引起注意、第 2 告知目標、第 3 引起舊學習（刺激先備知識）← 常考、第 4 呈現教材。" },
      { term: "UbD 逆向設計", detail: "確定結果 → 決定評量證據 → 規劃教學。評量在第二階段。" },
      { term: "行為目標 ABCD（Mager）", detail: "A 對象、B 行為、C 條件、D 程度。" },
    ],
    source: "40-教檢準備/05-教學原理/高頻考點速查",
  },
  {
    id: "note-carroll", subject: "課程教學與評量", kind: "口訣", title: "Carroll 學校學習模式與精熟學習",
    hook: "需要的時間看「能不能學」，投入的時間看「肯不肯學」。",
    points: [
      { term: "需要學習的時間", detail: "性向 + 教學品質 + 理解教學的能力。" },
      { term: "實際投入的時間", detail: "學習機會 + 毅力。" },
      { term: "Bloom 精熟學習", detail: "校正活動＝補救教學（不是充實活動）；主張多數學生在足夠時間下都能精熟。" },
      { term: "學習扶助", detail: "先以科技化評量診斷未通過的基本學習內容，再針對性補強，不是單純加量或加速。" },
    ],
    source: "40-教檢準備/05-教學原理/高頻考點速查",
  },
  {
    id: "note-differentiation", subject: "課程教學與評量", kind: "對照", title: "差異化教學與課程目標型態",
    hook: "差異化的本質是「哲學」不是某一種方法；調整路徑而不降低課綱目標。",
    points: [
      { term: "差異化四維度", detail: "內容 Content、歷程 Process、成果 Product、情意與環境 Affect-Environment。" },
      { term: "依什麼調整", detail: "學生的準備度、興趣與學習風格。" },
      { term: "行為目標", detail: "可觀察、可測量，適合結構良好的知識技能。" },
      { term: "表意目標（Eisner）", detail: "重過程與個別體驗，結果開放，不預設統一答案。" },
      { term: "108 課綱學習重點", detail: "＝學習表現 ＋ 學習內容，兩者對應設計課程與評量。" },
    ],
    source: "40-教檢準備/05-教學原理/高頻考點速查、04-課程與教學/README",
  },
  {
    id: "note-scholars", subject: "課程教學與評量", kind: "速查", title: "關鍵學者一句話速查",
    hook: "看到人名先想他的「代表名詞」，再想那個名詞的關鍵字。",
    points: [
      { term: "Tyler", detail: "目標模式：目標→選擇經驗→組織經驗→評鑑。" },
      { term: "Bruner", detail: "螺旋課程、三種表徵（動作／形象／符號）、發現學習。" },
      { term: "Ausubel", detail: "前導組體、有意義的接受式學習。" },
      { term: "Gagné", detail: "九大教學事件、五大學習結果。" },
      { term: "Zimmerman", detail: "自我調整學習三階段：預想、執行、自我省思。" },
      { term: "Gardner", detail: "多元智能；用來拓展展能管道，不是把學生貼標籤分類。" },
      { term: "Wiggins & McTighe", detail: "UbD 重理解的課程設計（逆向設計）。" },
      { term: "Eisner", detail: "表意目標、教育鑑賞與批評。" },
    ],
    source: "40-教檢準備/05-教學原理/README（關鍵學者速查）",
  },
  {
    id: "note-assessment-types", subject: "課程教學與評量", kind: "口訣", title: "評量四型與試題分析",
    hook: "安（教學前）形（教學中）總（教學後），診斷則是專門找持續困難的成因。",
    points: [
      { term: "安置性評量", detail: "教學前決定起點行為與分組安置。" },
      { term: "形成性評量", detail: "教學中回饋與調整，形成性 ≠ 計算成績。" },
      { term: "診斷性評量", detail: "針對持續學習困難探究成因。" },
      { term: "總結性評量", detail: "教學後評定成果。" },
      { term: "難度 P", detail: "答對率；愈接近 0.5 鑑別力通常愈好。" },
      { term: "鑑別度 D", detail: "高分組答對率 − 低分組答對率；過低表示無法區辨，應檢討修題。" },
      { term: "常模 vs 標準參照", detail: "常模看團體中的相對位置，標準參照看是否達到預設標準。" },
    ],
    source: "40-教檢準備/05-教學原理/高頻考點速查、2026-08-01-信度與效度聯想圖",
  },
];

export const STUDY_NOTES_ORIGIN = "整理自個人第二大腦 40-教檢準備/";

export function notesBySubject(subject: TeacherSubject | "all") {
  if (subject === "all") return STUDY_NOTES;
  return STUDY_NOTES.filter(note => note.subject === subject);
}

export function notePointCount() {
  return STUDY_NOTES.reduce((sum, note) => sum + note.points.length, 0);
}
