import axios from "axios";
import mongoose from "mongoose";
import UserInsights from "../models/twitter.model.js";

const loginUser = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.TWITTER_REDIRECT_URI);
  const authUrl = `https://api.twitter.com/oauth2/authorize?client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=tweet.read%20tweet.write`;

  res.redirect(authUrl);
};

const authCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const response = await axios.post(
      `https://api.twitter.com/oauth2/token`,
      null,
      {
        params: {
          client_id: process.env.TWITTER_CLIENT_ID,
          client_secret: process.env.TWITTER_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: process.env.TWITTER_REDIRECT_URI,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = response.data;

    const profileResponse = await axios.get(
      `https://api.twitter.com/2/users/me`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
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
        following: 0,
        likes: 0,
        retweets: 0,
        tweets: 0,
        monthlyGrowth: [],
        yearlyGrowth: [],
        demographicInfo: {
          gender: "Not Provided",
          age_range: "Not Provided",
          country: "Not Provided",
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

const getTwitterInsights = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // MongoDB connection
    await mongoose.connect(process.env.MONGO_URI);

    const userInsights = await UserInsights.findOne({ username });

    // Checking if user exists
    if (!userInsights) {
      return res.status(404).json({ error: "User not found" });
    }

    const { accessToken } = userInsights;

    const userData = await axios.get(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const { data } = userData;
    const followers_count = data.followers_count || userInsights.followers;
    const following_count = data.following_count || userInsights.following;
    const likes_count = data.likes_count || userInsights.likes;
    const retweets_count = data.retweets_count || userInsights.retweets;
    const tweets_count = data.tweets_count || userInsights.tweets;

    // monthly and yearly growth
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const monthlyGrowth = [];
    const monthlyGrowthData = await UserInsights.find({
      username,
      "monthlyGrowth.month": { $gte: oneYearAgo.toISOString().slice(0, 7) },
    });

    const monthMap = {};

    monthlyGrowthData.forEach((data) => {
      const { month, followersCount, likesCount, retweetsCount, tweetsCount } =
        data.monthlyGrowth;
      monthMap[month] = {
        followersCount,
        likesCount,
        retweetsCount,
        tweetsCount,
      };
    });

    for (let i = 0; i < 12; i++) {
      const start = new Date(oneYearAgo.getFullYear(), i, 1);
      const key = `${start.getFullYear()}-${(i + 1)
        .toString()
        .padStart(2, "0")}`;

      const growth = monthMap[key] || {
        followersCount: followers_count,
        likesCount: likes_count,
        retweetsCount: retweets_count,
        tweetsCount: tweets_count,
      };

      monthlyGrowth.push({
        month: start.toISOString().slice(0, 7),
        followersCount: growth.followersCount,
        likesCount: growth.likesCount,
        retweetsCount: growth.retweetsCount,
        tweetsCount: growth.tweetsCount,
      });
    }

    const previousYearInsights = await UserInsights.findOne({
      username,
      "yearlyGrowth.year": now.getFullYear() - 1,
    });

    const previousYearData = previousYearInsights || {
      followers: 0,
      likes: 0,
      retweets: 0,
      tweets: 0,
    };

    const yearlyGrowth = {
      year: now.getFullYear(),
      followersGrowth: followers_count - previousYearData.followers,
      likesGrowth: likes_count - previousYearData.likes,
      retweetsGrowth: retweets_count - previousYearData.retweets,
      tweetsGrowth: tweets_count - previousYearData.tweets,
    };

    // demographic information
    const demographicResponse = await axios.get(
      `https://api.twitter.com/2/users/${data.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const demographicInfo = {
      gender: demographicResponse.data.gender || "Not Provided",
      age_range: demographicResponse.data.age_range || "Not Provided",
      country: demographicResponse.data.location || "Not Provided",
    };

    userInsights.followers = followers_count;
    userInsights.following = following_count;
    userInsights.likes = likes_count;
    userInsights.retweets = retweets_count;
    userInsights.tweets = tweets_count;
    userInsights.monthlyGrowth = monthlyGrowth;
    userInsights.yearlyGrowth = yearlyGrowth;
    userInsights.demographicInfo = demographicInfo;

    await userInsights.save();

    res.status(200).json(userInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

export { loginUser, authCallback, getTwitterInsights };
