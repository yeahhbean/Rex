const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

// 지출 입력 화면 렌더링
exports.renderInputPage = (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const perPage = 5;
  const offset = (page - 1) * perPage;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const startOfWeek = new Date();
  startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

  const endOfWeek = new Date();
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

  db.all(`SELECT * FROM categories`, (err, categories) => {
    if (err) return res.status(500).send("카테고리 불러오기 실패");

    db.all(
      `SELECT e.expense_id, e.memo, e.amount, e.spent_at AS date,
          c.category_name AS category, e.type
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.id = ?
      ORDER BY e.spent_at DESC
      LIMIT ? OFFSET ?`,
      [userId, perPage, offset],
      (err2, items) => {
        if (err2) return res.status(500).send("지출 내역 불러오기 실패");

        // [1] 주간 합계 쿼리
        db.get(
          `
  SELECT SUM(amount) AS total
  FROM expenses
  WHERE id = ? AND type = 'expense'
    AND spent_at BETWEEN ? AND ?
`,
          [userId, startOfWeekStr, endOfWeekStr],
          (err3, totalRow) => {
            if (err3) return res.status(500).send("주간 지출 총합 조회 실패");

            // [2] 전체 지출 개수 쿼리
            db.get(
              `
    SELECT COUNT(*) as count FROM expenses WHERE id = ?
  `,
              [userId],
              (err4, countRow) => {
                if (err4) return res.status(500).send("지출 개수 조회 실패");

                // [3] 감정 소비 전체
                db.get(
                  `
      SELECT COUNT(*) as count FROM emotional_feedback ef
      JOIN expenses e ON ef.expense_id = e.expense_id
      WHERE e.id = ? AND ef.is_emotional = 1
    `,
                  [userId],
                  (err5, emoRow) => {
                    if (err5)
                      return res.status(500).send("감정 소비 조회 실패");

                    // [4] 이번 주 감정 소비
                    db.get(
                      `
        SELECT COUNT(*) as count FROM emotional_feedback ef
        JOIN expenses e ON ef.expense_id = e.expense_id
        WHERE e.id = ? AND ef.is_emotional = 1
          AND e.spent_at BETWEEN ? AND ?
      `,
                      [userId, startOfWeekStr, endOfWeekStr],
                      (err6, emoWeekRow) => {
                        if (err6)
                          return res
                            .status(500)
                            .send("이번 주 감정 소비 조회 실패");

                        // [5] 최종 렌더링
                        res.render("input", {
                          userId,
                          categories,
                          items,
                          totalSpending: totalRow?.total || 0,
                          emotionalCount: emoRow?.count || 0,
                          emotionalWeeklyCount: emoWeekRow?.count || 0,
                          totalPages: Math.ceil(countRow.count / perPage),
                          currentPage: page,
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

// 지출 저장
exports.submitExpense = (req, res) => {
  const userId = req.user.id; // 세션 대신 JWT로부터 가져오기
  const {
    category_id,
    memo,
    amount,
    spent_at,
    type,
    isEmotional,
    emotion,
    reasons,
  } = req.body;

  db.run(
    `INSERT INTO expenses (id, category_id, memo, amount, spent_at, type)
   VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, category_id, memo, amount, spent_at, type],
    function (err) {
      if (err) {
        console.error("지출 저장 실패:", err);
        return res.status(500).send("지출 저장 실패");
      }

      const expenseId = this.lastID;

      // 감정 소비 체크 시 감정 데이터 추가
      if (isEmotional === "on") {
        db.run(
          `INSERT INTO emotional_feedback (expense_id, is_emotional, emotional_reason)
           VALUES (?, ?, ?)`,
          [expenseId, 1, reasons || emotion || "기타"],
          (err2) => {
            if (err2) console.error("감정 데이터 저장 실패:", err2);
            res.redirect("/input?id=" + userId);
          }
        );
      } else {
        res.redirect("/input?id=" + userId);
      }
    }
  );
};

// 지출 삭제
exports.deleteExpense = (req, res) => {
  const expenseId = req.params.id;

  db.run(
    `DELETE FROM expenses WHERE expense_id = ?`,
    [expenseId],
    function (err) {
      if (err) {
        console.error("삭제 실패:", err);
        return res.status(500).send("삭제 중 오류 발생");
      }

      res.redirect("/input"); // 삭제 후 목록으로 이동
    }
  );
};
