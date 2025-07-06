const express = require("express");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const router = express.Router();

const db = new sqlite3.Database("expenses.db");

// 회원가입
router.post("/register", async (req, res) => {
  const { id, password, name, birth, phone, email, gender, nickname } =
    req.body;

  if (
    !id ||
    !password ||
    !name ||
    !birth ||
    !phone ||
    !email ||
    !gender ||
    !nickname
  ) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  try {
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // user_private 저장
    db.run(
      `INSERT INTO user_private (id, password, name, birth, phone, email, gender) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, hashedPassword, name, birth, phone, email, gender],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: "유저 정보 저장 실패" });
        }

        // user_profile 저장
        db.run(
          `INSERT INTO user_profile (id, nickname) VALUES (?, ?)`,
          [id, nickname],
          function (err2) {
            if (err2) {
              console.error(err2.message);
              return res.status(500).json({ error: "프로필 저장 실패" });
            }

            res.status(201).json({ message: "회원가입 성공" });
          }
        );
      }
    );
  } catch (error) {
    console.error("에러:", error);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 로그인
router.post("/login", (req, res) => {
  const { id, password } = req.body;

  db.get(`SELECT * FROM user_private WHERE id = ?`, [id], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "ID 또는 비밀번호 오류" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "ID 또는 비밀번호 오류" });
    }

    res.json({ message: "로그인 성공", id: user.id });
  });
});

module.exports = router;
