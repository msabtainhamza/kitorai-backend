import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/user.model.js"; // Adjust the import path

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://kitorai.vercel.apps/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
            password: "password",
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id).exec();
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });
passport.serializeUser((user, done) => {
  done(null, user._id); // Use _id if your User model uses _id instead of id
});
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, user._id); // Adjust to match your User model's identifier
});

export default passport;
