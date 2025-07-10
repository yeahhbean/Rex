const { db } = require("../db");

exports.renderDashboard = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.send(`<script>alert("로그인이 필요합니다."); location.href='/auth/login';</script>`);
  }

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
    thisMonthTotal: 0,
    changeRatioMonth: 0,
    yesterdayTotal: 0,
    changeRatioDay: 0,
    transactionCount: 0,
    changeRatioTx: 0,
  };

  // 오늘 기준
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth();
  const dd = today.getDate();

  // 최근 30일 (오늘 포함)
  const date30DaysAgo = new Date();
  date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
  const date30DaysAgoStr = date30DaysAgo.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  // 그 이전 30일 (즉, 31~60일 전)
  const date60DaysAgo = new Date();
  date60DaysAgo.setDate(date60DaysAgo.getDate() - 60);
  const date31DaysAgo = new Date();
  date31DaysAgo.setDate(date31DaysAgo.getDate() - 31);
  const date60DaysAgoStr = date60DaysAgo.toISOString().slice(0, 10);
  const date31DaysAgoStr = date31DaysAgo.toISOString().slice(0, 10);

  const yesterday = new Date(yyyy, mm, dd - 1).toISOString().slice(0, 10);
  const dayBefore = new Date(yyyy, mm, dd - 2).toISOString().slice(0, 10);

  // 1. 전체 expense + category
  const expensesQuery = `
    SELECT e.expense_id, e.amount, e.memo, e.spent_at, e.type, c.category_name, e.category_id
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    WHERE e.id = ?
    ORDER BY e.spent_at DESC
  `;

  db.all(expensesQuery, [userId], (err, items) => {
    if (err) return res.send("지출 데이터 오류");

    const expenseItems = items.filter((i) => i.type === "expense");
    // 최근 30일 소비 합계
    data.thisMonthTotal = expenseItems
      .filter((e) => e.spent_at >= date30DaysAgoStr && e.spent_at <= todayStr)
      .reduce((sum, e) => sum + e.amount, 0);

    // 그 전 30일 소비 합계
    const lastMonthTotal = expenseItems
      .filter(
        (e) => e.spent_at >= date60DaysAgoStr && e.spent_at <= date31DaysAgoStr
      )
      .reduce((sum, e) => sum + e.amount, 0);

    // 증감액
    data.changeAmountMonth = data.thisMonthTotal - lastMonthTotal;
    data.changeRatioMonth =
      lastMonthTotal > 0
        ? Math.round((data.changeAmountMonth / lastMonthTotal) * 100)
        : 0;
    data.totalTransaction = items.length;
    data.totalSpending = expenseItems.reduce((sum, i) => sum + i.amount, 0);
    data.newCategories = new Set(items.map((i) => i.category_name)).size;

    // 전체 항목 (수입 + 지출)
    for (const e of items) {
      const day = new Date(e.spent_at).getDay();
      data.totalData[day] += e.amount * (e.type === "expense" ? 1 : -1); // 지출은 +, 수입은 -로 표현 가능
    }

    const yItems = expenseItems.filter(
      (e) => new Date(e.spent_at).toISOString().slice(0, 10) === yesterday
    );
    const dbItems = expenseItems.filter(
      (e) => new Date(e.spent_at).toISOString().slice(0, 10) === dayBefore
    );

    data.yesterdayTotal = yItems.reduce((sum, e) => sum + e.amount, 0);
    const dayBeforeTotal = dbItems.reduce((sum, e) => sum + e.amount, 0);

    // 변화량 계산 (원 단위)
    data.changeRatioDay = data.yesterdayTotal - dayBeforeTotal;

    data.transactionCount = expenseItems.filter(
      (e) => e.spent_at >= date30DaysAgoStr && e.spent_at <= todayStr
    ).length;

    const lastMonthTxCount = expenseItems.filter(
      (e) => e.spent_at >= date60DaysAgoStr && e.spent_at <= date31DaysAgoStr
    ).length;

    data.changeRatioTx =
      lastMonthTxCount > 0
        ? Math.round(
            ((data.transactionCount - lastMonthTxCount) / lastMonthTxCount) *
              100
          )
        : 0;

    // 2. 감정 지출
    const emotionalQuery = `
      SELECT ef.expense_id, e.spent_at
      FROM emotional_feedback ef
      JOIN expenses e ON ef.expense_id = e.expense_id
      WHERE e.id = ? AND ef.is_emotional = 1
    `;

    db.all(emotionalQuery, [userId], (err2, emotions) => {
      if (err2) return res.send("감정 분석 오류");

      data.emotionalSpends = emotions.length;

      for (const ef of emotions) {
        const exp = items.find((e) => e.expense_id === ef.expense_id);
        const day = new Date(ef.spent_at).getDay();
        if (exp) data.emotionalData[day] += exp.amount;
      }

      // 3. 카테고리 상위 3개
      const topQuery = `
        SELECT c.category_name AS category, SUM(e.amount) AS total_amount
        FROM expenses e
        JOIN categories c ON e.category_id = c.category_id
        WHERE e.id = ? AND e.type = 'expense'
        GROUP BY e.category_id
        ORDER BY total_amount DESC
        LIMIT 3
      `;

      db.all(topQuery, [userId], (err3, topCats) => {
        if (err3) return res.send("카테고리 오류");

        data.topCategories = topCats.map((cat) => {
          const totalAmount = Number(cat.total_amount);
          return {
            category: cat.category,
            share:
              data.totalSpending > 0
                ? Math.round((totalAmount / data.totalSpending) * 100)
                : 0,
            sales: `${totalAmount.toLocaleString()}원`,
          };
        });

        // 4. 월별 통계
        const monthQuery = `
          SELECT strftime('%Y-%m', spent_at) as ym, SUM(amount) as total
          FROM expenses
          WHERE id = ? AND type = 'expense'
          GROUP BY ym
          ORDER BY ym DESC
          LIMIT 6
        `;

        db.all(monthQuery, [userId], (err4, monthly) => {
          if (err4) return res.send("월별 통계 오류");

          monthly.reverse();
          data.monthLabels = monthly.map((row) => row.ym.split("-")[1] + "월");
          data.monthlyTotals = monthly.map((row) => row.total);

          // 가장 최근 지출 항목 1건
          const recentExpense = expenseItems.find((e) => e.spent_at);
          if (recentExpense) {
            data.lastSpending = recentExpense.amount;
          } else {
            data.lastSpending = 0;
          }

          res.render("dashboard", data);
        });
      });
    });
  });
};
