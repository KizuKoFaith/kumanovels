const express = require("express");
const path = require("path");
const cors = require("cors");

const novelRouter = require("./sources/routers/routers");
const fetch = require("node-fetch").default;

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(cors());

// Serve your main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/page/:year/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "page", "page.html"));
});

// Updated routes to support optional /page for Express 5.0 syntax
app.get("/search/year/:year{/:page}", (req, res) => {
  res.sendFile(path.join(__dirname, "search.html"));
});

app.get("/search/type/:type{/:page}", (req, res) => {
  res.sendFile(path.join(__dirname, "search.html"));
});

app.get("/search/genre/:genre{/:page}", (req, res) => {
  res.sendFile(path.join(__dirname, "search.html"));
});

app.get("/search/q/:query{/:page}", (req, res) => {
  res.sendFile(path.join(__dirname, "search.html"));
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
