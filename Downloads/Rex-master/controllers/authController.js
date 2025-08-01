const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.registerUser = async (req, res) => {
  const { id, password, name, birth, phone, email, gender } = req.body;

  // 필수값 검증
  if (!id || !password || !name || !birth || !phone || !email || !gender) {
    return res
      .status(400)
      .send(
        "<script>alert('모든 필드를 입력해주세요.'); history.back();</script>"
      );
  }

  try {
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // user_private에 INSERT
    db.run(
      `INSERT INTO user_private (id, password, name, birth, phone, email, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, hashedPassword, name, birth, phone, email, gender],
      function (err) {
        if (err) {
          console.error("❌ user_private INSERT 실패:", err.message);
          return res.send(
            "<script>alert('이미 사용 중인 ID /Email / 전화번호입니다.'); history.back();</script>"
          );
        }

        // user_profile에 INSERT (닉네임 없이 먼저 생성)
        db.run(
          `INSERT INTO user_profile (id) VALUES (?)`,
          [id],
          function (err2) {
            if (err2) {
              console.error("❌ user_profile INSERT 실패:", err2.message);
              return res.send(
                "<script>alert('프로필 저장 실패'); history.back();</script>"
              );
            }

            // 성공 시 로그인 페이지로 이동
            return res.send(
              "<script>alert('회원가입 성공! 로그인 해주세요.'); location.href='/auth/login';</script>"
            );
          }
        );
      }
    );
  } catch (error) {
    console.error("❌ 예외:", error);
    res
      .status(500)
      .send("<script>alert('서버 오류'); history.back();</script>");
  }
};
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.loginUser = async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.send(
      "<script>alert('ID와 비밀번호를 모두 입력해주세요.'); history.back();</script>"
    );
  }

  db.get(`SELECT * FROM user_private WHERE id = ?`, [id], async (err, user) => {
    if (err || !user) {
      return res.send(
        "<script>alert('존재하지 않는 사용자입니다.'); history.back();</script>"
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send(
        "<script>alert('ID 또는 비밀번호가 틀렸습니다.'); history.back();</script>"
      );
    }

    //JWT 생성
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // 7일간 유효
    });

    //HTTP-only 쿠키로 저장
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // HTTPS에서만 사용 시 true
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return res.send(
      "<script>alert('로그인 성공!'); location.href='/';</script>"
    );
  });
};

// 로그아웃
exports.logoutUser = (req, res) => {
  res.clearCookie("token");
  return res.send(
    "<script>alert('로그아웃 되었습니다.'); location.href='/auth/login';</script>"
  );
};
