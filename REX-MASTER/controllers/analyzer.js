// controllers/analyzer.js
module.exports = function analyzeEmotion({ amount, memo, category }) {
  const reasons = [];

  if (amount > 50000) reasons.push("고액 소비");
  if (["명품", "카페", "플렉스"].some((word) => memo.includes(word))) {
    reasons.push("사치 키워드");
  }
  if (category === "쇼핑") reasons.push("사치성 카테고리");

  return {
    isEmotional: reasons.length > 0,
    reasons,
  };
};
