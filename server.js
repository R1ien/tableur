import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // ⚠️ mettre true si HTTPS seulement
}));

mongoose.connect(process.env.MONGO_URI);

// 🔐 Middleware protection
function requireAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/");
  }
}

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ACCOUNT_USERNAME &&
    password === process.env.ACCOUNT_PASSWORD
  ) {
    req.session.loggedIn = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// 🔓 LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// 📄 Servir fichiers statiques
app.use(express.static("public"));

// 🔒 Protection main.html
app.get("/main.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public/main.html"));
});

app.listen(3000, () => console.log("Server started"));