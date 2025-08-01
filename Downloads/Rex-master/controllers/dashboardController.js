const { db } = require("../db");

exports.renderDashboard = (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return res.send(
      `<script>alert("로그인이 필요합니다."); location.href='/auth/login';</script>`
    );
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
    thisMonthIncome: 0,
    changeRatioMonth: 0,
    yesterdayTotal: 0,
    changeRatioDay: 0,
    transactionCount: 0,
    changeRatioTx: 0,
    lastSpendingAmount: 0,
    lastSpendingCategory: "",
    emotionalChangeRatio: 0,
    emotionalSpendRatio: 0,
    emotionalFeedback: "😐", // 또는 기본 이모지
  };

  // 한국 시간 기준 (KST)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const yyyy = kstNow.getFullYear();
  const mm = kstNow.getMonth();

  // 이번 달 시작, 끝
  const startOfMonth = new Date(yyyy, mm, 1).toISOString().slice(0, 10);
  const endOfMonth = new Date(yyyy, mm + 1, 0).toISOString().slice(0, 10);

  // 오늘 날짜 문자열
  const todayStr = kstNow.toISOString().slice(0, 10);

  // 어제, 그제
  const yesterday = new Date(
    Date.now() + 9 * 60 * 60 * 1000 - 1 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const dayBefore = new Date(
    Date.now() + 9 * 60 * 60 * 1000 - 2 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  // 30일 전, 31일 전, 60일 전
  const date30DaysAgoStr = new Date(
    Date.now() + 9 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const date31DaysAgoStr = new Date(
    Date.now() + 9 * 60 * 60 * 1000 - 31 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  const date60DaysAgoStr = new Date(
    Date.now() + 9 * 60 * 60 * 1000 - 60 * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

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

    const incomeItems = items.filter((i) => i.type === "income");
    const thisMonthStr = kstNow.toISOString().slice(0, 7); // "2025-07"

    const expenseItems = items.filter((i) => i.type === "expense");
    const startDate = new Date(startOfMonth);
    const endDate = new Date(endOfMonth);
    // 최근 30일 소비 합계
    data.thisMonthTotal = expenseItems
      .filter((e) => e.spent_at.startsWith(thisMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);

    data.thisMonthIncome = incomeItems
      .filter((e) => e.spent_at.startsWith(thisMonthStr))
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
    // 감정 지출 데이터
    const emotionalQuery = `
  SELECT ef.expense_id, e.spent_at
  FROM emotional_feedback ef
  JOIN expenses e ON ef.expense_id = e.expense_id
  WHERE e.id = ? AND ef.is_emotional = 1
`;

    db.all(emotionalQuery, [userId], (err2, emotions) => {
      if (err2) return res.send("감정 분석 오류");

      // 이번 달 감정 소비
      const thisMonthEmotions = emotions.filter(
        (e) => e.spent_at >= startOfMonth && e.spent_at <= endOfMonth
      );

      // 저번 달 감정 소비
      const lastMonthEmotions = emotions.filter(
        (e) => e.spent_at >= date60DaysAgoStr && e.spent_at <= date31DaysAgoStr
      );

      data.emotionalSpends = thisMonthEmotions.length;

      const lastCount = lastMonthEmotions.length;
      const thisCount = data.emotionalSpends;

      data.emotionalChangeRatio =
        lastCount > 0
          ? Math.round(((thisCount - lastCount) / lastCount) * 100)
          : 0;

      // 요일별 그래프용 집계
      for (const ef of thisMonthEmotions) {
        const exp = items.find((e) => e.expense_id === ef.expense_id);
        const day = new Date(ef.spent_at).getDay();
        if (exp) data.emotionalData[day] += exp.amount;
      }

      // 다음 단계로 계속 진행...
      // 감정 소비 총액 계산
      const emotionalSpendTotal = thisMonthEmotions.reduce((sum, ef) => {
        const exp = items.find((e) => e.expense_id === ef.expense_id);
        return exp ? sum + exp.amount : sum;
      }, 0);

      // 감정 소비 비율 (%)
      const emotionalRatio =
        data.thisMonthTotal > 0
          ? Math.round((emotionalSpendTotal / data.thisMonthTotal) * 100)
          : null;

      data.emotionalSpendRatio = emotionalRatio ?? 0;

      // 이모지 평가 (5단계 기준)
      if (emotionalRatio === null) {
        data.emotionalFeedback = "😍😍😍😍😍"; // 디폴트는 5점짜리
      } else if (emotionalRatio <= 10) {
        data.emotionalFeedback = "😍😍😍😍😍";
      } else if (emotionalRatio <= 20) {
        data.emotionalFeedback = "☺️☺️☺️";
      } else if (emotionalRatio <= 30) {
        data.emotionalFeedback = "🙂🙂🙂";
      } else if (emotionalRatio <= 50) {
        data.emotionalFeedback = "🥺🥺";
      } else {
        data.emotionalFeedback = "🤮";
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

        data.top3Categories = topCats.map((cat) => ({
          category: cat.category,
          amount: Number(cat.total_amount),
        }));

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
          const sortedExpenses = expenseItems
            .filter((e) => e.spent_at)
            .sort((a, b) => new Date(b.spent_at) - new Date(a.spent_at));

          const last = sortedExpenses[0];

          if (last) {
            data.lastSpendingAmount = last.amount;
            data.lastSpendingCategory = last.category_name;
          }

          res.render("dashboard", {
            ...data,
            top3Categories: data.top3Categories,
          });
        });
      });
    });
  });
};
