var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");

const messageModel = require("./messages");
const passport = require("passport");
const upload = require("./multer");

const localStrategy = require("passport-local");

passport.use(new localStrategy(userModel.authenticate()));

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate({ path: "post", options: { sort: { date: -1 } } });
  res.render("profile", { footer: true, user });
});

router.get("/search", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  res.render("search", { footer: true, user });
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});

router.get("/upload", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });

  res.render("upload", { footer: true, user });
});

router.post("/register", function (req, res) {
  const { username, email, name } = req.body;
  const userData = new userModel({ username, email, name });

  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/update", isLoggedIn, upload.single("image"), async (req, res) => {
  const { username, bio, name } = req.body;

  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username, bio, name },
    { new: true }
  );

  if (req.file) {
    user.profileImage = req.file.filename;
    await user.save();
  }

  res.redirect("/profile");
});

router.post("/upload", isLoggedIn, upload.single("image"), async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    postImage: req.file.filename,
    user: user._id,
    caption: req.body.caption,
    likes: [],
  });

  await user.post.push(post._id);
  user.save();
  res.redirect("/profile");
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const posts = await postModel.find().sort({ date: -1 }).populate("user");
  const postsWithLikes = posts.map((post) => {
    return {
      ...post.toObject(),
      isLikedByCurrentUser: post.likes.includes(req.user._id.toString()),
    };
  });

  res.render("feed", { footer: true, posts: postsWithLikes, user: req.user });
});

router.post("/like/:postId", isLoggedIn, async function (req, res) {
  const postId = req.params.postId;
  const userId = req.user._id;

  let post = await postModel.findById(postId);
  const isLiked = post.likes.includes(userId);

  if (isLiked) {
    // Remove user ID from likes array if already liked
    post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
  } else {
    // Add user ID to likes array if not liked
    post.likes.push(userId);
  }

  await post.save();

  // Update isLiked variable after modifying the likes array
  const updatedIsLiked = post.likes.includes(userId);

  const likeCount = post.likes.length;

  res.json({ isLiked: updatedIsLiked, likeCount });
});

router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`${req.params.username}`, `i`);
  const users = await userModel.find({ username: regex });
  res.json(users);
});

router.get("/profile/:username", isLoggedIn, async (req, res) => {
  const requestedUsername = req.params.username;
  const loggedinUsername = req.user.username;
  if (requestedUsername === loggedinUsername) {
    const user = await userModel.findOne({ username: loggedinUsername }).populate("post");
    res.render("profile", { footer: true, user });
  } else {
    const user = await userModel.findOne({ username: requestedUsername }).populate("post");
    const loggedinuser = await userModel
      .findOne({ username: loggedinUsername })
      .populate("following")
      .populate("followers");

    res.render("userprofile", {
      user,
      loggedinuser,
    });
  }
});

router.post("/toggleFollow", isLoggedIn, async (req, res) => {
  const { userId } = req.body;
  const loggedInUserId = req.user._id;

  // Check if the logged-in user is currently following the target user
  const isFollowing = req.user.following.includes(userId);

  if (isFollowing) {
    // Unfollow: Remove from followers array of the target user and following array of the logged-in user
    await userModel.findOneAndUpdate(
      { _id: userId },
      { $pull: { followers: loggedInUserId } },
      { new: true }
    );

    await userModel.findOneAndUpdate(
      { _id: loggedInUserId },
      { $pull: { following: userId } },
      { new: true }
    );
  } else {
    // Follow: Add to followers array of the target user and following array of the logged-in user
    await userModel.findOneAndUpdate(
      { _id: userId },
      { $addToSet: { followers: loggedInUserId } },
      { new: true }
    );

    await userModel.findOneAndUpdate(
      { _id: loggedInUserId },
      { $addToSet: { following: userId } },
      { new: true }
    );
  }

  // Fetch the updated logged-in user information
  const updatedLoggedInUser = await userModel.findById(loggedInUserId);
  const updatedUser = await userModel.findById(userId);

  res.json({
    isFollowing: updatedLoggedInUser.following.includes(userId),
    followersCount: updatedUser.followers.length,
  });
});

router.get("/followers/:userId", isLoggedIn, async (req, res) => {
  const userId = req.params.userId;
  const user = await userModel.findById(userId).populate("followers");

  res.render("followerlist", {
    followers: user.followers,
    username: user.username,
    footer: true,
    user,
  });
});

router.get("/following/:userId", isLoggedIn, async (req, res) => {
  const userId = req.params.userId;
  const user = await userModel.findById(userId).populate("following");

  res.render("followinglist", {
    following: user.following,
    username: user.username,
    footer: true,
    user,
  });
});

router.get("/userposts", isLoggedIn, async (req, res) => {
  const user = req.user;

  const userWithPosts = await userModel
    .findOne({ _id: user._id })
    .populate({ path: "post", options: { sort: { date: -1 } } });

  const userPosts = userWithPosts.post;

  const postsWithLikes = userPosts.map((post) => ({
    ...post.toObject(),
    isLikedByCurrentUser: post.likes.includes(user._id.toString()),
  }));

  res.render("userposts", { footer: true, posts: postsWithLikes, user });
});

router.get("/otheruserposts/:username", isLoggedIn, async (req, res) => {
  const requestedUsername = req.params.username;
  const loggedinUsername = req.user.username;

  // Find the requested user
  const user = await userModel.findOne({ username: requestedUsername }).populate("post");

  // Find the logged-in user
  const loggedinuser = await userModel
    .findOne({ username: loggedinUsername })
    .populate("following")
    .populate("followers");

  // Check if the logged-in user has any posts
  const userPosts = user.post || [];

  // Process posts with likes
  const postsWithLikes = userPosts.map((post) => ({
    ...post.toObject(),
    isLikedByCurrentUser: post.likes.includes(req.user._id.toString()),
  }));

  res.render("otheruserposts", {
    user,
    loggedinuser,
    posts: postsWithLikes,
  });
});

module.exports = router;
