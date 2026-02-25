import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Mongo connecté"))
.catch(err => console.log(err));

/* ========================
   MODELE USER
======================== */

const userSchema = new mongoose.Schema({
  username: String,
  weeks: [String]
});

const User = mongoose.model("User", userSchema);

/* ========================
   AUTH MIDDLEWARE
======================== */

function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: "Non autorisé" });
  }
}

/* ========================
   LOGIN
======================== */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ACCOUNT_USERNAME &&
    password === process.env.ACCOUNT_PASSWORD
  ) {

    let user = await User.findOne({ username });

    if (!user) {
      user = new User({
        username,
        weeks: []
      });
      await user.save();
    }

    req.session.userId = user._id;
    res.json({ success: true });

  } else {
    res.status(401).json({ success: false });
  }
});

/* ========================
   GET WEEKS
======================== */

app.get("/weeks", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.json(user.weeks);
});

/* ========================
   SAVE WEEKS
======================== */

app.post("/weeks", requireAuth, async (req, res) => {
  const { weeks } = req.body;

  await User.findByIdAndUpdate(
    req.session.userId,
    { weeks },
    { new: true }
  );

  res.json({ success: true });
});

/* ========================
   LOGOUT
======================== */

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* ========================
   STATIC FILES
======================== */

app.use(express.static("public"));

app.listen(3000, () => console.log("Server lancé"));
