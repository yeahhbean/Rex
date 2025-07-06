const { db } = require("../db");

exports.renderDashboard = (req, res) => {
  const userId = req.query.id || "test01";

  const data = {
    totalSpending: 0,
    totalTransaction: 0,
    emotionalSpends: 0,
    newCategories: 0,
    topCategories: [],
    emotionalData: [0, 0, 0, 0, 0, 0, 0],
    totalData: [0, 0, 0, 0, 0, 0, 0],
    monthLabels: [],
    monthlyTotals: [],
  };

  const expensesQuery = `
    SELECT e.expense_id, e.amount, e.memo, e.spent_at, e.type, c.category_name, e.category_id
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    WHERE e.id = ?
    ORDER BY e.spent_at DESC
  `;

  db.all(expensesQuery, [userId], (err, items) => {
    if (err) return res.send("지출 데이터 오류");

    data.totalTransaction = items.length;
    data.totalSpending = items
      .filter((i) => i.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    data.newCategories = new Set(items.map((i) => i.category_name)).size;

    // 요일별 합계
    for (const e of items) {
      const date = new Date(e.spent_at);
      const day = date.getDay();
      if (e.type === "expense") data.totalData[day] += Number(e.amount);
    }

    const emotionalCountQuery = `
      SELECT ef.expense_id, e.spent_at
      FROM emotional_feedback ef
      JOIN expenses e ON ef.expense_id = e.expense_id
      WHERE e.id = ? AND ef.is_emotional = 1
    `;

    db.all(emotionalCountQuery, [userId], (err2, emotions) => {
      if (err2) return res.send("감정 분석 오류");

      data.emotionalSpends = emotions.length;

      for (const ef of emotions) {
        const date = new Date(ef.spent_at);
        const day = date.getDay();
        const exp = items.find((e) => e.expense_id === ef.expense_id);
        if (exp) data.emotionalData[day] += Number(exp.amount);
      }

      const topCategoriesQuery = `
        SELECT c.category_name AS category,
               SUM(e.amount) AS total_amount
        FROM expenses e
        JOIN categories c ON e.category_id = c.category_id
        WHERE e.id = ? AND e.type = 'expense'
        GROUP BY e.category_id
        ORDER BY total_amount DESC
        LIMIT 3
      `;

      db.all(topCategoriesQuery, [userId], (err3, topCats) => {
        if (err3) return res.send("카테고리 오류");

        const totalSpending = data.totalSpending;
        data.topCategories = topCats.map((cat, i) => {
          const totalAmount = Number(cat.total_amount);
          const percentage =
            totalSpending > 0
              ? Math.round((totalAmount / totalSpending) * 100)
              : 0;
          return {
            category: cat.category,
            share: percentage,
            sales: `${totalAmount.toLocaleString()}원`,
          };
        });

        const monthQuery = `
          SELECT strftime('%Y-%m', spent_at) as ym, SUM(amount) as total
          FROM expenses
          WHERE id = ?
          GROUP BY ym
          ORDER BY ym DESC
          LIMIT 6
        `;

        db.all(monthQuery, [userId], (err4, monthly) => {
          if (err4) return res.send("월별 통계 오류");

          monthly.reverse();
          data.monthLabels = monthly.map((row) => row.ym.split("-")[1] + "월");
          data.monthlyTotals = monthly.map((row) => row.total);

          res.render("dashboard", data);
        });
      });
    });
  });
};
