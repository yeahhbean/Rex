const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      const googleId = profile.id;
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const picture = profile.photos[0]?.value;

      db.get(
        `SELECT * FROM user_private WHERE id = ?`,
        [googleId],
        (err, user) => {
          if (err) return done(err);

          if (user) {
            return done(null, user);
          } else {
            // 신규 사용자 등록
            db.run(
              `INSERT INTO user_private (id, password, name, birth, phone, email, gender, oauth_provider)
              VALUES (?, NULL, ?, '2000-01-01', '010-0000-0000', ?, 'M', 'google')`,
              [googleId, name, email],
              function (err) {
                if (err) return done(err);

                db.run(
                  `INSERT INTO user_profile (id, nickname, profile_image) VALUES (?, ?, ?)`,
                  [googleId, name, picture],
                  function (err2) {
                    if (err2) return done(err2);
                    return done(null, {
                      id: googleId,
                      name,
                      email,
                      phone: "010-0000-0000",
                      oauth_provider: "google",
                    });
                  }
                );
              }
            );
          }
        }
      );
    }
  )
);

const KakaoStrategy = require("passport-kakao").Strategy;

passport.use(
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET, // 생략 가능
      callbackURL: process.env.KAKAO_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      const kakaoId = profile.id;
      const email =
        profile._json.kakao_account?.email || `${kakaoId}@kakao.com`;
      const name = profile.username || profile.displayName || "카카오유저";
      const picture = profile._json.properties?.profile_image;

      // DB 조회 및 유저 생성 로직
      db.get(
        `SELECT * FROM user_private WHERE id = ?`,
        [kakaoId],
        (err, user) => {
          if (err) return done(err);
          if (user) return done(null, user);

          db.run(
            `INSERT INTO user_private (id, password, name, birth, phone, email, gender, oauth_provider)
       VALUES (?, NULL, ?, '2000-01-01', '010-0000-0000', ?, 'M', 'kakao')`,
            [kakaoId, name, email],
            function (err2) {
              if (err2) return done(err2);

              db.run(
                `INSERT INTO user_profile (id, nickname, profile_image) VALUES (?, ?, ?)`,
                [kakaoId, name, picture],
                function (err3) {
                  if (err3) return done(err3);
                  return done(null, {
                    id: kakaoId,
                    name,
                    email,
                    phone: "010-0000-0000",
                    oauth_provider: "kakao",
                  });
                }
              );
            }
          );
        }
      );
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
