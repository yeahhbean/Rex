require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

async function analyzeExpense(expense) {
  console.log("보내는 expense:", expense);
  const { id, category_name, memo, amount, spent_at } = expense;

  const prompt = `
다음은 사용자의 소비 내역입니다.

- 카테고리: ${category_name}
- 메모: ${memo}
- 금액: ${amount}원
- 날짜: ${spent_at}

이 소비가 감정적 소비인지 판단해줘:
1. 감정 소비면 is_emotional: true, 아니면 false
2. 소비를 하지 않거나 더 적은 소비를 할 수 있었음에도 불구하고 소비한 내역에 대해서는 감정적 소비로 판단하는 게 좋아
3. feedback은 재치 있고 뼈 있는 MZ 감성 한 줄! 현실적인 돈 걱정, 밈, 이모지 포함 가능

절대 착하거나 조심스러운 문장 말고, 예시는 이런 느낌:
- “다음 정거장 파산입니다 🚨💳”
- “삼겹살보다 지갑이 더 구워졌어요 🔥”
- “이 정도면 제트기 사는 게 낫겠어요 ✈️💸”
- "이 정도면 에어컨이 아니라 남극이네요 ❄️😂"”

📌 **응답은 JSON 형식으로 정확하게! 절대 설명 붙이지 마.**
예:
{
  "is_emotional": true,
  "emotional_reason": "스트레스로 인한 무계획 지출입니다.",
  "feedback": "이건 삼겹살이 아니라 감정 태운 불판이에요 🔥💸"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = await response.text();

    console.log("Gemini 응답:\n", text);

    const cleanText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanText);

    return {
      is_emotional: parsed.is_emotional || false,
      emotional_reason: parsed.emotional_reason || "",
      feedback: parsed.feedback || "",
    };
  } catch (err) {
    console.error("Gemini 분석 중 오류:", err);
    return {
      is_emotional: false,
      emotional_reason: "분석 실패",
      feedback: "오늘은 분석도 휴가네요 ☁️",
    };
  }
}

module.exports = {
  analyzeExpense,
};
