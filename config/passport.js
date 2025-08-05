const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("expenses.db");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
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
              `INSERT INTO user_private (id, password, name, birth, phone, email, gender)
           VALUES (?, NULL, ?, '2000-01-01', '000-0000-0000', ?, 'M')`,
              [googleId, name, email],
              function (err) {
                if (err) return done(err);

                // 프로필도 생성
                db.run(
                  `INSERT INTO user_profile (id, nickname, profile_image) VALUES (?, ?, ?)`,
                  [googleId, name, picture],
                  function (err2) {
                    if (err2) return done(err2);
                    return done(null, { id: googleId, email });
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

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
