const express = require("express");
const {
  getLatestNovels,
  getSliderItems,
  getSingleVolume,
  toggleFavorite,
  getPopularNovels,
  getMostFavoriteNovels,
  getNovelsBySelection,
} = require("../controllers/controllers");

const router = express.Router();

router.get("/latest", getLatestNovels);
router.get("/highlights", getSliderItems);
router.get("/volume/:slug", getSingleVolume);
router.get("/popular", getPopularNovels);
router.post("/favorite/:slug", toggleFavorite);
router.get("/most-favorited", getMostFavoriteNovels);
router.get("/filter", getNovelsBySelection);

module.exports = router;
