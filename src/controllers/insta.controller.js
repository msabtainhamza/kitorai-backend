import axios from "axios";
import mongoose from "mongoose";
import UserInsights from "../models/insta.model.js";

const loginUser = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI);
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=user_profile,user_media`;

  res.redirect(authUrl);
};

const authCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await axios.post(
      `https://api.instagram.com/oauth/access_token`,
      null,
      {
        params: {
          client_id: process.env.INSTAGRAM_CLIENT_ID,
          client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
          grant_type: "authorization_code",
          redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
          code,
        },
      }
    );

    const { access_token, user_id } = response.data;

    const profileResponse = await axios.get(
      `https://graph.instagram.com/${user_id}`,
      {
        params: {
          fields: "id,username",
          access_token,
        },
      }
    );

    const { id, username } = profileResponse.data;

    await mongoose.connect(process.env.MONGO_URI);

    let userInsights = await UserInsights.findOne({ username });

    if (!userInsights) {
      userInsights = new UserInsights({
        username,
        accessToken: access_token,
        followers: 0,
        views: 0,
        shares: 0,
        following: 0,
        recentPosts: [],
        profileGrowth: [],
        demographicInfo: {
          gender: "Not Provided",
          age_range: "Not Provided",
        },
      });
    } else {
      userInsights.accessToken = access_token;
    }

    await userInsights.save();

    res.status(200).json({ access_token, username });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to get access token or save user data" });
  }
};

const getInstagramInsights = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const userInsights = await UserInsights.findOne({ username });

    if (!userInsights) {
      return res.status(404).json({ error: "User not found" });
    }

    const { accessToken } = userInsights;

    // Fetching Instagram insights
    const profileResponse = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields:
          "id,username,account_type,media_count,followers_count,follows_count",
        access_token: accessToken,
      },
    });

    const { followers_count, follows_count, media_count, id } =
      profileResponse.data;

    // Fetching media posts
    const mediaResponse = await axios.get(
      `https://graph.instagram.com/me/media`,
      {
        params: {
          fields:
            "id,caption,media_type,media_url,timestamp,like_count,comments_count",
          access_token: accessToken,
        },
      }
    );

    const posts = mediaResponse.data.data;

    // Fetching monthly growth
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const monthlyGrowth = [];
    const monthMap = {};

    const historicalData = await UserInsights.find({
      username,
      "profileGrowth.year": oneYearAgo.getFullYear(),
    });

    historicalData.forEach((data) => {
      const { year, month, followersCount } = data.profileGrowth;
      monthMap[`${year}-${month}`] = followersCount;
    });

    for (let i = 0; i < 12; i++) {
      const start = new Date(oneYearAgo.getFullYear(), i, 1);
      const end = new Date(oneYearAgo.getFullYear(), i + 1, 0);
      const key = `${start.getFullYear()}-${(i + 1)
        .toString()
        .padStart(2, "0")}`;

      const followersCount = monthMap[key] || followers_count;

      monthlyGrowth.push({
        month: start.toISOString().slice(0, 7),
        followersCount,
      });
    }

    // Fetching yearly growth
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const previousYearInsights = await UserInsights.findOne({
      username,
      "profileGrowth.year": previousYear,
    });

    const previousYearFollowers = previousYearInsights
      ? previousYearInsights.followers
      : followers_count;

    const yearlyGrowth = {
      year: currentYear,
      followersGrowth: followers_count - previousYearFollowers,
    };

    const demographicInfo = {
      gender: "Not Provided",
      age_range: "Not Provided",
    };

    userInsights.followers = followers_count;
    userInsights.following = follows_count;
    userInsights.shares = posts.reduce(
      (total, post) =>
        total + (post.like_count || 0) + (post.comments_count || 0),
      0
    );
    userInsights.recentPosts = posts.map((post) => ({
      message: post.caption,
      createdTime: new Date(post.timestamp),
    }));
    userInsights.monthlyGrowth = monthlyGrowth;
    userInsights.yearlyGrowth = yearlyGrowth;
    userInsights.demographicInfo = demographicInfo;

    // Saving the Instagram Insights
    await userInsights.save();

    res.status(200).json(userInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

export { loginUser, getInstagramInsights, authCallback };
