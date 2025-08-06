// controllers/profileController.js
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const xss = require("xss");

// 업로드 디렉토리 확인
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg"];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("PNG 또는 JPG만 업로드 가능합니다."));
  },
});

exports.viewProfile = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT p.id, p.name, p.birth, p.phone, p.email, p.gender,
           pr.nickname, pr.profile_image,
           CASE WHEN p.password IS NULL THEN 1 ELSE 0 END AS is_social
    FROM user_private p
    LEFT JOIN user_profile pr ON p.id = pr.id
    WHERE p.id = ?
  `;

  db.get(sql, [userId], (err, user) => {
    if (err || !user) {
      console.error("❌ 사용자 조회 오류:", err);
      return res.send("프로필 정보를 불러올 수 없습니다.");
    }

    const mustChangePhone = user.phone === "010-0000-0000";

    res.render("profile", {
      user,
      isSocial: !!user.is_social,
      mustChangePhone,
    });
  });
};

exports.updateProfile = (req, res) => {
  const { name, phone, email, gender, nickname, password, profile_image } =
    req.body;
  const userId = req.user.id;
  const uploadedImageUrl = req.file
    ? `/uploads/${req.file.filename}`
    : profile_image || null;

  const safe = {
    name: xss(name),
    phone: xss(phone),
    email: xss(email),
    gender: xss(gender),
    nickname: xss(nickname),
    password: xss(password || ""),
  };

  if (safe.password && safe.password.length > 0 && safe.password.length < 6) {
    return res.send(
      `<script>alert("비밀번호는 최소 6자 이상이어야 합니다."); history.back();</script>`
    );
  }

  const nicknameCheckSql = `SELECT id FROM user_profile WHERE nickname = ? AND id != ?`;
  db.get(nicknameCheckSql, [safe.nickname, userId], (err, existing) => {
    if (err) {
      console.error("❌ 닉네임 중복 체크 오류:", err);
      return res.send("서버 오류가 발생했습니다.");
    }
    if (existing) {
      return res.send(
        `<script>alert("이미 사용 중인 닉네임입니다."); history.back();</script>`
      );
    }

    const phoneCheckSql = `SELECT id FROM user_private WHERE phone = ? AND id != ?`;
    db.get(phoneCheckSql, [safe.phone, userId], (errPhone, existingPhone) => {
      if (errPhone) {
        console.error("❌ 전화번호 중복 체크 오류:", errPhone);
        return res.send("서버 오류가 발생했습니다.");
      }
      if (existingPhone) {
        return res.send(
          `<script>alert("이미 사용 중인 전화번호입니다."); history.back();</script>`
        );
      }

      const emailCheckSql = `SELECT id FROM user_private WHERE email = ? AND id != ?`;
      db.get(emailCheckSql, [safe.email, userId], (errEmail, existingEmail) => {
        if (errEmail) {
          console.error("❌ 이메일 중복 체크 오류:", errEmail);
          return res.send("서버 오류가 발생했습니다.");
        }
        if (existingEmail) {
          return res.send(
            `<script>alert("이미 사용 중인 이메일입니다."); history.back();</script>`
          );
        }

        const oldSql = `
          SELECT p.name, p.phone, p.email, p.gender, pr.nickname, pr.profile_image, p.password
          FROM user_private p
          LEFT JOIN user_profile pr ON p.id = pr.id
          WHERE p.id = ?
        `;

        db.get(oldSql, [userId], (err2, oldUser) => {
          if (err2 || !oldUser) {
            console.error("❌ 기존 정보 조회 실패:", err2);
            return res.send("기존 정보를 불러올 수 없습니다.");
          }

          const isSocial = !oldUser.password;
          const changedFields = [];

          if (oldUser.name !== safe.name) changedFields.push("이름");
          if (oldUser.phone !== safe.phone) changedFields.push("전화번호");
          if (oldUser.email !== safe.email) changedFields.push("이메일");
          if (oldUser.gender !== safe.gender) changedFields.push("성별");
          if (oldUser.nickname !== safe.nickname) changedFields.push("닉네임");
          if (uploadedImageUrl && oldUser.profile_image !== uploadedImageUrl)
            changedFields.push("프로필 이미지");

          if (
            uploadedImageUrl &&
            oldUser.profile_image &&
            oldUser.profile_image.startsWith("/uploads/")
          ) {
            const sanitizedImage = path.basename(oldUser.profile_image);
            const oldPath = path.join(
              __dirname,
              "../public/uploads",
              sanitizedImage
            );

            if (oldPath.startsWith(path.join(__dirname, "../public/uploads"))) {
              fs.unlink(oldPath, (err3) => {
                if (err3)
                  console.warn("⚠️ 예전 이미지 삭제 실패:", err3.message);
              });
            } else {
              console.warn("⚠️ 잘못된 경로 접근 시도:", oldUser.profile_image);
            }
          }

          const updatePrivateSql = `UPDATE user_private SET name = ?, phone = ?, email = ?, gender = ? WHERE id = ?`;
          const privateParams = [
            safe.name,
            safe.phone,
            safe.email,
            safe.gender,
            userId,
          ];

          db.run(updatePrivateSql, privateParams, (err4) => {
            if (err4) {
              console.error("❌ 개인정보 수정 오류:", err4);
              return res.send("개인 정보 수정 오류");
            }

            const updateProfileSql = uploadedImageUrl
              ? `UPDATE user_profile SET nickname = ?, profile_image = ? WHERE id = ?`
              : `UPDATE user_profile SET nickname = ? WHERE id = ?`;

            const profileParams = uploadedImageUrl
              ? [safe.nickname, uploadedImageUrl, userId]
              : [safe.nickname, userId];

            db.run(updateProfileSql, profileParams, (err5) => {
              if (err5) {
                console.error("❌ 프로필 수정 오류:", err5);
                return res.send("프로필 수정 오류");
              }

              if (!isSocial && safe.password) {
                const pwSql = `UPDATE user_private SET password = ? WHERE id = ?`;
                db.run(pwSql, [safe.password, userId], (err6) => {
                  if (err6) {
                    console.error("❌ 비밀번호 수정 오류:", err6);
                    return res.send("비밀번호 수정 오류");
                  }

                  changedFields.push("비밀번호");
                  return res.send(
                    `<script>alert("다음 항목이 수정 되었습니다: ${changedFields.join(
                      ", "
                    )}"); location.href='/profile';</script>`
                  );
                });
              } else {
                return res.send(
                  `<script>alert("다음 항목이 수정 되었습니다: ${changedFields.join(
                    ", "
                  )}"); location.href='/profile';</script>`
                );
              }
            });
          });
        });
      });
    });
  });
};
