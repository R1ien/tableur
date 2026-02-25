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

/* ========================
   MONGODB
======================== */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.log(err));

/* ========================
   SCHEMA USER (IMPORTANT)
======================== */

const paymentSchema = new mongoose.Schema({
  datetime: String,
  email: String,
  amount: Number,
  fees: Number
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: String,
  weeks: {
    type: Map,
    of: [paymentSchema],
    default: {}
  }
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
      user = new User({ username });
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

  // Convert Map -> Object pour frontend
  const weeksObject = Object.fromEntries(user.weeks);

  res.json(weeksObject);
});

/* ========================
   CREATE WEEK
======================== */

app.post("/weeks", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nom requis" });

  const user = await User.findById(req.session.userId);

  if (!user.weeks.has(name)) {
    user.weeks.set(name, []);
    await user.save();
  }

  res.json({ success: true });
});

/* ========================
   DELETE WEEK
======================== */

app.delete("/weeks/:weekName", requireAuth, async (req, res) => {
  const weekName = req.params.weekName;

  const user = await User.findById(req.session.userId);

  user.weeks.delete(weekName);

  await user.save();

  res.json({ success: true });
});

/* ========================
   ADD PAYMENT
======================== */

app.post("/weeks/:weekName/payments", requireAuth, async (req, res) => {
  const weekName = req.params.weekName;
  const { datetime, email, amount, fees } = req.body;

  const user = await User.findById(req.session.userId);

  if (!user.weeks.has(weekName)) {
    user.weeks.set(weekName, []);
  }

  const weekPayments = user.weeks.get(weekName);

  weekPayments.push({ datetime, email, amount, fees });

  user.weeks.set(weekName, weekPayments);

  await user.save();

  res.json({ success: true });
});

/* ========================
   DELETE PAYMENT
======================== */

app.delete("/weeks/:weekName/payments/:index", requireAuth, async (req, res) => {
  const weekName = req.params.weekName;
  const index = parseInt(req.params.index);

  const user = await User.findById(req.session.userId);

  if (user.weeks.has(weekName)) {
    const weekPayments = user.weeks.get(weekName);

    if (weekPayments[index]) {
      weekPayments.splice(index, 1);
      user.weeks.set(weekName, weekPayments);
      await user.save();
    }
  }

  res.json({ success: true });
});

/* ========================
   STATIC FILES
======================== */

app.use(express.static("public"));

app.listen(3000, () => console.log("Serveur lancé sur port 3000"));
