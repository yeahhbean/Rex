// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//미들웨어 정의 (로그인 보호용)
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/auth/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect("/auth/login");
  }
}

router.get("/login", (req, res) => res.render("login"));
router.post("/login", authController.loginUser);
router.get("/register", (req, res) => res.render("register"));
router.post("/register", authController.registerUser);
// 로그아웃
// auth.js 라우터에 추가
router.get("/logout", authController.logoutUser);

//미들웨어 export
module.exports = {
  router,
  verifyToken,
};
