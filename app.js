const express = require("express");
const app = express();
const fs = require("fs");
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const postModel = require("./models/post");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Helper function to hash password using scrypt
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

// Create the register route
app.post("/register", async (req, res) => {
  let { name, username, age, email, password } = req.body;

  try {
    // Check if the user already exists
    let user = await userModel.findOne({ email: email });
    if (user) {
      return res.status(400).send("User already registered");
    }

    // If the user doesn't exist, create a new account
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await hashPassword(password, salt);

    // Create the new user
    user = await userModel.create({
      username,
      name,
      age,
      email,
      password: `${salt}:${hashedPassword}`,
    });

    // Read the private key for JWT signing
    const privateKey = "privateKey";

    // Generate the JWT token
    const token = jwt.sign({ email: user.email, userid: user._id }, privateKey);

    // Set the JWT token as a cookie and send a success response
    res.cookie("token", token, { httpOnly: true });
    return res.status(201).render('profile', { user });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).send("An error occurred during registration");
  }
});

// Helper function to compare password
function comparePassword(inputPassword, savedPassword) {
  return new Promise((resolve, reject) => {
    const [salt, key] = savedPassword.split(":");
    crypto.scrypt(inputPassword, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

// Create the login route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists in the database
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res.status(400).send("Something went wrong: User not found");
    }

    // Compare the provided password with the hashed password
    const passwordMatch = await comparePassword(password, user.password);
    if (passwordMatch) {
      const privateKey = "privateKey";
      // Generate the JWT token
      const token = jwt.sign(
        { email: user.email, userid: user._id },
        privateKey
      );
      res.cookie("token", token, { httpOnly: true });
      res.redirect('profile');
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Something went wrong: Internal server error");
  }
});

// Create the logout route 
app.get('/logout', (req, res) => {
  res.cookie("token", "");
  res.redirect('/login');
});

// Create a post route 
app.post('/post', isLoggedIn, async (req, res) => {
  let { content } = req.body;
  let user = await userModel.findOne({ email: req.user.email });

  let post = await postModel.create({
    user: user._id,
    content
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect('profile');
});

// Create the profile route 
app.get('/profile', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate('posts');
  res.render("profile", { user: user });
});

// Create the like route 
app.get('/like/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect('/profile');
});

// Edit and update routes for posts
app.get('/edit/:id', isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render('edit', { post });
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
  await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
  res.redirect('/profile');
});

// Find all posts
app.get('/allpost', isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let allposts = await postModel.find().populate('user');
  res.render('allpost', { allposts, user });
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
  if (req.cookies.token == "") {
    res.redirect("/login");
  } else {
    const privateKey = "privateKey";
    let data = jwt.verify(req.cookies.token, privateKey);
    req.user = data;
    next();
  }
}

app.listen(3000, () => {
  console.log("Server running successfully on port 3000.");
});
