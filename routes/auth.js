const express = require("express");
const router = express.Router();
const { registerUser, loginUser, postNickname } = require("../controllers/authController");

// 뷰 렌더링용 GET 라우터
router.get("/login", (req, res) => {
  res.render("login"); // ← views/login.ejs
});

router.get("/register", (req, res) => {
  res.render("register"); // ← views/register.ejs
});

router.get('/nickname', (req, res) => {
  res.render('nickname'); // nickname.ejs 파일 렌더링
});

// POST 처리용 라우터
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post('/nickname', postNickname);

module.exports = router;
