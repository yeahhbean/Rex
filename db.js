const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const DB_PATH = path.join(__dirname, "expenses.db");
console.log("DB 경로:", DB_PATH);

const db = new sqlite3.Database(DB_PATH);

function initDB() {
  return new Promise((resolve, reject) => {
    const dbExists = fs.existsSync(DB_PATH);

    db.serialize(() => {
      db.exec(
        `
        CREATE TABLE IF NOT EXISTS categories (
          category_id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS expenses (
          expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL,
          category_id INTEGER,
          type TEXT CHECK(type IN ('income', 'expense')) NOT NULL DEFAULT 'expense',
          amount INTEGER NOT NULL,
          memo TEXT,
          spent_at TEXT NOT NULL,
          FOREIGN KEY (category_id) REFERENCES categories(category_id)
        );
        CREATE TABLE IF NOT EXISTS emotional_feedback (
          feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
          expense_id INTEGER,
          is_emotional BOOLEAN,
          FOREIGN KEY (expense_id) REFERENCES expenses(expense_id)
        );
      `,
        (err) => {
          if (err) {
            console.error("❌ 테이블 생성 중 오류:", err.message);
            reject(err);
            return;
          }

          // 카테고리 데이터가 있는지 확인
          db.get(`SELECT COUNT(*) as count FROM categories`, (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (row.count === 0) {
              const categories = [
                "식비",
                "주거비",
                "교통비",
                "쇼핑",
                "고정지출",
                "취미/여가",
                "건강/의료",
                "교육",
                "경조사",
                "유흥비",
                "여행",
                "카페/간식",
                "생필품",
                "기타",
              ];

              const placeholders = categories.map(() => "(?)").join(",");
              db.run(
                `INSERT INTO categories (category_name) VALUES ${placeholders}`,
                categories,
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log("✅ DB 및 초기 카테고리 데이터 생성 완료");
                    resolve();
                  }
                }
              );
            } else {
              console.log("✅ 기존 DB 사용 중");
              resolve();
            }
          });
        }
      );
    });
  });
}

module.exports = {
  db,
  initDB,
};
