$(document).ready(function () {
  $(".mobile-menu").on("click", function () {
    $(".header-nav-wrapper").toggleClass("active");

    $(this).find("i").toggleClass("fa-bars fa-xmark");
  });

  // Close menu when clicking a link (useful for one-page sites)
  $(".header-nav-wrapper a").on("click", function () {
    if ($(window).width() <= 768) {
      $(".header-nav-wrapper").removeClass("active");
      $(".mobile-menu i").addClass("fa-bars").removeClass("fa-xmark");
    }
  });

  $("#novel-search-form").on("submit", function (e) {
    e.preventDefault(); // Stop the form from submitting normally (?search=...)

    const query = $("#search-field").val().trim();

    if (query) {
      // Redirect to the clean URL format: /search/q/your-keyword/1
      // We add /1 at the end to ensure it starts on the first page
      window.location.href = `/search/q/${encodeURIComponent(query)}/1`;
    }
  });

  let positions = ["pos-1", "pos-2", "pos-3", "pos-4", "pos-5"];
  let autoRun;

  // 1. Function to update visual classes and DOTS
  function updatePositions() {
    const $allCards = $(".novel-card");
    const $allDots = $(".dot");

    $allCards.each(function (index) {
      $(this)
        .removeClass("pos-1 pos-2 pos-3 pos-4 pos-5")
        .addClass(positions[index]);

      if (positions[index] === "pos-1") {
        $allDots.removeClass("active");
        $allDots.eq(index).addClass("active");
      }
    });
  }

  const moveRight = () => {
    positions.unshift(positions.pop());
    updatePositions();
  };

  const moveLeft = () => {
    positions.push(positions.shift());
    updatePositions();
  };

  // 2. Slider Data Fetching
  function fetchSlider() {
    const $stage = $("#kumaStage");
    const $indicators = $("#indicators");

    $.ajax({
      url: "/api/novels/highlights",
      type: "GET",
      success: function (response) {
        const result =
          typeof response === "string" ? JSON.parse(response) : response;

        $stage.empty();
        $indicators.empty();

        $.each(result.data, function (index, novel) {
          if (index >= 5) return false;

          const positionClass = `pos-${index + 1}`;

          // Wrap both image and text in a single div
          const $card = $(`
                  <div class="novel-card ${positionClass} loading" data-id="${novel.slug}" data-updated="${novel.updatedAt}" data-volume="${novel.volume}">
                      <div class="card-image-box">
                          <img src="/proxy-image?url=${encodeURIComponent(novel.banner)}" alt="${novel.title}" />
                      </div>
                      <div class="novel-card-info">
                          <h1 class="novel-title">${novel.title}</h1>
                      </div>
                  </div>
              `);

          $card
            .find("img")
            .on("load", function () {
              $(this)
                .closest(".novel-card")
                .removeClass("loading")
                .addClass("loaded");
            })
            .on("error", function () {
              $(this)
                .closest(".novel-card")
                .removeClass("loading")
                .addClass("error");
            });

          $stage.append($card);

          $indicators.append(
            `<span class="dot ${index === 0 ? "active" : ""}" data-index="${index}"></span>`,
          );

          $card.on("click", function () {
            const id = $(this).data("id");
            const volume = $(this).data("volume");
            const rawTimestamp = $(this).data("updated");

            const dateObj = new Date(Number(rawTimestamp) * 1000);
            const year = dateObj.getFullYear();

            const volumeSlug = String(volume)
              .toLowerCase()
              .replace(/\s+/g, "-");

            const slug = id + "-volume-" + volumeSlug;

            window.location.href = `/page/${year}/${slug}`;
          });
        });

        updatePositions();
        startAutoRun();
      },
    });
  }

  // 3. Event Listeners (Delegated)
  $("#btnNext").on("click", moveRight);
  $("#btnPrev").on("click", moveLeft);

  // Use delegation for dots since they are dynamic
  $("#indicators").on("click", ".dot", function () {
    const targetIndex = $(this).data("index");
    let currentIndex = positions.indexOf("pos-1");
    let diff = targetIndex - currentIndex;

    if (diff !== 0) {
      const steps = Math.abs(diff);
      const move = diff > 0 ? moveRight : moveLeft;
      for (let i = 0; i < steps; i++) move();
    }
  });

  // 4. Timer Management
  function startAutoRun() {
    clearInterval(autoRun);
    autoRun = setInterval(moveRight, 5000);
  }

  $("#kumaStage").hover(
    () => clearInterval(autoRun),
    () => startAutoRun(),
  );

  fetchSlider();

  let currentPage = 1;
  const itemsLimit = 10;
  let totalPages = 1;

  function formatRelativeTime(timestamp) {
    // Convert seconds to milliseconds
    const past = new Date(timestamp * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now - past) / 1000);

    // 1. Handle very recent updates
    if (diffInSeconds < 60) return "just now";

    // 2. Define our time unit thresholds
    const units = [
      { name: "year", seconds: 31536000 },
      { name: "month", seconds: 2592000 },
      { name: "week", seconds: 604800 },
      { name: "day", seconds: 86400 },
      { name: "hour", seconds: 3600 },
      { name: "minute", seconds: 60 },
    ];

    // 4. Loop through units to find the match
    for (const unit of units) {
      const interval = Math.floor(diffInSeconds / unit.seconds);
      if (interval >= 1) {
        return interval === 1
          ? `1 ${unit.name} ago`
          : `${interval} ${unit.name}s ago`;
      }
    }
  }

  function fetchLatestNovels(page = 1, limit = 10) {
    const $postList = $("#post-list-wrapper");
    const $prevBtn = $(".prev-btn");
    const $nextBtn = $(".next-btn");

    currentPage = page;

    $.ajax({
      url: `/api/novels/latest?page=${page}&limit=${limit}`,
      type: "GET",
      success: function (response) {
        const result =
          typeof response === "string" ? JSON.parse(response) : response;
        totalPages = response.totalPages;

        $postList.empty();

        $.each(result.data, function (index, novel) {
          const relativeTime = formatRelativeTime(novel.updatedAt);
          const $card = $(`
                  <li class="post-card post-card-loading" data-id="${novel.slug}" data-updated="${novel.updatedAt}" data-volume="${novel.latestVolumeName}">
                      <div class="post-card-image-box">
                          <img src="/proxy-image?url=${encodeURIComponent(novel.latestVolumeCover)}" onerror="this.onerror=null; this.src='${novel.latestVolumeCover}';" alt="${novel.title}" />
                          <span class="chapter-badge">Volume ${novel.latestVolumeName}</span>
                      </div>
                      <div class="post-card-info">
                          <h3>${novel.title}</h3>
                          <p>${relativeTime}</p>
                      </div>
                  </li>
              `);

          $prevBtn.css("visibility", currentPage > 1 ? "visible" : "hidden");
          $nextBtn.css(
            "visibility",
            currentPage < totalPages ? "visible" : "hidden",
          );

          $card
            .find("img")
            .on("load", function () {
              $(this)
                .closest(".post-card")
                .removeClass("post-card-loading")
                .addClass("post-card-loaded");
            })
            .on("error", function () {
              $(this)
                .closest(".post-card")
                .removeClass("post-card-loading")
                .addClass("post-card-error");
            });

          $card.on("click", function () {
            const id = $(this).data("id");
            const volume = $(this).data("volume");
            const rawTimestamp = $(this).data("updated");

            const dateObj = new Date(Number(rawTimestamp) * 1000);
            const year = dateObj.getFullYear();

            const volumeSlug = String(volume)
              .toLowerCase()
              .replace(/\s+/g, "-");

            const slug = id + "-volume-" + volumeSlug;

            window.location.href = `/page/${year}/${slug}`;
          });

          $postList.append($card);
        });
      },
    });
  }

  fetchLatestNovels(currentPage, itemsLimit);

  // Click Handlers
  $(".prev-btn").on("click", function () {
    if (currentPage > 1) {
      fetchLatestNovels(currentPage - 1, itemsLimit);
    }
  });

  $(".next-btn").on("click", function () {
    if (currentPage < totalPages) {
      fetchLatestNovels(currentPage + 1, itemsLimit);
    }
  });

  function fetchPopularNovels() {
    // 1. Show skeleton, hide content (optional if already in HTML)
    $("#popular-skeleton").removeClass("hidden");
    $("#popular-list-content").addClass("hidden");

    $.ajax({
      url: "/api/novels/popular?page=1&limit=5",
      method: "GET",
      success: function (response) {
        if (response.success) {
          renderPopularList(response.data);

          // 2. Hide skeleton and show content
          $("#popular-skeleton").addClass("hidden");
          $("#popular-list-content").removeClass("hidden");
        }
      },
      error: function () {
        $("#popular-skeleton").html("<p>Error loading data.</p>");
      },
    });
  }

  function formatViews(num) {
    if (num >= 1000000)
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num;
  }

  function renderPopularList(novels) {
    const $container = $(".popular-wrapper");
    $container.empty();

    // --- ADD THIS SORTING LOGIC ---
    // Sorts by visit_count in descending order (highest first)
    const sortedNovels = novels.sort((a, b) => {
      const visitsA = a.additional_info.visit_count || 0;
      const visitsB = b.additional_info.visit_count || 0;
      return visitsB - visitsA;
    });

    // Use the new sortedNovels array for the loop
    sortedNovels.forEach((novel, index) => {
      const genreTags =
        novel.genres && novel.genres.length > 0
          ? novel.genres
              .map((g) => `<span class="popular-genre">${g}</span>`)
              .join("")
          : `<span class="popular-genre">Novel</span>`;

      const formattedViews = formatViews(
        novel.additional_info.visit_count || 0,
      );
      const formattedFav = formatViews(novel.additional_info.favorites || 0);

      const rawTimestamp = novel.additional_info.updatedAt;
      const dateObj = new Date(Number(rawTimestamp) * 1000);
      const year = dateObj.getFullYear();

      const html = `
        <div class="popular-item" onclick="window.location.href='/page/${year}/${novel.slug}'">
            <div class="popular-rank">${index + 1}</div>
            <div class="popular-thumb">
                <img src="/proxy-image?url=${encodeURIComponent(novel.cover)}" onerror="this.onerror=null; this.src='${novel.cover}';" alt="${novel.title}" onload="this.style.opacity=1" style="opacity:0; transition:opacity 0.3s">
            </div>
            <div class="popular-info">
                <h3 class="popular-title" title="${novel.title}">${novel.title}</h3>
                <div class="popular-meta">
                    <span><i class="fa-solid fa-eye"></i> ${formattedViews}</span>
                    <span><i class="fa-solid fa-heart"></i> ${formattedFav}</span>
                </div>
                <div class="popular-genres-scroll">
                    ${genreTags}
                </div>
            </div>
        </div>
      `;
      $container.append(html);
    });
  }
  // Initialize the fetch
  fetchPopularNovels();

  function fetchMostFavorited(page, limit) {
    const $favList = $("#fav-list-wrapper");
    const $skeleton = $("#fav-skeleton-wrapper");

    $.ajax({
      url: `/api/novels/most-favorited?page=${page}&limit=${limit}`,
      type: "GET",
      success: function (response) {
        const result =
          typeof response === "string" ? JSON.parse(response) : response;
        $favList.empty();

        $.each(result.data, function (index, novel) {
          const dateObj = new Date(
            Number(novel.additional_info.updatedAt) * 1000,
          );
          const year = dateObj.getFullYear();

          // Truncate description to ~120 characters for the snippet
          const descriptionSnippet = novel.volumes.synopsis
            ? novel.volumes.synopsis.substring(0, 120) + "..."
            : "No description available.";

          const $card = $(`
                      <li class="fav-card-horizontal" onclick="window.location.href='/page/${year}/${novel.slug}'">
                          <div class="fav-card-image-box">
                              <img src="/proxy-image?url=${encodeURIComponent(novel.cover)}" onerror="this.onerror=null; this.src='${novel.cover}';" alt="${novel.title}" class="fav-img-loaded" />
                              <span class="fav-chapter-badge">Vol ${novel.volumes.volume}</span>
                          </div>
                          <div class="fav-card-info">
                              <h3>${novel.title}</h3>
                              <div class="fav-meta-row">
                                  <span><i class="fa-solid fa-eye"></i> ${novel.additional_info.visit_count || 0}</span>
                                  <span><i class="fa-solid fa-heart"></i> ${novel.additional_info.favorites || 0}</span>
                              </div>
                              <p class="fav-description">${descriptionSnippet}</p>
                          </div>
                      </li>
                  `);
          $favList.append($card);
        });

        $skeleton.addClass("hidden");
        $favList.hide().removeClass("hidden").fadeIn(400);
      },
      error: function () {
        $skeleton.html("<p>Failed to load favorites.</p>");
      },
    });
  }

  fetchMostFavorited(1, 10);
});
