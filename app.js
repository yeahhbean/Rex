const express = require("express");
const path = require("path");
const app = express();

// 라우터 불러오기
const dashboardRoutes = require("./routes/dashboard");
const inputRoutes = require("./routes/input");
const resultRoutes = require("./routes/result");
const statsRoutes = require("./routes/stats");

// 미들웨어 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 라우팅 연결
app.use("/dashboard", dashboardRoutes);
app.use("/input", inputRoutes);
app.use("/result", resultRoutes);
app.use("/stats", statsRoutes);

// 루트 리디렉션
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// 서버 시작
app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
