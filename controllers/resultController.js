// ✅ controllers/resultController.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.renderResultPage = (req, res) => {
  const userId = req.session.userId;

  db.get(
    `SELECT nickname FROM user_profile WHERE id = ?`,
    [userId],
    (err2, profile) => {
      if (err2) {
        console.error("닉네임 조회 실패:", err2);
        return res.status(500).send("닉네임 오류");
      }

      const nickname = profile?.nickname || userId;

      db.all(
        `SELECT 
          e.expense_id,
          c.category_name,
          e.memo,
          e.amount,
          e.spent_at,
          ef.is_emotional,
          ef.feedback
        FROM expenses e
        JOIN categories c ON e.category_id = c.category_id
        LEFT JOIN emotional_feedback ef ON e.expense_id = ef.expense_id
        WHERE e.id = ?
        ORDER BY e.spent_at DESC
        LIMIT 10`,
        [userId],
        (err3, rows) => {
          if (err3) {
            console.error("결과 불러오기 실패:", err3);
            return res.status(500).send("서버 오류");
          }

          res.render("result", {
            userId,
            nickname,
            results: rows,
          });
        }
      );
    }
  );
};
