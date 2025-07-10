const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();

const { initDB } = require("./db"); // ⭐️ initDB 불러오기

// 라우터
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const inputRoutes = require("./routes/input");
const resultRoutes = require("./routes/result");
const statsRoutes = require("./routes/stats");

// 미들웨어
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "my-secret", // 아무 문자열 가능
  resave: false,
  saveUninitialized: true
}));

// 라우터 연결
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/input", inputRoutes);
app.use("/result", resultRoutes);
app.use("/stats", statsRoutes);

app.get("/", (req, res) => {
  console.log("세션 userId:", req.session.userId); // ← 이거 추가
  res.redirect("/dashboard");
});

// 🔥 DB 초기화 끝난 후 서버 시작
initDB()
  .then(() => {
    app.listen(3000, () => {
      console.log("✅ Server running at http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("❌ DB 초기화 실패:", err);
  });
