// controllers/resultController.js
exports.renderResultPage = (req, res) => {
  res.render("result", { message: "감정 소비 분석 결과입니다." });
};
