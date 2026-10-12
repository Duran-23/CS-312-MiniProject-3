import path from "path";
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


//Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//Middleware
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

//Static Posts to atleast have something on the board
let posts = [
  {
    id: "1",
    author: "Abelardo D.",
    title: "Welcome!!!",
    content: "This is the very first blog post created in here.",
    category: "General",
    createdAt: new Date().toLocaleString()
  }
];

//Bonus Categories
const categories = ["General", "Tech", "Lifestyle", "Education", "Sport"];

//Homepage
app.get("/", (req, res) => {
  const selectedCategory = req.query.category;
  let filteredPosts = posts;

  if (selectedCategory && selectedCategory !== "All") {
    filteredPosts = posts.filter(post => post.category === selectedCategory);
  }

  res.render("index", {
    posts: filteredPosts,
    categories: categories,
    currentCategory: selectedCategory || "All"
  });
});

//Post Creation Code
app.post("/posts", (req, res) => {
  const { author, title, content, category } = req.body;
  const newPost = {
    id: Date.now().toString(),
    author,
    title,
    content,
    category: category || "General",
    createdAt: new Date().toLocaleString()
  };
  posts.unshift(newPost); // Add to beginning of array
  res.redirect("/");
});

//Edit Form
app.get("/posts/:id/edit", (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) {
    return res.redirect("/");
  }
  res.render("edit", { post, categories });
});

//Edit Existing Post
app.put("/posts/:id", (req, res) => {
  const { author, title, content, category } = req.body;
  const postIndex = posts.findIndex(p => p.id === req.params.id);

  if (postIndex !== -1) {
    posts[postIndex] = {
      ...posts[postIndex],
      author,
      title,
      content,
      category
    };
  }
  res.redirect("/");
});

//Delete Post
app.delete("/posts/:id", (req, res) => {
  posts = posts.filter(p => p.id !== req.params.id);
  res.redirect("/");
});

//Port Number Reminder
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});