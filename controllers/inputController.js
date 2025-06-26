const db = require("../models/db");

exports.renderInputForm = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const itemsPerPage = 10;

  db.all("SELECT * FROM expenses ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).send("❌ DB 오류");

    const now = new Date();
    const weekAgo = new Date(now);
    const twoWeeksAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    twoWeeksAgo.setDate(now.getDate() - 14);

    const thisWeekTotal = rows
      .filter((row) => row.type === "expense" && new Date(row.date) >= weekAgo)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const lastWeekTotal = rows
      .filter(
        (row) =>
          row.type === "expense" &&
          new Date(row.date) >= twoWeeksAgo &&
          new Date(row.date) < weekAgo
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalSpending = thisWeekTotal;

    let compareMessage = "Add your data!";
    if (lastWeekTotal > 0) {
      const percent = (
        ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) *
        100
      ).toFixed(1);
      compareMessage = (percent >= 0 ? "+" : "") + percent + "% from last week";
    }

    const emotionalCount = rows.filter((row) => row.isEmotional).length;

    // 페이지네이션 처리
    const totalItems = rows.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedItems = rows.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage
    );

    res.render("input", {
      items: paginatedItems,
      totalSpending,
      emotionalCount,
      compareMessage,
      currentPage: page,
      totalPages,
    });
  });
};

exports.submitExpense = (req, res) => {
  const { date, category, amount, memo, type } = req.body;

  // amount 0 이상만 허용
  if (!amount || Number(amount) < 0) {
    return res.status(400).send("❌ 금액은 0 이상이어야 합니다.");
  }

  const query = `
    INSERT INTO expenses (date, category, amount, memo, type, isEmotional, emotion, reasons)
    VALUES (?, ?, ?, ?, ?, 0, '', '')
  `;
  const values = [date, category, amount, memo, type];

  db.run(query, values, (err) => {
    if (err) return res.status(500).send("❌ 저장 실패");
    res.redirect("/input");
  });
};

exports.deleteExpense = (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM expenses WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).send("삭제 실패");
    res.redirect("/input");
  });
};
