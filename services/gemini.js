// gemini.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeExpense(expense) {
    console.log("보내는 expense:", expense);
  const { expense_id, id, category_name, memo, amount, spent_at } = expense;
  const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

  const prompt = `
당신은 사용자 지출을 분석해 감정적 소비 여부를 판단하고, 재치 있는 피드백을 생성하는 AI입니다.

입력:
- id: ${id}
- category_name: ${category_name}
- memo: ${memo}
- amount: ${amount}
- spent_at: ${spent_at}

판단기준 :
1. 감정적 소비('is_emotional = true')는 다음과 같은 경우를 포함합니다:
   - 스트레스를 해소하려는 소비 (예 : 스트레스 받아서 고기 먹음)
   - 충동구매, 즉흥적 소비 (예 : 예뻐서 신발 삼)
   - 외로움, 감정적 위안 목적의 소비 (예 : 혼자니까 하나 더 삼)
   - 기분 전환용 소액 반복 소비 (예 : 우울해서 디저트 먹음)
   - 자신에게 보상하기 위한 소비 (특징 : 보상/보답 언급 + 평소보다 큰 금액)
   - 소액 반복 소비 (특징 : 동일 카테고리, 동일 금액의 반복)
   - 일정 카테고리 과다 비중 (특징 : 비중 60% 이상이면 감정 소비일 확률 증가)
   - 짧은 기간 내 유사 (특징 : 연속적으로 비슷한 내용의 소비)

2. 다음은 감정적 소비가 아닌 경우('is_emotional = false')입니다:
   - 생계에 필요한 소비 (식료품, 고정지출 등)
   - 계획적인 지출, 예산에 따른 구매
   - 정기적, 목적성 높은 비용 납부

출력:
- 감정 소비 판단: is_emotional (true / false)
   - false일 경우 아래 결과는 작성하지 않고 공백으로 return
- 감정 소비일 경우 emotional_reason 작성
- feedback 작성
- feedback은 짧고 간결하게! 재치있고 유쾌하게, 인상깊게 작성. 한 줄 정도로.
- feedback이 재밌어야 하지만, 사용자를 비난/비방하는 등의 이유로 사용자에게 상처를 주면 안 됨
- 전체 결과는 JSON 형식으로 응답

출력 예시:
{
   "expense_id": 'expense_id',
   "is_emotional": true,
   "emotional_reason": "보상심리로 인한 즉흥적 소비로 보입니다.",
   "feedback": "이 정도면 오늘 지갑이 감정을 다 받아줬네요 🥲"
}
{
   "expense_id": 'expense_id',
   "is_emotional": true,
   "emotional_reason": "스트레스 해소를 위한 감정적 소비로 보입니다.",
   "feedback": "계좌를 보고 더 스트레스 받지 않게 계획적 소비해요 🤨"
}
{
   "expense_id": 'expense_id',
   "is_emotional": true,
   "emotional_reason": "음주로 인한 무계획적 소비 같습니다.",
   "feedback": "지갑도 슬퍼서 술 마실 것 같아요 😣"
}
{
   "expense_id": 'expense_id',
   "is_emotional": false,
   "emotional_reason": "",
   "feedback": ""
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();

    console.log("Gemini 응답:\n", text); // ★ 이거 추가해보세요

    const cleanText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanText);

    return {
      is_emotional: parsed.is_emotional || false,
      emotional_reason: parsed.emotional_reason || "",
      feedback: parsed.feedback || ""
    };
  } catch (err) {
    console.error("Gemini 분석 중 오류:", err);
    return {
      is_emotional: false,
      emotional_reason: "분석 실패",
      feedback: "오늘은 분석도 휴가네요... ☁️"
    };
  }
}

module.exports = {
  analyzeExpense,
};
