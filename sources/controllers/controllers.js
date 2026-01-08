const {
  BASE_DATA,
  scrapeNovels,
  scrapeSliderItem,
} = require("../scrapper/scrapper");
const db = require("../config/firebaseConfig");

const formatNovelData = (novel) => {
  const latestVol =
    novel.volumes && novel.volumes.length > 0 ? novel.volumes[0] : null;
  return {
    id: novel.id,
    title: novel.title,
    slug: novel.slug,
    status: novel.additional_info.status,
    type: novel.additional_info.type,
    author: novel.additional_info.author,
    banner: novel.coverImage.banner,
    latestVolumeName: latestVol ? latestVol.volume : "N/A",
    latestVolumeCover: latestVol ? latestVol.cover : novel.coverImage.cover,
    updatedAt: novel.additional_info.updatedAt,
  };
};

const formatedSlider = (novel) => {
  // Change [0] to [novel.volumes.length - 1]
  const latestVol =
    novel.volumes && novel.volumes.length > 0
      ? novel.volumes[novel.volumes.length - 1] // Get the last item
      : null;

  return {
    id: novel.id,
    title: novel.title,
    cover: novel.coverImage.cover,
    slug: novel.slug,
    status: novel.additional_info.status,
    type: novel.additional_info.type,
    author: novel.additional_info.author,
    banner: novel.coverImage.banner,
    volume: latestVol ? latestVol.volume : "N/A",
    updatedAt: novel.additional_info.updatedAt,
  };
};

const formatSearchNovelData = (novel) => {
  const latestVol =
    novel.volumes && novel.volumes.length > 0
      ? novel.volumes[novel.volumes.length - 1] // Get the last item
      : null;

  return {
    id: novel.id,
    title: novel.title,
    slug: novel.slug,
    status: novel.additional_info.status,
    type: novel.additional_info.type,
    author: novel.additional_info.author,
    banner: novel.coverImage.banner,
    cover: novel.coverImage.cover,
    description: novel.additional_info.description,
    updatedAt: novel.additional_info.updatedAt,
    volume: latestVol ? latestVol.volume : "N/A",
  };
};

