import path from "path";
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import session from "express-session";
import pg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL Connection Pool
const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "BlogDB",
  password: "D1234",
  port: 5432,
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL database (BlogDB)"))
  .catch(err => console.error("Database connection error", err.stack));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "blog_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Make session user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Categories
const categories = ["General", "Tech", "Lifestyle", "Education", "Sport"];

// Signup Route
app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
  const { user_id, password, name } = req.body;
  try {
    const userCheck = await db.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
    if (userCheck.rows.length > 0) {
      return res.render("signup", { error: "User ID is already taken. Please choose another." });
    }
    await db.query(
      "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
      [user_id, password, name]
    );
    res.redirect("/signin");
  } catch (err) {
    console.error(err);
    res.render("signup", { error: "An error occurred during signup." });
  }
});

// Signin Route
app.get("/signin", (req, res) => {
  res.render("signin", { error: null });
});

app.post("/signin", async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE user_id = $1 AND password = $2", [
      user_id,
      password,
    ]);
    if (result.rows.length === 0) {
      return res.render("signin", { error: "Invalid User ID or Password." });
    }
    req.session.user = result.rows[0];
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.render("signin", { error: "An error occurred during signin." });
  }
});

// Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Homepage / Blog Feed
app.get("/", async (req, res) => {
  const selectedCategory = req.query.category;
  try {
    let query = "SELECT * FROM blogs";
    let params = [];

    if (selectedCategory && selectedCategory !== "All") {
      query += " WHERE category = $1";
      params.push(selectedCategory);
    }
    query += " ORDER BY date_created DESC";

    const result = await db.query(query, params);
    res.render("index", {
      posts: result.rows,
      categories: categories,
      currentCategory: selectedCategory || "All",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Post Creation
app.post("/posts", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  const { title, content, category } = req.body;
  const creator_name = req.session.user.name;
  const creator_user_id = req.session.user.user_id;

  try {
    await db.query(
      "INSERT INTO blogs (creator_name, creator_user_id, title, body, category, date_created) VALUES ($1, $2, $3, $4, $5, NOW())",
      [creator_name, creator_user_id, title, content, category || "General"]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Edit Form
app.get("/posts/:id/edit", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  const postId = req.params.id;
  try {
    const result = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    if (result.rows.length === 0) return res.redirect("/");
    
    const post = result.rows[0];
    if (post.creator_user_id !== req.session.user.user_id) {
      return res.redirect("/"); // Prevent unauthorized editing
    }

    res.render("edit", { post, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Update Post
app.put("/posts/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  const postId = req.params.id;
  const { title, content, category } = req.body;

  try {
    const result = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    if (result.rows.length === 0) return res.redirect("/");

    const post = result.rows[0];
    if (post.creator_user_id !== req.session.user.user_id) {
      return res.redirect("/");
    }

    await db.query(
      "UPDATE blogs SET title = $1, body = $2, category = $3 WHERE blog_id = $4",
      [title, content, category, postId]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Delete Post
app.delete("/posts/:id", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }
  const postId = req.params.id;

  try {
    const result = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [postId]);
    if (result.rows.length === 0) return res.redirect("/");

    const post = result.rows[0];
    if (post.creator_user_id !== req.session.user.user_id) {
      return res.redirect("/");
    }

    await db.query("DELETE FROM blogs WHERE blog_id = $1", [postId]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});