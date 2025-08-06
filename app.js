require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const cookieParser = require("cookie-parser");

const { initDB } = require("./db");
const { router: authRoutes, verifyToken } = require("./routes/auth");

const dashboardRoutes = require("./routes/dashboard");
const profileRoutes = require("./routes/profile");
const inputRoutes = require("./routes/input");
const resultRoutes = require("./routes/result");
const statsRoutes = require("./routes/stats");

const app = express();
const db = new sqlite3.Database(process.env.DB_PATH || "expenses.db");

// View 엔진 및 정적 파일
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

//  1. cookieParser 가장 먼저
app.use(cookieParser());

// 세션 설정 (Google OAuth 등 Passport 연동용)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1일
    },
  })
);

// 2. 파서 등록
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 인증 제외
app.use((req, res, next) => {
  if (req.path.startsWith("/auth")) return next();
  verifyToken(req, res, next);
});

// 프로필 이미지 연동
app.use((req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next();

  db.get(
    `SELECT * FROM user_profile WHERE id = ?`,
    [userId],
    (err, profile) => {
      if (err || !profile) {
        res.locals.user = {
          id: userId,
          profile_image: "/img/profile_user.jpg",
          nickname: userId,
        };
      } else {
        res.locals.user = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          nickname: profile.nickname || profile.id,
          profile_image:
            profile.profile_image && profile.profile_image.trim() !== ""
              ? profile.profile_image
              : "/img/profile_user.jpg",
        };
      }
      next();
    }
  );
});

// 전화번호 필수 리디렉션
app.use((req, res, next) => {
  const userId = req.user?.id;
  const phone = req.user?.phone;
  if (userId && phone === "010-0000-0000" && !req.path.startsWith("/profile")) {
    return res.redirect("/profile");
  }
  next();
});

// 라우터 등록
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/profile", profileRoutes);
app.use("/input", inputRoutes);
app.use("/result", resultRoutes);
app.use("/stats", statsRoutes);

// 기본 루트
app.get("/", (req, res) => res.redirect("/dashboard"));

const PORT = process.env.PORT || 3000;
// 서버 시작
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB 초기화 실패:", err);
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
