require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

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
3. 하지만 살아가는 데 꼭 필요한 소비라면 감정적 소비가 아니라고 판단하기!
- 웬만한 경조사비, 고정지출, 주거비, 병원비, 교육비 등은 메모 내용이 정당하지 않을 때만 감정적 소비라고 판단
- 다치거나 병원 치료 목적의 소비는 메모가 아무리 유쾌해도 감정적 소비가 아님. 생존, 치료 목적 소비는 항상 is_emotional: false.
- "라면", "김밥" 등 메뉴만 단독으로 적혀 있어도 카테고리가 식비이고 정규 식사로 보이면 감정 소비 아님!
4. is_emotional이 true인 경우에만 feedback 불러오기. false면 feedback 필요없어

feedback 작성 참고사항:
- 사용자에 소비에 대해 피드백을 작성하여 사용자가 감정 소비를 줄일 수 있게 하는 역할
- 사용자의 소비 금액과 메모를 참고하여 간단한 피드백 작성
- 재치있는 MZ 감성이 담긴 짧은 한 줄 피드백! 언어유희, 밈, 이모지 등 활용 가능 (이모지는 문맥에 맞게 다양하게 활용)
- 절대 착하거나 조심스러운 문장 말고 감정 소비를 한 사용자가 뼈 맞을 수 있는 문장으로

아래는 feedback 예시:
- “다음 정거장 파산입니다 🚨💳”
- “삼겹살보다 지갑이 더 구워졌어요 🔥”
- “이 정도면 제트기 사는 게 낫겠어요 ✈️💸”
- “이건 소비가 아니라 감정 폭발이었어요 🎇🛒”
- “스트레스 푼 값 치고는 비쌌다… 💸💥”
- “다음엔 이불 속에서 참자 우리… 🛏️🥹”
- “이 정도면 지갑이 운다요… 😭👛”
- “그 돈이면 고기 구웠겠다 🔥🥩”
- “감정은 풀렸는데 통장은 얼었다 ❄️💳”
- “헐… 이건 거의 정서비용이잖아 😮‍💨🧾”
- “진심 공허함만 남았을 듯… 🕳️🧠”
- “다음엔 쿠팡 장바구니 말고 산책 어때요? 🛒🚶‍♀️”
- “지름신 강림 인정... 근데 갔다가 바로 퇴장시켜야 했음 🙃🛐”
- “이건 그냥 지갑으로 울었어요 😭👝”
- “템은 남았지만 내 정신은 갔어요 🧠💸”
- “아니 이게 왜 필요했죠 우리...? 🫠🧾”
- “그 순간만 행복했고 지금은 멍... 😶‍🌫️📉”
- “저 돈이면 떡볶이 10번은 먹었겠다 🌶️🍽️”
- “지름은 순간, 카드값은 영원 💳🕰️”
- “와… 이건 텅장 뚫고 나온 감정이었다 😤🕳️”
- “이 정도면 감정+충동 콜라보다 🎭🛍️”
- “이건 감성 말고 감옥급 소비였어요 ⛓️💸”
- “울지 마 내 통장… 다음엔 꼭 참자 🥺📉”
=> 이런 느낌의 문장과 소비 메모의 내용이 일부 첨가된 피드백 작성 
(소비 메모 내용 그대로 삽입 x, 소비 금액은 피드백에 포함되지 않아도 됨)


📌 **응답은 JSON 형식으로 정확하게! 절대 설명 붙이지 마.**
예:
{
  "is_emotional": true,
  "feedback": "이건 삼겹살이 아니라 지갑 태운 불판이에요 🔥💸"
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
      feedback: parsed.feedback || "",
    };
  } catch (err) {
    console.error("Gemini 분석 중 오류:", err);
    return {
      is_emotional: false,
      feedback: "오늘은 분석도 휴가네요 ☁️",
    };
  }
}

module.exports = {
  analyzeExpense,
};
