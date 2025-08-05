const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.renderStatsPage = (req, res) => {
  const userId = req.user.id;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const currentMonth = `${yyyy}년 ${mm}월`;

  const getWeekRange = (today) => {
    const day = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - day);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return [startOfWeek, endOfWeek];
  };

  const [thisStart, thisEnd] = getWeekRange(new Date());
  const [lastStart, lastEnd] = [
    new Date(thisStart.getTime() - 7 * 86400000),
    new Date(thisEnd.getTime() - 7 * 86400000),
  ];

  const formatDate = (d) => d.toISOString().slice(0, 10);
  const thisStartStr = formatDate(thisStart);
  const thisEndStr = formatDate(thisEnd);
  const lastStartStr = formatDate(lastStart);
  const lastEndStr = formatDate(lastEnd);

  const thisWeekRange = `${thisStartStr} ~ ${thisEndStr}`;

  const stats = {
    totalSpending: 0,
    totalTransaction: 0,
    emotionalSpends: 0,
    categoryStats: [],
    newCategories: 0,
  };

  db.all(
    `SELECT * FROM expenses 
   WHERE id = ? AND type = 'expense' 
   AND spent_at BETWEEN ? AND ?`,
    [userId, thisStartStr, thisEndStr],
    (err, allRows) => {
      if (err) return res.status(500).send("지출 데이터 오류");

      stats.totalSpending = allRows.reduce((sum, r) => sum + r.amount, 0);
      stats.totalTransaction = allRows.length;
      const categorySet = new Set(allRows.map((r) => r.category_id));
      stats.newCategories = categorySet.size;

      const weeklyLabels = ["일", "월", "화", "수", "목", "금", "토"];
      const emotionalWeeklyData = Array(7).fill(0);
      const totalWeeklyData = Array(7).fill(0);

      for (const row of allRows) {
        const date = new Date(row.spent_at);
        const day = date.getDay();
        if (row.type === "expense") {
          totalWeeklyData[day] += row.amount;
        }
      }

      db.all(
        `
      SELECT ef.expense_id, e.spent_at, e.amount
FROM emotional_feedback ef
JOIN expenses e ON ef.expense_id = e.expense_id
WHERE e.id = ? AND ef.is_emotional = 1
AND e.spent_at BETWEEN ? AND ?
    `,
        [userId, thisStartStr, thisEndStr],
        (err2, emotionalRows) => {
          if (!err2) {
            stats.emotionalSpends = emotionalRows.length;
            for (const row of emotionalRows) {
              const day = new Date(row.spent_at).getDay();
              emotionalWeeklyData[day] += row.amount;
            }
          }

          db.get(
            `
        SELECT SUM(amount) as total FROM expenses
        WHERE id = ? AND type = 'expense' AND spent_at BETWEEN ? AND ?
      `,
            [userId, thisStartStr, thisEndStr],
            (err3, row1) => {
              const thisWeekExpense = row1?.total || 0;

              db.get(
                `
          SELECT SUM(amount) as total FROM expenses
          WHERE id = ? AND type = 'expense' AND spent_at BETWEEN ? AND ?
        `,
                [userId, lastStartStr, lastEndStr],
                (err4, row2) => {
                  const lastWeekExpense = row2?.total || 0;
                  const weekChange =
                    lastWeekExpense > 0
                      ? (
                          ((thisWeekExpense - lastWeekExpense) /
                            lastWeekExpense) *
                          100
                        ).toFixed(1)
                      : "N/A";

                  db.all(
                    `
            SELECT c.category_name, SUM(e.amount) as total
            FROM expenses e
            JOIN categories c ON e.category_id = c.category_id
            WHERE e.id = ? AND e.type = 'expense'
            GROUP BY e.category_id
          `,
                    [userId],
                    (err5, categoryRows) => {
                      stats.categoryStats = categoryRows || [];

                      db.get(
                        `
              SELECT SUM(amount) as total
              FROM expenses
              WHERE id = ? AND strftime('%Y-%m', spent_at) = ?
            `,
                        [userId, `${yyyy}-${mm}`],
                        (err6, rowThisMonth) => {
                          const totalThisMonth = rowThisMonth?.total || 0;
                          const lastMonth = new Date(
                            yyyy,
                            now.getMonth() - 1,
                            1
                          );
                          const lastYYYY = lastMonth.getFullYear();
                          const lastMM = String(
                            lastMonth.getMonth() + 1
                          ).padStart(2, "0");

                          db.get(
                            `
                SELECT SUM(amount) as total
                FROM expenses
                WHERE id = ? AND strftime('%Y-%m', spent_at) = ?
              `,
                            [userId, `${lastYYYY}-${lastMM}`],
                            (err7, rowLastMonth) => {
                              const totalLastMonth = rowLastMonth?.total || 0;
                              const monthComparison =
                                totalLastMonth > 0
                                  ? (
                                      ((totalThisMonth - totalLastMonth) /
                                        totalLastMonth) *
                                      100
                                    ).toFixed(1)
                                  : "N/A";
                              const monthComparisonStr =
                                monthComparison === "N/A"
                                  ? "N/A"
                                  : `${monthComparison}%`;
                              db.get(
                                `
                  SELECT SUM(e.amount) as total
                  FROM emotional_feedback ef
                  JOIN expenses e ON ef.expense_id = e.expense_id
                  WHERE e.id = ? AND ef.is_emotional = 1
                `,
                                [userId],
                                (err8, emoRow) => {
                                  const emotionalTotal = emoRow?.total || 0;
                                  const emotionalRate =
                                    stats.totalSpending > 0
                                      ? (
                                          (emotionalTotal /
                                            stats.totalSpending) *
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
                                  AND e.spent_at BETWEEN ? AND ?
                                  GROUP BY e.category_id
                                  ORDER BY amount DESC
                                  LIMIT 1
                                `,
                                    [userId, thisStartStr, thisEndStr],
                                    (err9, topRow) => {
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
                                        (err10, monthRows) => {
                                          monthRows.reverse();
                                          const monthLabels = monthRows.map(
                                            (r) => `${r.ym.split("-")[1]}월`
                                          );
                                          const monthData = monthRows.map(
                                            (r) => r.total
                                          );

                                          const categoryLabels =
                                            stats.categoryStats.map(
                                              (r) => r.category_name
                                            );
                                          const categoryData =
                                            stats.categoryStats.map(
                                              (r) => r.total
                                            );

                                          db.get(
                                            `SELECT SUM(e.amount) as total
   FROM emotional_feedback ef
   JOIN expenses e ON ef.expense_id = e.expense_id
   WHERE e.id = ? AND ef.is_emotional = 1
     AND e.spent_at BETWEEN ? AND ?`,
                                            [userId, thisStartStr, thisEndStr],
                                            (err11, thisWeekEmoRow) => {
                                              const thisWeekEmoTotal =
                                                thisWeekEmoRow?.total || 0;

                                              db.get(
                                                `SELECT SUM(e.amount) as total
       FROM emotional_feedback ef
       JOIN expenses e ON ef.expense_id = e.expense_id
       WHERE e.id = ? AND ef.is_emotional = 1
         AND e.spent_at BETWEEN ? AND ?`,
                                                [
                                                  userId,
                                                  lastStartStr,
                                                  lastEndStr,
                                                ],
                                                (err12, lastWeekEmoRow) => {
                                                  const lastWeekEmoTotal =
                                                    lastWeekEmoRow?.total || 0;

                                                  const changeRatio =
                                                    lastWeekEmoTotal > 0
                                                      ? (
                                                          ((thisWeekEmoTotal -
                                                            lastWeekEmoTotal) /
                                                            lastWeekEmoTotal) *
                                                          100
                                                        ).toFixed(1)
                                                      : "N/A";

                                                  const emotionalChangeRatioStr =
                                                    changeRatio === "N/A"
                                                      ? "N/A"
                                                      : `${changeRatio}%`;
                                                  const emotionalThisWeekStr =
                                                    thisWeekEmoTotal.toLocaleString();

                                                  //render 안에 추가
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
                                                    emotionalThisWeekStr,
                                                    emotionalChangeRatioStr,
                                                    monthLabels,
                                                    monthData,
                                                    weeklyLabels,
                                                    emotionalWeeklyData,
                                                    totalWeeklyData,
                                                    categoryLabels,
                                                    categoryData,
                                                    thisWeekRange,
                                                    thisWeekExpenseStr:
                                                      thisWeekExpense.toLocaleString(),
                                                    weekChangeStr:
                                                      weekChange === "N/A"
                                                        ? "N/A"
                                                        : `${weekChange}%`,
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
};
