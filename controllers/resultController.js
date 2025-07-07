const { analyzeExpense } = require("../services/gemini");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

// 감정 분석이 안 된 소비 항목 자동 분석 함수
async function analyzeUnprocessedExpenses(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT e.expense_id, e.memo, e.amount, e.spent_at, c.category_name
       FROM expenses e
       JOIN categories c ON e.category_id = c.category_id
       WHERE e.id = ?
       AND e.expense_id NOT IN (SELECT expense_id FROM emotional_feedback)`,
      [userId],
      async (err, rows) => {
        if (err) {
          console.error("분석할 항목 조회 실패:", err);
          return reject(err);
        }

        for (const row of rows) {
          try {
            const result = await analyzeExpense({
              expense_id: row.expense_id,
              id: userId,
              category_name: row.category_name,
              memo: row.memo,
              amount: row.amount,
              spent_at: row.spent_at
            });

            db.run(
              `INSERT INTO emotional_feedback (expense_id, is_emotional, emotional_reason, feedback)
               VALUES (?, ?, ?, ?)`,
              [
                row.expense_id,
                result.is_emotional ? 1 : 0,
                result.emotional_reason || "",
                result.feedback || ""
              ],
              (err) => {
                if (err) console.error("분석 결과 저장 실패:", err);
              }
            );
          } catch (e) {
            console.error("Gemini 분석 오류:", e.message);
          }
        }

        resolve(); // 모든 처리 후 완료
      }
    );
  });
}

exports.renderResultPage = async (req, res) => {
  const userId = req.query.id || "test01"; // 추후 세션 연동 예정

  // 먼저 분석 실행
  await analyzeUnprocessedExpenses(userId);

  db.all(
    `
    SELECT 
      e.expense_id,
      c.category_name,
      e.memo,
      e.amount,
      e.spent_at,
      ef.is_emotional,
      ef.emotional_reason,
      ef.feedback
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    LEFT JOIN emotional_feedback ef ON e.expense_id = ef.expense_id
    WHERE e.id = ?
    ORDER BY e.spent_at DESC
    LIMIT 10
    `,
    [userId],
    (err, rows) => {
      if (err) {
        console.error("결과 불러오기 실패:", err);
        return res.status(500).send("서버 오류");
      }

      res.render("result", {
        userId: userId,
        results: rows,
      });
    }
  );
};
