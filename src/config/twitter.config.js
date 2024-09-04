// auth.js
import passport from "passport";
import { Strategy as TwitterStrategy } from "passport-twitter";

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CLIENT_ID,
      consumerSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: process.env.TWITTER_REDIRECT_URI,
    },
    (token, tokenSecret, profile, done) => {
      console.log("Obtained Token:", token);
      console.log("Obtained Token Secret:", tokenSecret);
      console.log("Profile Information:", profile);
      done(null, profile);
    }
  )
);
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

export default passport;
