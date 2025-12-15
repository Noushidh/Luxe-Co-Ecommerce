import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
import connectDB from "./config/connectDB.js";
import session from "express-session";
import flash from "connect-flash";
import nocache from "nocache";

import "./config/passport.js";
import passport from "passport";


const port = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET;

connectDB();


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(nocache())

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}))

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});


app.use(passport.initialize());
app.use(passport.session());

import userRoutes from "./routes/user.js";
import adminRoutes from "./routes/admin.js";

app.use('/user', userRoutes)
app.use('/admin', adminRoutes)

app.get("/", (req, res) => {
    return res.redirect("/user");
});



app.use((req, res) => {
    const url = req.originalUrl || req.url || '';
    if (url.startsWith('/admin')) {
        return res.status(404).redirect('/admin/page-404');
    }
    return res.status(404).redirect('/user/page-404');
});

app.listen(port, () => {
  console.log("http://localhost:5000/")
});
