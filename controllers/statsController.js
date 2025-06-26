const db = require("../models/db");

exports.renderStatsPage = (req, res) => {
  db.all("SELECT * FROM expenses", (err, rows) => {
    if (err) return res.status(500).send("DB 오류");

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthGroups = {};
    const currentMonthCategories = {};
    const categoryTotals = {};

    rows.forEach((r) => {
      if (r.type === "expense") {
        const month = r.date.slice(0, 7);
        monthGroups[month] = (monthGroups[month] || 0) + Number(r.amount);

        categoryTotals[r.category] =
          (categoryTotals[r.category] || 0) + Number(r.amount);

        if (month === currentMonth) {
          currentMonthCategories[r.category] =
            (currentMonthCategories[r.category] || 0) + Number(r.amount);
        }
      }
    });

    // top category
    const sortedCategories = Object.entries(currentMonthCategories).sort(
      (a, b) => b[1] - a[1]
    );
    const topCategory = sortedCategories.length
      ? {
          name: sortedCategories[0][0],
          amount: sortedCategories[0][1].toFixed(2),
        }
      : { name: "N/A", amount: "0.00" };

    // 월간 비교
    const monthLabels = Object.keys(monthGroups).sort();
    const monthlyTotals = monthLabels.map((m) => monthGroups[m]);

    const [year, month] = currentMonth.split("-");
    const prevMonthDate = new Date(Number(year), Number(month) - 2);
    const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
    const currentMonthTotal = monthGroups[currentMonth] || 0;
    const prevMonthTotal = monthGroups[prevMonthStr] || 1;

    const monthComparison = (
      ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) *
      100
    ).toFixed(1);

    // 감정 소비
    const emotionalTotal = rows
      .filter(
        (r) =>
          r.type === "expense" &&
          r.date.slice(0, 7) === currentMonth &&
          r.isEmotional
      )
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpenseThisMonth = rows
      .filter(
        (r) => r.type === "expense" && r.date.slice(0, 7) === currentMonth
      )
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const emotionalRate = totalExpenseThisMonth
      ? ((emotionalTotal / totalExpenseThisMonth) * 100).toFixed(1)
      : "0.0";

    // 차트용 카테고리 데이터
    const categoryLabels = Object.keys(categoryTotals);
    const categoryData = categoryLabels.map((label) => categoryTotals[label]);

    res.render("stats", {
      monthLabels,
      monthlyTotals,
      currentMonth,
      totalThisMonth: currentMonthTotal.toFixed(2),
      monthComparison,
      topCategory,
      emotionalTotal: emotionalTotal.toFixed(2),
      emotionalRate,
      monthData: monthlyTotals, // 월별 차트용
      categoryLabels,
      categoryData, // 도넛 차트용
    });
  });
};
