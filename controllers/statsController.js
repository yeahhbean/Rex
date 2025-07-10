const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.renderStatsPage = (req, res) => {
  const userId = req.session.userId;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const currentMonth = `${yyyy}년 ${mm}월`;

  const stats = {
    totalSpending: 0,
    totalTransaction: 0,
    emotionalSpends: 0,
    categoryStats: [],
    newCategories: 0,
  };

  db.all(`SELECT * FROM expenses WHERE id = ?`, [userId], (err, allRows) => {
    if (err) return res.status(500).send("지출 데이터 오류");

    stats.totalSpending = allRows.reduce((sum, r) => sum + r.amount, 0);
    stats.totalTransaction = allRows.length;
    const categorySet = new Set(allRows.map((r) => r.category_id));
    stats.newCategories = categorySet.size;

    const emotionalData = [0, 0, 0, 0, 0, 0, 0];
    const totalData = [0, 0, 0, 0, 0, 0, 0];

    for (const row of allRows) {
      const day = new Date(row.spent_at).getDay();
      totalData[day] += row.amount;
    }

    db.all(
      `
      SELECT ef.expense_id, e.spent_at, e.amount
      FROM emotional_feedback ef
      JOIN expenses e ON ef.expense_id = e.expense_id
      WHERE e.id = ? AND ef.is_emotional = 1
    `,
      [userId],
      (err2, emotionalRows) => {
        if (!err2) {
          stats.emotionalSpends = emotionalRows.length;
          for (const row of emotionalRows) {
            const day = new Date(row.spent_at).getDay();
            emotionalData[day] += row.amount;
          }
        }

        const otherData = totalData.map((t, i) => t - emotionalData[i]);

        db.all(
          `
          SELECT c.category_name, SUM(e.amount) as total
          FROM expenses e
          JOIN categories c ON e.category_id = c.category_id
          WHERE e.id = ? AND e.type = 'expense'
          GROUP BY e.category_id
        `,
          [userId],
          (err3, categoryRows) => {
            stats.categoryStats = categoryRows || [];

            db.get(
              `
              SELECT SUM(amount) as total
              FROM expenses
              WHERE id = ? AND strftime('%Y-%m', spent_at) = ?
            `,
              [userId, `${yyyy}-${mm}`],
              (err4, rowThisMonth) => {
                const totalThisMonth = rowThisMonth?.total || 0;

                const lastMonth = new Date(yyyy, now.getMonth() - 1, 1);
                const lastYYYY = lastMonth.getFullYear();
                const lastMM = String(lastMonth.getMonth() + 1).padStart(
                  2,
                  "0"
                );

                db.get(
                  `
                  SELECT SUM(amount) as total
                  FROM expenses
                  WHERE id = ? AND strftime('%Y-%m', spent_at) = ?
                `,
                  [userId, `${lastYYYY}-${lastMM}`],
                  (err5, rowLastMonth) => {
                    const totalLastMonth = rowLastMonth?.total || 0;

                    const monthComparison = totalLastMonth
                      ? (
                          ((totalThisMonth - totalLastMonth) / totalLastMonth) *
                          100
                        ).toFixed(1)
                      : "N/A";

                    const monthComparisonStr =
                      monthComparison === "N/A" ? "N/A" : `${monthComparison}%`;

                    db.get(
                      `
                      SELECT SUM(e.amount) as total
                      FROM emotional_feedback ef
                      JOIN expenses e ON ef.expense_id = e.expense_id
                      WHERE e.id = ? AND ef.is_emotional = 1
                    `,
                      [userId],
                      (err6, emoRow) => {
                        const emotionalTotal = emoRow?.total || 0;
                        const emotionalRate = stats.totalSpending
                          ? (
                              (emotionalTotal / stats.totalSpending) *
                              100
                            ).toFixed(1)
                          : 0;

                        const emotionalRateStr = `${emotionalRate}%`;

                        db.get(
                          `
                          SELECT c.category_name AS name, SUM(e.amount) AS amount
                          FROM expenses e
                          JOIN categories c ON e.category_id = c.category_id
                          WHERE e.id = ? AND e.type = 'expense'
                          GROUP BY e.category_id
                          ORDER BY amount DESC
                          LIMIT 1
                        `,
                          [userId],
                          (err7, topRow) => {
                            const topCategory = topRow || {
                              name: "없음",
                              amount: 0,
                            };

                            db.all(
                              `
                              SELECT strftime('%Y-%m', spent_at) as ym, SUM(amount) as total
                              FROM expenses
                              WHERE id = ?
                              GROUP BY ym
                              ORDER BY ym DESC
                              LIMIT 6
                            `,
                              [userId],
                              (err8, monthRows) => {
                                monthRows.reverse();
                                const monthLabels = monthRows.map((r) => {
                                  const [y, m] = r.ym.split("-");
                                  return `${m}월`;
                                });
                                const monthData = monthRows.map((r) => r.total);

                                const categoryLabels = stats.categoryStats.map(
                                  (r) => r.category_name
                                );
                                const categoryData = stats.categoryStats.map(
                                  (r) => r.total
                                );

                                res.render("stats", {
                                  currentMonth,
                                  totalThisMonthStr:
                                    totalThisMonth.toLocaleString(),
                                  monthComparisonStr,
                                  topCategory,
                                  topCategoryAmountStr:
                                    topCategory.amount.toLocaleString(),
                                  emotionalTotalStr:
                                    emotionalTotal.toLocaleString(),
                                  emotionalRateStr,
                                  monthLabels,
                                  monthData,
                                  categoryLabels,
                                  categoryData,
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
          }
        );
      }
    );
  });
};
