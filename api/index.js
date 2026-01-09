const express = require("express");
const path = require("path");
const cors = require("cors");

const novelRouter = require("../sources/routers/routers");
// FIX 1: For node-fetch v2, you don't use .default
const fetch = require("node-fetch");

const app = express();

// FIX 2: Vercel maps the root of your project differently.
// Since index.js is in /api, the root is one level up.
const root = path.join(__dirname, "..");

app.use(express.static(root));
app.use(cors());

// Serve your main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(root, "index.html"));
});

app.use("/styles", express.static(path.join(root, "styles")));
app.use("/script", express.static(path.join(root, "script")));
app.use("/images", express.static(path.join(root, "images")));
app.use("/page", express.static(path.join(root, "page")));

app.get("/page/:year/:slug", (req, res) => {
  // Assuming page.html is in /page/ folder at the root
  res.sendFile(path.join(root, "page", "page.html"));
});

app.get("/search/year/:year{/:page}", (req, res) => {
  res.sendFile(path.join(root, "search.html")); // Use root, not __dirname
});

app.get("/search/type/:type{/:page}", (req, res) => {
  res.sendFile(path.join(root, "search.html"));
});

app.get("/search/genre/:genre{/:page}", (req, res) => {
  res.sendFile(path.join(root, "search.html"));
});

app.get("/search/q/:query{/:page}", (req, res) => {
  res.sendFile(path.join(root, "search.html"));
});

app.get("/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(404).send("Image not found");
    }

    const buffer = await response.arrayBuffer();
    res.set(
      "Content-Type",
      response.headers.get("content-type") || "image/jpeg",
    );
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching image");
  }
});

app.use("/api/novels", novelRouter);

// FIX 3: Vercel does not use app.listen().
// It handles the port and IP automatically.
// We only keep this for local testing.
if (process.env.NODE_ENV !== "production") {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}

module.exports = app;
