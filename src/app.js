import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./config/passport.config.js";
import session from "express-session";
import twitterPassport from "./config/twitter.config.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "128kb" }));
app.use(express.urlencoded({ extended: true, limit: "128kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(twitterPassport.initialize());
app.use(twitterPassport.session());

//routes import

import userRouter from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import tiktok from "./routes/tiktok.routes.js";
import facebook from "./routes/fb.routes.js";
import twitch from "./routes/twitch.routes.js";
import twitter from "./routes/twitter.routes.js";
import insta from "./routes/insta.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/auth", authRoutes);
app.use("/api/v1/tiktok", tiktok);
app.use("/api/v1/fb", facebook);
app.use("/api/v1/twitch", twitch);
app.use("/api/v1/twitter", twitter);
app.use("/api/v1/insta", insta);

export { app };
