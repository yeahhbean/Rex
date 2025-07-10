const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

exports.registerUser = async (req, res) => {
  const { id, password, name, birth, phone, email, gender} = req.body;

  if (!id || !password || !name || !birth || !phone || !email || !gender) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO user_private (id, password, name, birth, phone, email, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, hashedPassword, name, birth, phone, email, gender],
      function (err) {
        if (err) {
            console.error(err.message); // ← 여기 로그 찍으면 원인 바로 나옴
            return res.status(500).json({ error: "유저 정보 저장 실패" });
        }
        db.run(
        `INSERT INTO user_profile (id) VALUES (?)`,
        [id],
        function (err2) {
            if (err2) {
            console.error("❌ user_profile INSERT 실패:", err2.message);
            return res.status(500).json({ error: "프로필 저장 실패" });
            }

            res.status(201).json({ message: "회원가입 성공" });
        }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: "서버 오류" });
  }
};

exports.loginUser = async (req, res) => {
  const { id, password } = req.body;

  db.get(`SELECT * FROM user_private WHERE id = ?`, [id], async (err, user) => {
    if (err || !user) {
      return res.send(`<script>alert("ID 또는 비밀번호 오류"); history.back();</script>`);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send(`<script>alert("ID 또는 비밀번호 오류"); history.back();</script>`);
    }

    // 로그인 성공 시: 대시보드로 이동 + 알림 띄우기
    req.session.userId = user.id; // ← 세션에 사용자 ID 저장
    res.send(`<script>alert("로그인 성공"); location.href='/';</script>`);
  });
};

exports.postNickname = (req, res) => {
  const userId = req.session.userId; // 로그인 시 세션에 저장된 id
  const { nickname } = req.body;

  if (!userId || !nickname) {
    return res.status(400).send('로그인 후 닉네임을 입력해주세요.');
  }

  db.run(
    `UPDATE user_profile SET nickname = ? WHERE id = ?`,
    [nickname, userId],
    function (err) {
      if (err) {
        console.error('닉네임 업데이트 실패:', err);
        return res.status(500).send('닉네임 저장 실패');
      }
      res.redirect('/');
    }
  );
};