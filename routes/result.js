const express = require("express");
const router = express.Router();
const { analyzeExpense } = require("../services/gemini");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

const { verifyToken } = require("./auth"); // 또는 middlewares/auth 위치에 따라 경로 조정

// 감정 분석이 안 된 소비 항목 자동 분석 함수
async function analyzeUnprocessedExpenses(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT e.expense_id, e.memo, e.amount, e.spent_at, c.category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.id = ? AND e.type = 'expense'
      AND e.expense_id NOT IN (SELECT expense_id FROM emotional_feedback)`,
      [userId],
      async (err, rows) => {
        if (err) {
          console.error("분석할 항목 조회 실패:", err);
          return reject(err);
        }

        for (const row of rows) {
          try {
            if (row.type && row.type !== "expense") continue;
            const result = await analyzeExpense({
              expense_id: row.expense_id,
              id: userId,
              category_name: row.category_name,
              memo: row.memo,
              amount: row.amount,
              spent_at: row.spent_at,
            });

            db.run(
              `INSERT INTO emotional_feedback (expense_id, is_emotional, feedback) VALUES (?, ?, ?)`,
              [
                row.expense_id,
                result.is_emotional ? 1 : 0,
                result.feedback || "", // 3개만 전달
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

// GET /result
router.get("/", verifyToken, async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.redirect("/auth/login");
  }

  const itemsPerPage = 10;
  const currentPage = parseInt(req.query.page) || 1;
  const offset = (currentPage - 1) * itemsPerPage;

  // 분석 안 된 항목이 존재하는지 확인
  db.get(
    `
    SELECT COUNT(*) as count
    FROM expenses e
    WHERE e.id = ? AND e.type = 'expense'
    AND e.expense_id NOT IN (SELECT expense_id FROM emotional_feedback)
  `,
    [userId],
    async (err, result) => {
      if (err) {
        console.error("분석 여부 확인 실패:", err);
        return res.status(500).send("서버 오류");
      }

      const unprocessedCount = result.count;
      if (unprocessedCount > 0) {
        await analyzeUnprocessedExpenses(userId);
      }

      // 닉네임 조회
      db.get(
        `SELECT nickname FROM user_profile WHERE id = ?`,
        [userId],
        (err2, profile) => {
          if (err2) {
            console.error("닉네임 조회 실패:", err2);
            return res.status(500).send("닉네임 오류");
          }

          const nickname = profile?.nickname || userId;

          // 전체 페이지 수 계산
          db.get(
            `
          SELECT COUNT(*) AS totalCount
          FROM expenses e
          WHERE e.id = ?
        `,
            [userId],
            (err4, countResult) => {
              if (err4) {
                console.error("전체 개수 조회 실패:", err4);
                return res.status(500).send("서버 오류");
              }

              const totalItems = countResult.totalCount;
              const totalPages = Math.ceil(totalItems / itemsPerPage);

              // 실제 페이지 데이터 조회
              db.all(
                `
                SELECT 
                  e.expense_id,
                  c.category_name,
                  e.memo,
                  e.amount,
                  e.spent_at,
                  ef.is_emotional,
                  ef.feedback
                FROM expenses e
                JOIN categories c ON e.category_id = c.category_id
                JOIN emotional_feedback ef ON e.expense_id = ef.expense_id
                WHERE e.id = ? AND e.type = 'expense'
                ORDER BY e.spent_at DESC
                LIMIT ? OFFSET ?
              `,
                [userId, itemsPerPage, offset],
                (err3, rows) => {
                  if (err3) {
                    console.error("결과 불러오기 실패:", err3);
                    return res.status(500).send("서버 오류");
                  }

                  res.render("result", {
                    userId,
                    nickname,
                    results: rows,
                    totalPages,
                    currentPage,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;
