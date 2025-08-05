// routes/profile.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("./auth");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

// 프로필 페이지 조회
router.get("/", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT p.id, p.name, p.birth, p.phone, p.email, p.gender, pr.nickname
    FROM user_private p
    LEFT JOIN user_profile pr ON p.id = pr.id
    WHERE p.id = ?
  `;

  db.get(sql, [userId], (err, user) => {
    if (err || !user) {
      console.error("❌ 사용자 조회 오류:", err);
      return res.send("프로필 정보를 불러올 수 없습니다.");
    }
    res.render("profile", { user });
  });
});

// 프로필 수정 요청 처리
router.post("/update", verifyToken, (req, res) => {
  const { name, phone, email, gender, nickname } = req.body;
  const userId = req.user.id;

  db.run(
    `UPDATE user_private SET name = ?, phone = ?, email = ?, gender = ? WHERE id = ?`,
    [name, phone, email, gender, userId],
    (err1) => {
      if (err1) {
        console.error("❌ 개인정보 수정 오류:", err1);
        return res.send("개인 정보 수정 오류");
      }

      db.run(
        `UPDATE user_profile SET nickname = ? WHERE id = ?`,
        [nickname, userId],
        (err2) => {
          if (err2) {
            console.error("❌ 닉네임 수정 오류:", err2);
            return res.send("프로필 수정 오류");
          }
          res.redirect("/profile");
        }
      );
    }
  );
});

module.exports = router;
