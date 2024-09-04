import axios from "axios";
import mongoose from "mongoose";
import UserInsights from "../models/tiktok.model.js";

const loginUser = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.TIKTOK_REDIRECT_URI);
  const authUrl = `https://www.tiktok.com/auth/authorize?client_key=${process.env.TIKTOK_CLIENT_KEY}&redirect_uri=${redirectUri}&response_type=code&scope=user_info`;

  res.redirect(authUrl);
};

const authCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await axios.post(
      "https://open-api.tiktok.com/oauth/access_token/",
      null,
      {
        params: {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: process.env.TIKTOK_REDIRECT_URI,
        },
      }
    );

    const { access_token } = response.data;

    const profileResponse = await axios.get(
      "https://open-api.tiktok.com/user/info/",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const { user_id, nickname } = profileResponse.data;

    await mongoose.connect(process.env.MONGO_URI);

    let userInsights = await UserInsights.findOne({ username: user_id });

    if (!userInsights) {
      userInsights = new UserInsights({
        username: user_id,
        accessToken: access_token,
        followers: 0,
        following: 0,
        views: 0,
        likes: 0,
        shares: 0,
        demographicInfo: {
          gender: "Not Provided",
          age_range: "Not Provided",
          country: "Not Provided",
        },
        monthlyGrowth: [],
        yearlyGrowth: [],
      });
    } else {
      userInsights.accessToken = access_token;
    }

    await userInsights.save();

    res.status(200).json({ access_token, username: user_id });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to get access token or save user data" });
  }
};

const getTikTokInsights = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const userInsights = await UserInsights.findOne({ username });

    // Checking if user exists
    if (!userInsights) {
      return res.status(404).json({ error: "User not found" });
    }

    const { accessToken } = userInsights;

    // Fetching user profile
    const profileResponse = await axios.get(
      "https://open-api.tiktok.com/user/info/",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Fetching user data
    const insightsResponse = await axios.get(
      "https://open-api.tiktok.com/user/stats/",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const {
      followers_count,
      following_count,
      views_count,
      likes_count,
      shares_count,
    } = insightsResponse.data;

    // Fetching monthly growth
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const monthlyGrowth = [];
    const monthMap = {};

    const historicalData = await UserInsights.find({
      username,
      "monthlyGrowth.year": oneYearAgo.getFullYear(),
    });

    historicalData.forEach((data) => {
      data.monthlyGrowth.forEach((monthData) => {
        const { month, followersCount, likesCount, viewsCount } = monthData;
        monthMap[`${month}`] = { followersCount, likesCount, viewsCount };
      });
    });

    for (let i = 0; i < 12; i++) {
      const start = new Date(oneYearAgo.getFullYear(), i, 1);
      const key = `${start.toISOString().slice(0, 7)}`;

      const growthData = monthMap[key] || {
        followersCount: followers_count,
        likesCount: likes_count,
        viewsCount: views_count,
      };

      monthlyGrowth.push({
        month: start.toISOString().slice(0, 7),
        followersCount: growthData.followersCount,
        likesCount: growthData.likesCount,
        viewsCount: growthData.viewsCount,
      });
    }

    const currentYear = new Date().getFullYear();
    const previousYearData = await UserInsights.findOne({
      username,
      "yearlyGrowth.year": currentYear - 1,
    });

    const previousYearFollowers = previousYearData
      ? previousYearData.followers
      : followers_count;

    const yearlyGrowth = {
      year: currentYear,
      followersGrowth: followers_count - previousYearFollowers,
      likesGrowth:
        likes_count - (previousYearData ? previousYearData.likes : likes_count),
      viewsGrowth:
        views_count - (previousYearData ? previousYearData.views : views_count),
    };

    const demographicResponse = await axios.get(
      "https://open-api.tiktok.com/user/demographics/",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const demographicInfo = {
      gender: demographicResponse.data.gender || "Not Provided",
      age_range: demographicResponse.data.age_range || "Not Provided",
      country: demographicResponse.data.country || "Not Provided",
    };

    userInsights.followers = followers_count;
    userInsights.following = following_count;
    userInsights.views = views_count;
    userInsights.likes = likes_count;
    userInsights.shares = shares_count;
    userInsights.demographicInfo = demographicInfo;
    userInsights.monthlyGrowth = monthlyGrowth;
    userInsights.yearlyGrowth = yearlyGrowth;

    await userInsights.save();

    res.status(200).json(userInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

export { loginUser, authCallback, getTikTokInsights };
