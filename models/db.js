const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      category TEXT,
      amount INTEGER CHECK(amount >= 0),
      memo TEXT,
      type TEXT,
      isEmotional BOOLEAN,
      emotion TEXT,
      reasons TEXT
    )
  `);
});

db.getSummary = function (callback) {
  db.all("SELECT * FROM expenses", (err, rows) => {
    if (err) return callback(err);

    const totalSpending = rows
      .filter((row) => row.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalTransaction = rows.length;
    const emotionalSpends = rows.filter((row) => row.isEmotional).length;

    const categorySet = new Set();
    rows.forEach((row) => categorySet.add(row.category));
    const newCategories = categorySet.size;

    callback(null, {
      totalSpending,
      totalTransaction,
      emotionalSpends,
      newCategories,
    });
  });
};

exports.renderDashboard = (req, res) => {
  db.all("SELECT * FROM expenses", (err, rows) => {
    if (err) return res.status(500).send("❌ DB 에러");

    // 통계 정보
    const totalSpending = rows
      .filter((r) => r.type === "expense")
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalTransaction = rows.length;
    const emotionalSpends = rows.filter((r) => r.isEmotional).length;
    const newCategories = [...new Set(rows.map((r) => r.category))].length;

    // topCategories 계산 (상위 5개 카테고리 비율)
    const categoryTotals = {};
    rows.forEach((r) => {
      if (r.type === "expense") {
        categoryTotals[r.category] =
          (categoryTotals[r.category] || 0) + Number(r.amount);
      }
    });
    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const topCategories = sorted.slice(0, 5).map(([category, amount], i) => ({
      category,
      share: ((amount / total) * 100).toFixed(1),
      colorClass: `bar-color-${i % 5}`,
    }));

    // 주간 차트용 데이터
    const week = [...Array(7)].map((_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - i));
      return day.toISOString().split("T")[0];
    });

    const emotionalData = week.map((d) =>
      rows
        .filter((r) => r.date.startsWith(d) && r.isEmotional)
        .reduce((sum, r) => sum + Number(r.amount), 0)
    );
    const totalData = week.map((d) =>
      rows
        .filter((r) => r.date.startsWith(d))
        .reduce((sum, r) => sum + Number(r.amount), 0)
    );

    // 월간 선형 그래프용 데이터
    const monthGroups = {};
    rows.forEach((r) => {
      if (r.type === "expense") {
        const month = r.date.slice(0, 7); // YYYY-MM
        monthGroups[month] = (monthGroups[month] || 0) + Number(r.amount);
      }
    });
    const monthLabels = Object.keys(monthGroups).sort();
    const monthlyTotals = monthLabels.map((m) => monthGroups[m]);

    res.render("dashboard", {
      totalSpending,
      totalTransaction,
      emotionalSpends,
      newCategories,
      topCategories,
      emotionalData,
      totalData,
      monthLabels,
      monthlyTotals,
    });
  });
};
module.exports = db;
