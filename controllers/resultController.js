const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.renderResultPage = (req, res) => {
  const userId = req.session.userId;

  db.all(
    `
    SELECT 
      e.expense_id,
      c.category_name,
      e.memo,
      e.amount,
      e.spent_at,
      ef.is_emotional,
      ef.emotional_reason
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