async function getSliderItems(req, res) {
  try {
    const sliderNovels = await scrapeSliderItem();

    const now = Date.now();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    let filteredData = sliderNovels.filter((novel) => {
      const novelTime = new Date(novel.updatedAt).getTime();
      return now - novelTime <= sevenDaysInMs;
    });

    if (filteredData.length === 0) {
      console.log("No items found in last 7 days, falling back to top 5.");
      filteredData = sliderNovels.slice(0, 5);
    }

    const formattedData = filteredData.map(formatedSlider);

    return res.status(200).send({
      success: true,
      count: formattedData.length,
      message: "Slider items fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("Slider Error:", error);
    return res.status(500).send({
      success: false,
      message: "Failed to fetch slider items!",
    });
  }
}

async function getLatestNovels(req, res) {
  try {
    const novels = await scrapeNovels();

    // Sort by timestamp: Newer (larger number) comes first
    const sortedNovels = novels.sort((a, b) => {
      return (
        parseInt(b.additional_info.updatedAt) -
        parseInt(a.additional_info.updatedAt)
      );
    });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(10, parseInt(req.query.limit) || 10);
    const startIndex = (page - 1) * limit;

    const totalPages = Math.ceil(novels.length / limit);

    if (startIndex >= novels.length) {
      return res.status(200).send({
        success: true,
        message: "No more novels available",
        total: novels.length,
        totalPages,
        limit,
        page,
        data: [],
      });
    }

    const paginatedNovels = sortedNovels
      .slice(startIndex, startIndex + limit)
      .map(formatNovelData);

    return res.status(200).send({
      success: true,
      total: novels.length,
      limit,
      totalPages,
      page,
      data: paginatedNovels,
    });
  } catch (error) {
    console.error("Latest Novels Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

async function getSingleVolume(req, res) {
  try {
    const { slug } = req.params; // e.g., "wandering-witch-...-volume-16"

    // 1. Find the base novel data from your local JSON
    const novel = BASE_DATA.data.find((n) => slug.startsWith(n.slug));

    if (!novel)
      return res
        .status(404)
        .send({ success: false, message: "Novel not found" });

    // 2. Extract the volume part
    const remainingPart = slug.replace(novel.slug, "");
    const volumeSlug = remainingPart.replace("-volume-", "");
    const selectedVolume = novel.volumes.find((v) => v.slug === volumeSlug);

    if (!selectedVolume)
      return res
        .status(404)
        .send({ success: false, message: "Volume not found" });

    // 3. CHANGE: Point the reference to the FULL SLUG (Novel + Volume)
    const volumeEntryRef = db.ref(`novels/${slug}`);

    const { snapshot } = await volumeEntryRef.transaction((currentData) => {
      if (currentData === null) {
        // Create a completely separate entry for this specific volume
        return {
          id: novel.originalId || novel.id,
          title: novel.title,
          slug: slug, // This is now the full "novel-volume-X" slug
          cover: selectedVolume.cover, // Specific volume cover
          banner: novel.coverImage.banner,
          genres: novel.genres,
          additional_info: {
            visit_count: 1,
            favorites: 0,
            updatedAt: novel.additional_info.updatedAt,
            status: novel.additional_info.status,
            type: novel.additional_info.type,
            author: novel.additional_info.author,
          },
          source: novel.source,
          volumes: {
            volume: selectedVolume.volume,
            cover: selectedVolume.cover,
            synopsis: novel.additional_info.description,
            url: selectedVolume.url,
          },
        };
      } else {
        // If this specific novel-volume combo exists, just increment visit_count
        currentData.additional_info.visit_count =
          (currentData.additional_info.visit_count || 0) + 1;
        return currentData;
      }
    });

    const firebaseData = snapshot.val();

    return res.status(200).send({
      success: true,
      data: firebaseData,
    });
  } catch (error) {
    console.error("Firebase Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

async function toggleFavorite(req, res) {
  try {
    const { slug } = req.params;
    const novelRef = db.ref(`novels/${slug}`);

    const { snapshot } = await novelRef.transaction((currentData) => {
      if (currentData) {
        if (!currentData.additional_info) {
          currentData.additional_info = { visit_count: 0, favorites: 0 };
        }
        // Increment favorites
        currentData.additional_info.favorites =
          (currentData.additional_info.favorites || 0) + 1;
      }
      return currentData;
    });

    return res.status(200).send({
      success: true,
      favorites: snapshot.exists()
        ? snapshot.val().additional_info.favorites
        : 0,
    });
  } catch (error) {
    console.error("Favorite Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

async function getPopularNovels(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(10, parseInt(req.query.limit) || 10);
    const startIndex = (page - 1) * limit;

    // 1. Fetch the data
    const snapshot = await db.ref("novels").once("value");
    const data = snapshot.val();

    if (!data) {
      return res
        .status(200)
        .send({ success: true, data: [], total: 0, totalPages: 0 });
    }

    // 2. Convert to array and Sort EXPLICITLY (b - a for Descending)
    // This ensures that the highest visit_count is always at index 0
    const popularArray = Object.values(data).sort((a, b) => {
      const visitA = a.additional_info?.visit_count || 0;
      const visitB = b.additional_info?.visit_count || 0;
      return visitB - visitA;
    });

    // 3. Pagination Logic
    const total = popularArray.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = popularArray.slice(startIndex, startIndex + limit);

    return res.status(200).send({
      success: true,
      total,
      totalPages,
      limit,
      page,
      data: paginatedData,
    });
  } catch (error) {
    console.error("Popular Novels Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

async function getMostFavoriteNovels(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(10, parseInt(req.query.limit) || 10);
    const startIndex = (page - 1) * limit;

    // 1. Query Firebase
    const snapshot = await db
      .ref("novels")
      .orderByChild("additional_info/favorites")
      .once("value");

    const data = snapshot.val();
    if (!data) {
      return res
        .status(200)
        .send({ success: true, data: [], total: 0, totalPages: 0 });
    }

    // 2. Convert to array and sort Descending (Highest -> Lowest)
    const favoriteArray = Object.values(data).sort((a, b) => {
      const favA = a.additional_info?.favorites || 0;
      const favB = b.additional_info?.favorites || 0;
      return favB - favA;
    });

    // 3. Pagination Logic
    const total = favoriteArray.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = favoriteArray.slice(startIndex, startIndex + limit);

    return res.status(200).send({
      success: true,
      total,
      totalPages,
      limit,
      page,
      data: paginatedData,
    });
  } catch (error) {
    console.error("Favorite Novels Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

async function getNovelsBySelection(req, res) {
  try {
    const {
      search,
      genre,
      year,
      type,
      status,
      page: reqPage,
      limit: reqLimit,
    } = req.query;

    const page = Math.max(1, parseInt(reqPage) || 1);
    const limit = Math.min(10, parseInt(reqLimit) || 10);

    const novels = (await scrapeNovels()) || [];
    const searchRegex = search ? new RegExp(search.trim(), "i") : null;

    const filteredNovels = novels.filter((novel) => {
      // A. Search Match
      const matchesSearch = searchRegex
        ? searchRegex.test(novel.title) ||
          searchRegex.test(novel.additional_info?.author || "")
        : true;

      // B. Genre Match
      const matchesGenre = genre
        ? novel.genres?.some((g) => g.toLowerCase() === genre.toLowerCase())
        : true;

      // C. Year Match - FIXED LOGIC
      let matchesYear = true;
      if (year) {
        // Use the raw updatedAt from the novel object
        const rawTimestamp =
          novel.updatedAt || novel.additional_info?.updatedAt;
        if (rawTimestamp) {
          // Multiply by 1000 because JS uses milliseconds, but your data is in seconds
          const dateObj = new Date(Number(rawTimestamp) * 1000);
          const novelYear = dateObj.getFullYear().toString();
          matchesYear = novelYear === year.toString();
        } else {
          matchesYear = false;
        }
      }

      // D. Type Match
      const matchesType = type
        ? novel.additional_info?.type?.toLowerCase() === type.toLowerCase()
        : true;

      // E. Status Match
      const matchesStatus = status
        ? novel.additional_info?.status?.toLowerCase() === status.toLowerCase()
        : true;

      return (
        matchesSearch &&
        matchesGenre &&
        matchesYear &&
        matchesType &&
        matchesStatus
      );
    });

    const totalResults = filteredNovels.length;
    const totalPages = Math.ceil(totalResults / limit);
    const startIndex = (page - 1) * limit;

    const paginatedResults = filteredNovels
      .slice(startIndex, startIndex + limit)
      .map(formatSearchNovelData);

    return res.status(200).send({
      success: true,
      total: totalResults,
      totalPages,
      limit,
      page,
      data: paginatedResults,
    });
  } catch (error) {
    console.error("Selection Filter Error:", error);
    res.status(500).send({ success: false, message: "Server Error" });
  }
}

module.exports = {
  getLatestNovels,
  getSliderItems,
  getSingleVolume,
  toggleFavorite,
  getPopularNovels,
  getMostFavoriteNovels,
  getNovelsBySelection,
};
