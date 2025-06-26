// controllers/dashboardController.js
const db = require("../models/db");

exports.renderDashboard = (req, res) => {
  db.getSummary((err, summary) => {
    if (err) {
      console.error("Dashboard error:", err);
      return res.status(500).send("대시보드 로딩 중 오류 발생");
    }

    // summary에서 가져오는 값
    const { totalSpending, totalTransaction, emotionalSpends, newCategories } =
      summary;

    // ✅ 여기에 더미 데이터 임시 구성
    const topCategories = [
      { category: "Food", share: 45, colorClass: "blue" },
      { category: "Shopping", share: 30, colorClass: "green" },
      { category: "Transport", share: 25, colorClass: "yellow" },
    ];

    const emotionalData = [30, 20, 50, 10, 40, 60, 25];
    const totalData = [100, 120, 90, 130, 110, 140, 100];
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const monthlyTotals = [500, 600, 450, 700, 650, 800];

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
