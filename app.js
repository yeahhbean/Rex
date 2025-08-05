const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();

const { initDB } = require("./db"); // ⭐️ initDB 불러오기

// 라우터
const bodyParser = require("body-parser");
const { router: authRoutes } = require("./routes/auth"); //정확히 router만 가져옴
const dashboardRoutes = require("./routes/dashboard");
const profileRoutes = require("./routes/profile");
const inputRoutes = require("./routes/input");
const resultRoutes = require("./routes/result");
const statsRoutes = require("./routes/stats");

// 미들웨어
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-secret", // 아무 문자열 가능
    resave: false,
    saveUninitialized: true,
  })
);
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// 라우터 연결
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/profile", profileRoutes);
app.use("/input", inputRoutes);
app.use("/result", resultRoutes);
app.use("/stats", statsRoutes);

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// aws 용
// initDB()
//   .then(() => {
//     app.listen(3000, "0.0.0.0", () => {
//       console.log("Server started");
//     });
//   })
//   .catch((err) => {
//     console.error("❌ DB 초기화 실패:", err);
//   });

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
