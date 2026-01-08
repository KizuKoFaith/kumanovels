const axios = require("axios");
const path = require("path");
const fs = require("fs");
const inputFile = path.resolve("./data/data.json");
const RAW_DATA = JSON.parse(fs.readFileSync(inputFile, "utf8"));

const createSlug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD") // Handles special characters
    .replace(/[:]/g, "") // Specifically remove colons first if you want
    .replace(/[^a-z0-9]+/g, "-") // Replace everything else with hyphens
    .replace(/-+/g, "-") // THIS LINE IS KEY: converts -- into -
    .replace(/(^-|-$)/g, "");

// This creates the new array WITH slugs
const BASE_DATA = {
  ...RAW_DATA,
  data: RAW_DATA.data.map((novel) => {
    const novelSlug = createSlug(novel.title);
    return {
      ...novel,
      id: novel.id,
      slug: novelSlug,
      volumes: novel.volumes.map((v) => ({
        ...v,
        slug: createSlug(v.volume),
      })),
    };
  }),
};

// FIX: Change RAW_DATA to BASE_DATA here
async function scrapeNovels() {
  return BASE_DATA.data;
}

// FIX: Change RAW_DATA to BASE_DATA here
async function scrapeSliderItem() {
  const novels = [...BASE_DATA.data];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Since your updatedAt is a Unix string (e.g. "1767758764"),
  // we multiply by 1000 if it's in seconds, or just parse it.
  const getMs = (dateStr) => parseInt(dateStr) * 1000;

  const sortedNovels = novels.sort((a, b) => {
    return (
      getMs(b.additional_info.updatedAt) - getMs(a.additional_info.updatedAt)
    );
  });

  let items = sortedNovels.filter((novel) => {
    return getMs(novel.additional_info.updatedAt) >= sevenDaysAgo;
  });

  return items.length === 0 ? sortedNovels.slice(0, 5) : items.slice(0, 5);
}

module.exports = {
  BASE_DATA,
  scrapeNovels,
  scrapeSliderItem,
};
