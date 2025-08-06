const express = require("express");
const passport = require("passport");
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
require("dotenv").config();
require("../config/passport");

const router = express.Router();
const db = new sqlite3.Database("expenses.db");
const authController = require("../controllers/authController");

// 미들웨어: 로그인 상태 확인 + 전화번호 확인
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/auth/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    db.get(
      `SELECT phone FROM user_private WHERE id = ?`,
      [decoded.id],
      (err, row) => {
        if (err || !row) {
          return res.redirect("/auth/login");
        }
        req.user.phone = row.phone;
        next();
      }
    );
  } catch (err) {
    return res.redirect("/auth/login");
  }
}

// 구글 OAuth 로그인
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  authController.googleLoginCallback
);

// 카카오 OAuth 로그인 요청
router.get("/kakao", passport.authenticate("kakao"));

router.get(
  "/kakao/callback",
  passport.authenticate("kakao", { failureRedirect: "/auth/login" }),
  authController.kakaoLoginCallback // 구글과 분리
);

// 일반 로그인 및 회원가입
router.get("/login", (req, res) => res.render("login"));
router.post("/login", authController.loginUser);

router.get("/register", (req, res) => res.render("register"));
router.post("/register", authController.registerUser);

// 로그아웃
router.get("/logout", authController.logoutUser);

// 라우터 + 미들웨어 export
module.exports = {
  router,
  verifyToken,
};
