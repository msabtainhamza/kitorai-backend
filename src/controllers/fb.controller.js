import axios from "axios";
import mongoose from "mongoose";
import Facebook from "../models/fb.model.js";

// Facebook OAuth login

const loginUser = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI);
  const authUrl = `https://www.facebook.com/v10.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=email,public_profile`;

  res.redirect(authUrl);
};

const authCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    // Step 1: Get the access token from Facebook
    const response = await axios.get(
      `https://graph.facebook.com/v10.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          code,
        },
      }
    );

    const { access_token } = response.data;

    // Step 2: Get the user's profile information
    const profileResponse = await axios.get(`https://graph.facebook.com/me`, {
      params: { access_token, fields: "id,name" },
    });

    const { id, name } = profileResponse.data;

    await mongoose.connect(process.env.MONGO_URI);

    let userInsights = await UserInsights.findOne({ username: id });

    if (!userInsights) {
      userInsights = new UserInsights({
        username: id,
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

    res.status(200).json({ access_token, username: id });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to get access token or save user data" });
  }
};

const getFacebookInsights = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const userInsights = await Facebook.findOne({ username });

    // Checking if user exists
    if (!userInsights) {
      return res.status(404).json({ error: "User not found" });
    }

    const { accessToken } = userInsights;

    const userProfile = await axios.get(`https://graph.facebook.com/me`, {
      params: { access_token: accessToken },
    });

    const insightsResponse = await axios.get(
      `https://graph.facebook.com/me?fields=followers_count,friends_count,posts.limit(10){message,created_time,shares,comments,likes}&access_token=${accessToken}`
    );

    const { followers_count, friends_count, posts } = insightsResponse.data;

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
    const oneYearAgo2 = new Date();
    oneYearAgo2.setFullYear(currentYear - 1);

    const previousYearInsights = await UserInsights.findOne({
      username,
      "profileGrowth.year": currentYear - 1,
    });

    const previousYearFollowers = previousYearInsights
      ? previousYearInsights.followers
      : followers_count;

    const yearlyGrowth = {
      year: currentYear,
      followersGrowth: followers_count - previousYearFollowers,
    };

    // Getting demographic information
    const demographicResponse = await axios.get(
      `https://graph.facebook.com/me/insights`,
      {
        params: {
          access_token: accessToken,
          metric: "page_fans_gender_age,page_fans_country",
        },
      }
    );

    const genderAgeData = demographicResponse.data.data.find(
      (item) => item.name === "page_fans_gender_age"
    );
    const countryData = demographicResponse.data.data.find(
      (item) => item.name === "page_fans_country"
    );

    const demographicInfo = {
      gender: genderAgeData ? genderAgeData.values[0].value : "Not Provided",
      age_range: countryData ? countryData.values[0].value : "Not Provided",
    };

    userInsights.followers = followers_count;
    userInsights.following = friends_count;
    userInsights.shares = posts.data.reduce(
      (total, post) => total + (post.shares ? post.shares.count : 0),
      0
    );
    userInsights.recentPosts = posts.data.map((post) => ({
      message: post.message,
      createdTime: new Date(post.created_time),
    }));
    userInsights.monthlyGrowth = monthlyGrowth;
    userInsights.yearlyGrowth = yearlyGrowth;
    userInsights.demographicInfo = demographicInfo;

    // Saving the Facebook Insights
    await Facebook.save();

    res.status(200).json(Facebook);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

export { loginUser, getFacebookInsights, authCallback };
