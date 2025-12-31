import {
  loginUser,
  getUserProfile,
  registerUser,
  becomeHost,
  createAccommodation,
  getAccommodations,
  getAccommodationById,
  getMyBookings,
  createBooking,
  cancelBooking as apiCancelBooking,
  getFavorites as apiGetFavorites,
  addFavorite,
  deleteAccommodation,
  removeFavorite,
  getHostAccommodations as apiGetHostAccommodations,
  getHostBookings,
  approveBooking,
  updateAccommodation,
  rejectBooking,
  adminGetPendingListings,
  adminUpdateListingStatus,
  adminGetAllUsers,
  adminGetUserDetails,
  adminUpdateUserAccess,
  adminGetDashboardStats,
} from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const onboarding = document.getElementById("onboarding");
  const mainApp = document.getElementById("main-app");
  const nextButton = document.getElementById("next-button");
  const finishButton = document.getElementById("finish-button");
  const loadingOverlay = document.getElementById("loading-overlay");

  const pages = document.querySelectorAll(".page");
  const footer = document.querySelector("footer");
  const detailsFooter = document.querySelector(".details-footer");

  if (localStorage.getItem("onboardingComplete") === "true") {
    onboarding.classList.add("hidden");
    loadingOverlay.classList.remove("hidden");

    await router();

    loadingOverlay.classList.add("hidden");
    mainApp.classList.remove("hidden");
  } else {
    const onboardingSwiper = new Swiper(".onboarding-swiper", {
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });

    onboardingSwiper.on("slideChange", () => {
      if (onboardingSwiper.isEnd) {
        nextButton.classList.add("hidden");
        finishButton.classList.remove("hidden");
      } else {
        nextButton.classList.remove("hidden");
        finishButton.classList.add("hidden");
      }
    });

    nextButton.addEventListener("click", () => {
      onboardingSwiper.slideNext();
    });

    finishButton.addEventListener("click", () => {
      onboarding.classList.add("hidden");
      mainApp.classList.remove("hidden");
      localStorage.setItem("onboardingComplete", "true");

      router();
    });
  }

  function getInitials(username) {
    if (!username) {
      return '<iconify-icon icon="mdi:account"></iconify-icon>';
    }
    const initials = username.substring(0, 2).toUpperCase();
    return initials;
  }

  function createAccommodationCardHTML(hotel, options = {}) {
    const { isSwiperSlide = false } = options;
    const formattedPrice = new Intl.NumberFormat("fa-IR").format(
      hotel.price_per_night
    );
    const fallbackImageUrl =
      "https://placehold.co/180x120/dbeafe/3b82f6?text=Hotel+Image";
    const truncatedAddress =
      hotel.address.length > 20
        ? `${hotel.address.substring(0, 20)}...`
        : hotel.address;

    const cardHTML = `
      <a href="#page-details?hotel=${hotel.id}" class="card-link nav-link">
          <div class="hotel-card"> 
              <img src="${hotel.image_url}" alt="${hotel.name}" onerror="this.src='${fallbackImageUrl}';">
              <div class="hotel-card-info">
                  <h3>${hotel.name}</h3>
                  <small>${truncatedAddress}</small>
                  <div class="price-rating">
                      <span class="price">${formattedPrice} تومان</span> 
                      <span class="rating">${hotel.star_rating} <iconify-icon icon="mdi:star"></iconify-icon></span>
                  </div>
              </div>
          </div>
      </a>
    `;

    if (isSwiperSlide) {
      return `<div class="swiper-slide">${cardHTML}</div>`;
    }
    return cardHTML;
  }

  async function populateHotelSliders() {
    try { 
      const data = await getAccommodations();
      const allHotels = data.data;

      const topHotels = [...allHotels]
        .sort((a, b) => b.star_rating - a.star_rating)
        .slice(0, 10);

      const topHotelsWrapper = document.querySelector(
        ".hotel-swiper .swiper-wrapper"
      );
      topHotelsWrapper.innerHTML = topHotels
        .map((hotel) =>
          createAccommodationCardHTML(hotel, { isSwiperSlide: true })
        )
        .join("");

      const randomHotels = [...allHotels]
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

      const allHotelsWrapper = document.querySelector(
        ".all-hotels-swiper .swiper-wrapper"
      );
      allHotelsWrapper.innerHTML = randomHotels
        .map((hotel) =>
          createAccommodationCardHTML(hotel, { isSwiperSlide: true })
        )
        .join("");

      new Swiper(".hotel-swiper", {
        slidesPerView: "auto",
        spaceBetween: 16,
        freeMode: true,
      });

      new Swiper(".all-hotels-swiper", {
        slidesPerView: "auto",
        spaceBetween: 16,
        freeMode: true,
      });
    } catch (error) {
      console.error("Failed to load or populate hotel data:", error);
    }
  }

  populateHotelSliders();

  async function handleSearchAndFilter(query, filters, sortOption) {
    try {
      const data = await getAccommodations();
      let hotels = data.data;
      let resultsTitle = "نتایج جستجو";

      if (sortOption === "top") {
        hotels.sort((a, b) => b.star_rating - a.star_rating);
        resultsTitle = "بهترین مکان‌ها";

        const ratingSortRadio = document.querySelector(
          'input[name="sort"][value="rating-desc"]'
        );
        if (ratingSortRadio) ratingSortRadio.checked = true;
      } else if (sortOption === "all") {
        resultsTitle = "همه اقامتگاه‌ها";
        const defaultSortRadio = document.querySelector(
          'input[name="sort"][value="default"]'
        );
        if (defaultSortRadio) defaultSortRadio.checked = true;
      }

      if (query) {
        const lowerCaseQuery = query.toLowerCase();
        hotels = hotels.filter(
          (hotel) =>
            hotel.name.toLowerCase().includes(lowerCaseQuery) ||
            hotel.address.toLowerCase().includes(lowerCaseQuery)
        );
        if (!sortOption) {
          resultsTitle = `جستجو برای: "${query}"`;
        }
      }

      const searchResultsInput = document.querySelector(
        "#page-search-results .search-bar input"
      );
      searchResultsInput.value = query;

      if (filters?.stars && filters.stars.length > 0) {
        hotels = hotels.filter((hotel) =>
          filters.stars.includes(hotel.star_rating.toString())
        );
        if (!query && !sortOption && filters.stars.length > 0) {
          resultsTitle = `فیلتر بر اساس امتیاز`;
        }
      }

      if (filters?.price && filters.price !== "all" && filters.price) {
        const [minPrice, maxPrice] = filters.price.split("-").map(Number);
        hotels = hotels.filter(
          (hotel) =>
            hotel.price_per_night >= minPrice &&
            hotel.price_per_night <= maxPrice
        );
        if (
          !query &&
          !sortOption &&
          (!filters.stars || filters.stars.length === 0)
        ) {
          resultsTitle = `فیلتر بر اساس قیمت`;
        } else if (!query) {
          resultsTitle = `فیلتر بر اساس امتیاز و قیمت`;
        }
      }

      const currentSort = filters.sort || sortOption;
      if (currentSort === "rating-desc") {
        hotels.sort((a, b) => b.star_rating - a.star_rating);
        if (!query && !sortOption)
          resultsTitle = "مرتب شده بر اساس بیشترین امتیاز";
      } else if (currentSort === "price-asc") {
        hotels.sort((a, b) => a.price_per_night - b.price_per_night);
        if (!query && !sortOption)
          resultsTitle = "مرتب شده بر اساس کمترین قیمت";
      } else if (currentSort === "price-desc") {
        hotels.sort((a, b) => b.price_per_night - a.price_per_night);
        if (!query && !sortOption)
          resultsTitle = "مرتب شده بر اساس بیشترین قیمت";
      }

      const resultsContainer = document.getElementById(
        "search-results-container"
      );
      const titleElement = document.getElementById("search-results-title");

      titleElement.textContent = resultsTitle;

      if (hotels.length > 0) {
        resultsContainer.innerHTML = hotels
          .map((hotel) => createAccommodationCardHTML(hotel))
          .join("");
      } else {
        resultsContainer.innerHTML = `<p>هیچ اقامتگاهی یافت نشد.</p>`;
      }

      if (!window.location.hash.startsWith("#page-search-results")) {
        window.location.hash = "#page-search-results";
      }
    } catch (error) {
      console.error("Error during search/filter:", error);
    }
  }

  const loginButton = document.querySelector("#login-button");
  const loginUsername = document.querySelector("#login-username");
  const loginPassword = document.querySelector("#login-password");

  loginButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const username = loginUsername.value;
    const password = loginPassword.value;

    loginButton.textContent = "در حال ورود...";
    loginButton.disabled = true;

    try {
      const data = await loginUser(username, password);

      if (data && data.code == 0) {
        console.log("Login successful:", data);
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        setActiveMode("tourist");

        window.location.hash = "#page-home";
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert(error.message);
    } finally {
      loginButton.textContent = "ورود";
      loginButton.disabled = false;
    }
  });

  const registerButton = document.querySelector("#register-button");
  const registerUsername = document.querySelector("#register-username");
  const registerPhone = document.querySelector("#register-phone");
  const registerPassword = document.querySelector("#register-password");
  const registerPasswordRepeat = document.querySelector(
    "#register-password-repeat"
  );

  registerButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const username = registerUsername.value;
    const phoneNumber = registerPhone.value;
    const password = registerPassword.value;
    const passwordRepeat = registerPasswordRepeat.value;

    if (password !== passwordRepeat) {
      console.error("Passwords do not match.");
      alert("تکرار رمز عبور اشتباه است.");
      return;
    }

    registerButton.textContent = "در حال ثبت‌نام...";
    registerButton.disabled = true;

    try {
      const data = await registerUser(username, password, phoneNumber);

      if (data && data.code == 600) {
        console.log("Register successful:", data);
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        setActiveMode("tourist");

        window.location.hash = "#page-home";
      }
    } catch (error) {
      console.error("Register Error:", error);
      alert(error.message);
    } finally {
      registerButton.textContent = "ثبت‌نام";
      registerButton.disabled = false;
    }
  });

  function showPage(pageId) {
    if (
      pageId.startsWith("#page-details") ||
      pageId.startsWith("#page-search-results")
    ) {
      detailsFooter.style.display = "flex";
      footer.classList.remove("hidden");
    } else if (
      pageId === "#page-login" ||
      pageId === "#page-signup" ||
      pageId === "#page-payment"
    ) {
      detailsFooter.style.display = "none";
      footer.classList.add("hidden");
    } else {
      detailsFooter.style.display = "none";
      footer.classList.remove("hidden");
    }

    pages.forEach((page) => {
      page.classList.remove("active");
    });

    const targetPage = document.querySelector(pageId);
    if (targetPage) {
      targetPage.classList.add("active");
    }

    const footerLinks = document.querySelectorAll("footer .nav-link");
    footerLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === pageId) {
        link.classList.add("active");
      }
    });

    if (targetPage) {
      targetPage.scrollTop = 0;
    }
  }

  async function populateDetailsPage(hotelId) {
    const page = document.querySelector("#page-details");
    const contentContainer = page.querySelector(".details-scroll-container");
    const detailsFooterElement = page.querySelector(".details-footer");

    contentContainer.innerHTML =
      '<p style="text-align: center; padding: 40px;">در حال بارگذاری...</p>';
    detailsFooterElement.innerHTML = "";

    try {
      const hotelData = await getAccommodationById(hotelId);
      const hotel = hotelData.data;

      if (!hotel) {
        contentContainer.innerHTML =
          '<p style="text-align: center; padding: 40px;">هتل مورد نظر یافت نشد.</p>';
        return;
      }

      const mainImage = hotel.image_url || "https://placehold.co/400x300";
      const favorites = await getFavoritesFromStorage();
      const isFavorite = favorites.includes(hotel.id);
      const favoriteIcon = isFavorite ? "mdi:heart" : "mdi:heart-outline";
      const favoriteClass = isFavorite ? "active" : "";

      const activeMode = getActiveMode();
      const backLink =
        activeMode === "host" ? "#page-host-accommodations" : "#page-home";

      let existingBooking = null;

      if (activeMode === "tourist") {
        const bookings = await getBookings();
        existingBooking = bookings.find(
          (b) =>
            b.accommodation_id === hotel.id &&
            ["pending", "approved"].includes(b.status)
        );
      }

      const userString = localStorage.getItem("user");
      let isOwner = false;
      if (userString) {
        const user = JSON.parse(userString);
        isOwner = user.id === hotel.owner_id;
      }

      const price = hotel.price_per_night || 0;
      const formattedPrice = new Intl.NumberFormat("fa-IR").format(price);

      const pageContentHTML = `
            <div class="details-header">
                <img src="${mainImage}" alt="${hotel.name}" onerror="this.src='https://placehold.co/400x300';">
                <a href="${backLink}" class="btn-icon nav-link"><iconify-icon icon="mdi:arrow-right"></iconify-icon></a>
                <button class="btn-icon btn-favorite ${favoriteClass}" data-hotel-id="${hotel.id}">
                    <iconify-icon icon="${favoriteIcon}"></iconify-icon>
                </button>
            </div>
            <div class="details-content">
                <h2>${hotel.name}</h2>
                <p class="location">
                    <iconify-icon icon="mdi:map-marker"></iconify-icon> ${hotel.address}
                </p>
                <h3>درباره ما</h3>
                <p class="description">${hotel.description}</p>
            </div>
        `;
      contentContainer.innerHTML = pageContentHTML;

      const user = userString ? JSON.parse(userString) : null;
      let footerContentHTML = "";

      if (activeMode === "host") {
        footerContentHTML = `
    <div><p class="price">شما در حالت میزبان هستید.</p></div>
    <button class="btn btn-primary" disabled>مشاهده به عنوان میزبان</button>
  `;
      } else if (user && user.status !== "active") {
        footerContentHTML = `
    <div><small>حساب کاربری شما معلق است</small></div>
    <button class="btn btn-danger" disabled>امکان رزرو وجود ندارد</button>
  `;
      } else if (user && user.can_book !== 1) {
        footerContentHTML = `
    <div><small>امکان رزرو برای شما غیرفعال است</small></div>
    <button class="btn btn-danger" disabled>رزرو غیرفعال</button>
  `;
      } else if (existingBooking) {
        footerContentHTML = `
    <div>
      <small>این اقامتگاه رزرو شده</small>
      <p class="price">موفق باشید</p>
    </div>
    <button class="btn btn-danger" data-booking-id="${existingBooking.id}">لغو رزرو</button>
  `;
      } else {
        footerContentHTML = `
    <div>
      <small>قیمت برای یک شب</small>
      <p class="price">${formattedPrice}<span> تومان</span></p>
    </div>
    <button class="btn btn-primary">همین حالا رزرو کنید</button>
  `;
      }
      detailsFooterElement.innerHTML = footerContentHTML;

      const favoriteButton = contentContainer.querySelector(".btn-favorite");
      favoriteButton.addEventListener("click", () => {
        toggleFavorite(hotel.id, favoriteButton);
      });

      if (activeMode === "tourist" && existingBooking) {
        const cancelButton = detailsFooterElement.querySelector(".btn-danger");
        cancelButton.addEventListener("click", async () => {
          if (
            confirm(
              "آیا از لغو این رزرو اطمینان دارید؟ این عمل قابل بازگشت نیست."
            )
          ) {
            try {
              await apiCancelBooking(existingBooking.id);
              alert("رزرو شما با موفقیت لغو شد.");
              populateDetailsPage(hotel.id);
            } catch (error) {
              alert(`خطا در لغو رزرو: ${error.message}`);
            }
          }
        });
      } else if (activeMode === "tourist" && !isOwner) {
        const bookButton = detailsFooterElement.querySelector(".btn-primary");

        if (bookButton) {
          bookButton.addEventListener("click", () => {
            window.location.hash = `#page-book-hotel?hotel=${hotel.id}`;
          });
        }
      }
    } catch (error) {
      console.error("Failed to load details:", error);
      contentContainer.innerHTML =
        '<p style="text-align: center; padding: 40px;">خطا در بارگذاری اطلاعات.</p>';
    }
  }

  function getFavoritesFromStorage() {
    const favorites = localStorage.getItem("favorites");
    return favorites ? JSON.parse(favorites) : [];
  }

  async function toggleFavorite(hotelId, buttonElement) {
    let favorites = getFavoritesFromStorage();
    const icon = buttonElement.querySelector("iconify-icon");

    if (favorites.includes(hotelId)) {
      await removeFavorite(hotelId);
      favorites = favorites.filter((id) => id !== hotelId);
      buttonElement.classList.remove("active");
      icon.setAttribute("icon", "mdi:heart-outline");
    } else {
      await addFavorite(hotelId);
      favorites.push(hotelId);
      buttonElement.classList.add("active");
      icon.setAttribute("icon", "mdi:heart");
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
  }

  async function getBookings() {
    const response = await getMyBookings();
    return response.data;
  }

  async function addBooking(hotel) {
    const checkInDate = document.getElementById("booking-checkin").value;
    const checkOutDate = document.getElementById("booking-checkout").value;
    const numberOfGuests = document.getElementById("booking-guests").value;

    const bookingData = {
      accommodation_id: hotel.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      number_of_guests: parseInt(numberOfGuests),
    };

    await createBooking(bookingData);
    console.log("Booked hotel:", hotel.name);
  }

  async function populateWatchlistPage() {
    const watchlistContainer = document.getElementById("watchlist-container");
    watchlistContainer.innerHTML =
      '<p style="text-align: center; padding: 40px;">در حال بارگذاری موردعلاقه‌ها...</p>';

    try {
      const favoritesResponse = await apiGetFavorites();
      const favoriteHotels = favoritesResponse.data;

      const favoriteIds = favoriteHotels.map((fav) => fav.id);
      localStorage.setItem("favorites", JSON.stringify(favoriteIds));

      if (favoriteHotels.length === 0) {
        watchlistContainer.innerHTML =
          '<p class="placeholder-full-width">شما هنوز هیچ اقامتگاهی را به لیست موردعلاقه‌ها اضافه نکرده‌اید.</p>';
        return;
      }

      if (favoriteHotels.length > 0) {
        watchlistContainer.innerHTML = favoriteHotels
          .map((hotel) => createAccommodationCardHTML(hotel))
          .join("");
      } else {
        watchlistContainer.innerHTML =
          '<p style="text-align: center; padding: 40px;">موردعلاقه‌های شما یافت نشدند یا حذف شده‌اند.</p>';
      }
    } catch (error) {
      console.error("Failed to load favorite hotels:", error);
      watchlistContainer.innerHTML =
        '<p style="text-align: center; padding: 40px;">خطا در بارگذاری موردعلاقه‌ها.</p>';
    }
  }

  let handleConfirmBooking = null;

  async function populateBookHotelPage(hotelId) {
    const bookingHotelNameElement =
      document.getElementById("booking-hotel-name");
    const bookingForm = document.getElementById("booking-form");
    const confirmBookingButton = document.getElementById(
      "confirm-booking-button"
    );
    const backToDetailsLink = document.querySelector(
      "#page-book-hotel .back-to-details"
    );
    const pricePerNightElement = document.getElementById(
      "booking-price-per-night"
    );
    const nightsElement = document.getElementById("booking-nights");
    const totalPriceElement = document.getElementById("booking-total-price");

    bookingForm.reset();
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("booking-checkin").setAttribute("min", today);
    document.getElementById("booking-checkout").setAttribute("min", today);

    confirmBookingButton.textContent = "تایید و رزرو";
    confirmBookingButton.disabled = false;
    nightsElement.textContent = "0";
    totalPriceElement.textContent = "0";
    pricePerNightElement.textContent = "0";

    backToDetailsLink.href = `#page-details?hotel=${hotelId}`;

    try {
      const hotelData = await getAccommodationById(hotelId);
      const hotel = hotelData.data;

      if (!hotel) {
        bookingHotelNameElement.textContent = "هتل مورد نظر یافت نشد.";
        return;
      }

      bookingHotelNameElement.textContent = `رزرو ${hotel.name}`;
      const pricePerNight = hotel.price_per_night || 0;
      pricePerNightElement.textContent = new Intl.NumberFormat("fa-IR").format(
        pricePerNight
      );

      const updateBookingSummary = () => {
        const checkInValue = document.getElementById("booking-checkin").value;
        const checkOutValue = document.getElementById("booking-checkout").value;

        if (checkInValue && checkOutValue) {
          const checkInDate = new Date(checkInValue);
          const checkOutDate = new Date(checkOutValue);

          if (checkOutDate > checkInDate) {
            const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
            const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
            const totalPrice = nights * pricePerNight;

            nightsElement.textContent = nights;
            totalPriceElement.textContent = new Intl.NumberFormat(
              "fa-IR"
            ).format(totalPrice);
          } else {
            nightsElement.textContent = "0";
            totalPriceElement.textContent = "0";
          }
        }
      };

      document.getElementById("booking-checkin").onchange =
        updateBookingSummary;
      document.getElementById("booking-checkout").onchange =
        updateBookingSummary;

      const newConfirmBtn = confirmBookingButton.cloneNode(true);
      confirmBookingButton.parentNode.replaceChild(
        newConfirmBtn,
        confirmBookingButton
      );

      newConfirmBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const checkIn = document.getElementById("booking-checkin").value;
        const checkOut = document.getElementById("booking-checkout").value;
        const guests = document.getElementById("booking-guests").value;
        const name = document.getElementById("booking-name").value;

        if (!checkIn || !checkOut || !guests || !name) {
          alert("لطفاً تمام فیلدهای الزامی را پر کنید.");
          return;
        }

        const tempBookingData = {
          hotelId: hotel.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfGuests: parseInt(guests),
          guestName: name,
          hotelName: hotel.name,
          totalPrice: document.getElementById("booking-total-price")
            .textContent,
        };
        sessionStorage.setItem("tempBooking", JSON.stringify(tempBookingData));

        window.location.hash = "#page-payment";
      });
    } catch (error) {
      console.error("Failed to load hotel for booking:", error);
      bookingHotelNameElement.textContent = "خطا در بارگذاری اطلاعات هتل.";
    }
  }

  async function populateBookingsPage() {
    const bookingsContainer = document.getElementById("bookings-container");
    bookingsContainer.innerHTML =
      '<p style="text-align: center; padding: 40px;">در حال بارگذاری رزروها...</p>';

    try {
      const bookedItems = await getBookings();

      if (bookedItems.length === 0) {
        bookingsContainer.innerHTML =
          '<p class="placeholder-full-width">شما هنوز هیچ اقامتگاهی را رزرو نکرده‌اید.</p>';
        return;
      }

      const createBookingCardHTML = (booking) => {
        const checkInDate = new Date(booking.check_in_date);
        const checkOutDate = new Date(booking.check_out_date);
        const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const totalPrice = nights * (booking.price_per_night || 0);
        const formattedTotalPrice = new Intl.NumberFormat("fa-IR").format(
          totalPrice
        );

        return `
          <div class="tourist-booking-card">
            <div class="tourist-booking-header">
              <img src="${booking.accommodation_image_url}" alt="${
          booking.accommodation_name
        }" onerror="this.src='https://placehold.co/100x100';">
              <div class="tourist-booking-title">
                <h4>${booking.accommodation_name}</h4>
                <p>${booking.accommodation_address}</p>
              </div>
            </div>
            <div class="tourist-booking-details">
              <p><strong>تاریخ ورود:</strong> ${booking.check_in_date}</p>
              <p><strong>تاریخ خروج:</strong> ${booking.check_out_date}</p>
              <p><strong>تعداد شب:</strong> ${nights}</p>
              <p><strong>تعداد مهمان:</strong> ${booking.number_of_guests}</p>
              <p><strong>مبلغ کل:</strong> ${formattedTotalPrice} تومان</p>
              <p><strong>وضعیت:</strong> <span class="status-badge status-${
                booking.status
              }">${booking.status}</span></p>
            </div>
            <div class="tourist-booking-actions">
              ${
                ["pending", "approved"].includes(booking.status)
                  ? `<button class="btn btn-danger cancel-booking-btn" data-booking-id="${booking.id}">لغو رزرو</button>`
                  : ""
              }
            </div>
          </div>
        `;
      };

      const bookingCardsHTML = bookedItems.map(createBookingCardHTML).join("");

      bookingsContainer.innerHTML = bookingCardsHTML;

      function getBookingButtonHTML(booking) {
        if (["pending", "approved"].includes(booking.status)) {
          return `<button class="btn btn-danger cancel-booking-btn" data-booking-id="${booking.id}">لغو رزرو</button>`;
        }
        if (["rejected", "cancelled"].includes(booking.status)) {
          return `<button class="btn btn-secondary hide-booking-btn" data-booking-id="${booking.id}">مخفی کردن</button>`;
        }

        return "";
      }

      const cancelButtons = bookingsContainer.querySelectorAll(
        ".cancel-booking-btn"
      );
      cancelButtons.forEach((button) => {
        button.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const bookingId = button.dataset.bookingId;
          if (confirm("آیا از لغو این رزرو اطمینان دارید؟")) {
            try {
              await apiCancelBooking(bookingId);
              populateBookingsPage();
            } catch (error) {
              alert(`خطا در لغو رزرو: ${error.message}`);
            }
          }
        });
      });

      const hideButtons =
        bookingsContainer.querySelectorAll(".hide-booking-btn");
      hideButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          button.closest(".booking-card-wrapper").style.display = "none";
        });
      });
    } catch (error) {
      console.error("Failed to load booked hotels:", error);
      bookingsContainer.innerHTML =
        '<p style="text-align: center; padding: 40px;">خطا در بارگذاری رزروها.</p>';
    }
  }

  function getUserRole() {
    const userString = localStorage.getItem("user");
    if (userString) {
      const user = JSON.parse(userString);
      return user.role || "tourist";
    }
    return "tourist";
  }

  function getActiveMode() {
    const activeMode = localStorage.getItem("activeMode");
    if (activeMode) {
      return activeMode;
    }

    return "tourist";
  }

  async function updateUserRole(newRole) {
    if (newRole === "host") {
      try {
        const data = await becomeHost();

        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        setActiveMode("host");

        updateFooterNav();
        populateProfilePage();
      } catch (error) {
        alert("خطا در ارتقا به میزبان: " + error.message);
      }
    }
  }

  function setActiveMode(newMode) {
    localStorage.setItem("activeMode", newMode);

    updateFooterNav();
    populateProfilePage();

    if (newMode === "admin") {
      window.location.hash = "#page-admin-dashboard";
    } else if (newMode === "host") {
      window.location.hash = "#page-host-dashboard";
    } else {
      window.location.hash = "#page-home";
    }
  }

  function updateFooterNav() {
    const nav = document.querySelector("footer nav");
    const activeMode = getActiveMode();

    if (activeMode === "admin") {
      nav.innerHTML = `
      <a href="#page-admin-dashboard" class="nav-link"><iconify-icon icon="mdi:view-dashboard"></iconify-icon><span>داشبورد</span></a>
      <a href="#page-admin-listings" class="nav-link"><iconify-icon icon="mdi:format-list-checks"></iconify-icon><span>در انتظار</span></a>
      <a href="#page-admin-users" class="nav-link"><iconify-icon icon="mdi:account-group"></iconify-icon><span>کاربران</span></a>
      <a href="#page-profile" class="nav-link"><iconify-icon icon="mdi:account-circle-outline"></iconify-icon><span>پروفایل</span></a>
    `;
    } else if (activeMode === "host") {
      nav.innerHTML = `
      <a href="#page-host-dashboard" class="nav-link"><iconify-icon icon="mdi:view-dashboard-outline"></iconify-icon><span>داشبورد</span></a>
      <a href="#page-host-accommodations" class="nav-link"><iconify-icon icon="mdi:home-city-outline"></iconify-icon><span>اقامتگاه‌ها</span></a>
      <a href="#page-host-bookings" class="nav-link"><iconify-icon icon="mdi:calendar-check-outline"></iconify-icon><span>رزروها</span></a>
      <a href="#page-profile" class="nav-link"><iconify-icon icon="mdi:account-circle-outline"></iconify-icon><span>پروفایل</span></a>
    `;
    } else {
      nav.innerHTML = `
      <a href="#page-home" class="nav-link active"><iconify-icon icon="mdi:home"></iconify-icon><span>خانه</span></a>
      <a href="#page-bookings" class="nav-link"><iconify-icon icon="mdi:book-open-variant"></iconify-icon><span>رزروها</span></a>
      <a href="#page-watchlist" class="nav-link"><iconify-icon icon="mdi:heart-outline"></iconify-icon><span>موردعلاقه‌ها</span></a>
      <a href="#page-profile" class="nav-link"><iconify-icon icon="mdi:account-circle-outline"></iconify-icon><span>پروفایل</span></a>
    `;
    }
  }

  async function populateProfilePage() {
    const roleContainer = document.getElementById("role-management-container");
    const usernameElement = document.getElementById("profile-username");
    const phoneElement = document.getElementById("profile-phone");

    const profileAvatar = document.getElementById("profile-page-avatar");

    usernameElement.textContent = "در حال بارگذاری...";
    phoneElement.textContent = "";
    profileAvatar.innerHTML = getInitials(null);

    try {
      const profileData = await getUserProfile();
      const user = profileData.data;
      usernameElement.textContent = user.username;
      phoneElement.textContent = user.phoneNumber;
      profileAvatar.innerHTML = getInitials(user.username);
    } catch (error) {
      usernameElement.textContent = "خطا در دریافت اطلاعات";
      profileAvatar.innerHTML = getInitials(null);
      console.error("Failed to load profile:", error);
    }
    const userString = localStorage.getItem("user");

    if (!userString) {
      roleContainer.innerHTML = "";
      return;
    }

    const user = JSON.parse(userString);
    const activeMode = getActiveMode();
    let roleHtml = "";

    if (user.role === "admin") {
      const nextAdminMode = activeMode === "admin" ? "tourist" : "admin";
      const adminButtonText =
        activeMode === "admin" ? "خروج از حالت ادمین" : "ورود به پنل مدیریت";

      roleHtml += `
      <a href="#" id="toggle-admin-mode-button" class="menu-item" style="color: #3b82f6; font-weight: bold;">
        <iconify-icon icon="mdi:shield-account"></iconify-icon>
        <span>${adminButtonText}</span>
        <iconify-icon icon="mdi:chevron-left"></iconify-icon>
      </a>
    `;
    }

    if (user.can_host === 1) {
      const nextHostMode = activeMode === "host" ? "tourist" : "host";
      const hostButtonText =
        activeMode === "host" ? "ورود به حالت توریست" : "ورود به حالت میزبان";

      roleHtml += `
      <a href="#" id="toggle-host-mode-button" class="menu-item">
        <iconify-icon icon="mdi:swap-horizontal-bold"></iconify-icon>
        <span>${hostButtonText}</span>
        <iconify-icon icon="mdi:chevron-left"></iconify-icon>
      </a>
    `;
    } else if (user.role === "tourist" && user.can_host === 0) {
      roleHtml += `
      <a href="#" id="become-host-button" class="menu-item">
        <iconify-icon icon="mdi:store-plus-outline"></iconify-icon>
        <span>میزبان شوید</span>
        <iconify-icon icon="mdi:chevron-left"></iconify-icon>
      </a>
    `;
    }

    roleContainer.innerHTML = roleHtml;

    const adminToggleButton = document.getElementById(
      "toggle-admin-mode-button"
    );
    if (adminToggleButton) {
      adminToggleButton.addEventListener("click", (e) => {
        e.preventDefault();
        const nextAdminMode = getActiveMode() === "admin" ? "tourist" : "admin";
        setActiveMode(nextAdminMode);
      });
    }

    const hostToggleButton = document.getElementById("toggle-host-mode-button");
    if (hostToggleButton) {
      hostToggleButton.addEventListener("click", (e) => {
        e.preventDefault();
        const nextHostMode = getActiveMode() === "host" ? "tourist" : "host";
        setActiveMode(nextHostMode);
      });
    }

    const becomeHostButton = document.getElementById("become-host-button");
    if (becomeHostButton) {
      becomeHostButton.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("آیا می‌خواهید حساب خود را به عنوان میزبان فعال کنید؟")) {
          updateUserRole("host");
        }
      });
    }
  }

  async function saveHostAccommodation(accommodationData, saveButton) {
    try {
      if (accommodationData.id) {
        await updateAccommodation(accommodationData.id, accommodationData);
        alert("اقامتگاه با موفقیت ویرایش شد.");
      } else {
        await createAccommodation(accommodationData);
        alert("اقامتگاه با موفقیت ثبت شد.");
      }
      window.location.hash = "#page-host-accommodations";
    } catch (error) {
      alert("خطا در ذخیره اقامتگاه: " + error.message);
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "ذخیره اقامتگاه";
      }
    }
  }

  async function populateHostAccommodationsPage() {
    const accommodationsListContainer = document.getElementById(
      "host-accommodations-list"
    );
    const registerButton = document.getElementById(
      "register-accommodation-button"
    );

    accommodationsListContainer.innerHTML =
      '<p class="placeholder-full-width">در حال بارگذاری اقامتگاه‌ها...</p>';

    if (registerButton) {
      registerButton.onclick = (e) => {
        e.preventDefault();
        window.location.hash = "#page-create-accommodation";
      };
    }

    const hostAccommodations = (await apiGetHostAccommodations()).data;

    if (hostAccommodations.length === 0) {
      accommodationsListContainer.innerHTML =
        '<p class="placeholder-full-width">شما هنوز اقامتگاهی ثبت نکرده‌اید.</p>';
    } else {
      accommodationsListContainer.innerHTML = hostAccommodations
        .map((acc) => {
          const hotelLikeObject = {
            id: acc.id,
            name: acc.name,
            image_url: acc.image_url,
            address: acc.address,
            price_per_night: acc.price_per_night,
            star_rating: acc.star_rating,
          };
          return `
          <div class="host-accommodation-card-wrapper">
            ${createAccommodationCardHTML(hotelLikeObject)}
            <div class="host-accommodation-actions">
              <button class="btn btn-primary btn-small edit-accommodation-btn" data-id="${
                acc.id
              }">ویرایش</button>
              <button class="btn btn-danger btn-small delete-accommodation-btn" data-id="${
                acc.id
              }">حذف</button>
            </div>
          </div>
        `;
        })
        .join("");
      accommodationsListContainer
        .querySelectorAll(".edit-accommodation-btn")
        .forEach((button) => {
          button.addEventListener("click", (e) => {
            const accommodationId = e.target.dataset.id;
            window.location.hash = `#page-create-accommodation?id=${accommodationId}`;
          });
        });

      accommodationsListContainer
        .querySelectorAll(".delete-accommodation-btn")
        .forEach((button) => {
          button.addEventListener("click", async (e) => {
            const accommodationId = e.target.dataset.id;
            if (
              confirm(
                "آیا از حذف این اقامتگاه اطمینان دارید؟ این عمل قابل بازگشت نیست."
              )
            ) {
              try {
                await deleteAccommodation(accommodationId);
                alert("اقامتگاه با موفقیت حذف شد.");
                populateHostAccommodationsPage();
              } catch (error) {
                alert(`خطا در حذف اقامتگاه: ${error.message}`);
              }
            }
          });
        });
    }
  }

  let handleSaveAccommodation = null;

  async function populateCreateEditAccommodationForm(accommodationId = null) {
    const formTitle = document.getElementById("accommodation-form-title");
    const accommodationForm = document.getElementById("accommodation-form");
    const saveButton = document.getElementById("save-accommodation-button");

    accommodationForm.reset();
    saveButton.textContent = "ذخیره اقامتگاه";
    saveButton.disabled = false;

    let currentAccommodation = null;

    if (accommodationId) {
      formTitle.textContent = "ویرایش اقامتگاه";
      const accommodations = (await apiGetHostAccommodations()).data;
      currentAccommodation = accommodations.find(
        (acc) => acc.id === parseInt(accommodationId, 10)
      );
      if (currentAccommodation) {
        document.getElementById("accommodation-name").value =
          currentAccommodation.name;
        document.getElementById("accommodation-address").value =
          currentAccommodation.address;
        document.getElementById("accommodation-description").value =
          currentAccommodation.description;
        document.getElementById("accommodation-price").value =
          currentAccommodation.price_per_night;
        document.getElementById("accommodation-stars").value =
          currentAccommodation.star_rating;
        document.getElementById("accommodation-image-url").value =
          currentAccommodation.image_url;
      } else {
        alert("اقامتگاه برای ویرایش یافت نشد.");
        window.location.hash = "#page-host-accommodations";
        return;
      }
    } else {
      formTitle.textContent = "ثبت اقامتگاه جدید";
    }

    if (handleSaveAccommodation) {
      saveButton.removeEventListener("click", handleSaveAccommodation);
    }

    handleSaveAccommodation = async (e) => {
      e.preventDefault();
      saveButton.disabled = true;
      saveButton.textContent = "در حال ذخیره...";

      const accommodationData = {
        id: currentAccommodation ? currentAccommodation.id : null,
        name: document.getElementById("accommodation-name").value,
        address: document.getElementById("accommodation-address").value,
        description: document.getElementById("accommodation-description").value,
        price: parseFloat(document.getElementById("accommodation-price").value),
        stars: parseInt(document.getElementById("accommodation-stars").value),
        image_url: document.getElementById("accommodation-image-url").value,
      };

      await saveHostAccommodation(accommodationData, saveButton);
    };

    saveButton.addEventListener("click", handleSaveAccommodation);
  }

  async function populateHostDashboardPage() {
    const container = document.querySelector("#page-host-dashboard");

    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    if (!user || user.can_host !== 1) {
      container.innerHTML = `<div class="page-header"><h2>دسترسی ممنوع</h2></div><p class="placeholder-full-width">قابلیت میزبانی برای شما فعال نیست یا حساب شما معلق شده است.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>داشبورد میزبان</h2>
      </div>
      <p class="placeholder-full-width">در حال بارگذاری خلاصه فعالیت‌ها...</p>
    `;

    try {
      const [accommodationsResponse, bookingsResponse] = await Promise.all([
        apiGetHostAccommodations(),
        getHostBookings(),
      ]);

      const accommodations = accommodationsResponse.data;
      const bookings = bookingsResponse.data;

      const totalAccommodations = accommodations.length;
      const totalBookings = bookings.length;
      const pendingBookings = bookings.filter(
        (b) => b.status === "pending"
      ).length;
      const approvedBookings = bookings.filter(
        (b) => b.status === "approved"
      ).length;

      container.innerHTML = `
        <div class="page-header">
          <h2>داشبورد میزبان</h2>
        </div>
        <div class="dashboard-summary">
          <div class="summary-card"><p class="count">${totalAccommodations}</p><p class="label">کل اقامتگاه‌ها</p></div>
          <div class="summary-card"><p class="count">${totalBookings}</p><p class="label">کل رزروها</p></div>
          <div class="summary-card"><p class="count">${pendingBookings}</p><p class="label">رزروهای در انتظار</p></div>
          <div class="summary-card"><p class="count">${approvedBookings}</p><p class="label">رزروهای تایید شده</p></div>
        </div>
      `;
    } catch (error) {
      console.error("Failed to load host dashboard data:", error);
      container.querySelector(".placeholder-full-width").textContent =
        "خطا در بارگذاری اطلاعات داشبورد.";
    }
  }
  async function populateHostBookingsPage() {
    const container = document.querySelector("#page-host-bookings");

    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    if (!user || user.can_host !== 1) {
      container.innerHTML = `<div class="page-header"><h2>دسترسی ممنوع</h2></div><p class="placeholder-full-width">قابلیت میزبانی برای شما فعال نیست یا حساب شما معلق شده است.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>مدیریت رزروها</h2>
      </div>
      <p class="placeholder-full-width">در حال بارگذاری درخواست‌های رزرو...</p>
    `;

    try {
      const response = await getHostBookings();
      const bookings = response.data;

      if (bookings.length === 0) {
        container.innerHTML = `
          <div class="page-header">
            <h2>مدیریت رزروها</h2>
          </div>
          <p class="placeholder-full-width">در حال حاضر هیچ درخواست رزروی برای اقامتگاه‌های شما وجود ندارد.</p>
        `;
        return;
      }

      const bookingsHTML = bookings
        .map((booking) => {
          const checkInDate = new Date(booking.check_in_date);
          const checkOutDate = new Date(booking.check_out_date);
          const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
          const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
          const totalPrice = nights * (booking.price_per_night || 0);
          const formattedTotalPrice = new Intl.NumberFormat("fa-IR").format(
            totalPrice
          );

          return `
        <div class="host-booking-card">
          <h4>رزرو برای: ${booking.accommodation_name}</h4>
          <div class="host-booking-details">
            <p><strong>مشتری:</strong> ${booking.user_username}</p>
            <p><strong>شماره تماس:</strong> ${booking.user_phoneNumber}</p>
            <p><strong>تاریخ ورود:</strong> ${booking.check_in_date}</p>
            <p><strong>تاریخ خروج:</strong> ${booking.check_out_date}</p>
            <p><strong>تعداد مهمان:</strong> ${booking.number_of_guests}</p>
            <p><strong>تعداد شب:</strong> ${nights}</p>
            <p><strong>مبلغ کل:</strong> ${formattedTotalPrice} تومان</p>
            <p><strong>وضعیت:</strong> <span class="status-badge status-${
              booking.status
            }">${booking.status}</span></p>
          </div>
          ${
            booking.status === "pending"
              ? `
            <div class="host-booking-actions">
              <button class="btn btn-primary approve-booking-btn" data-id="${booking.id}">تایید</button>
              <button class="btn btn-danger reject-booking-btn" data-id="${booking.id}">رد کردن</button>
            </div>
          `
              : ""
          }
        </div>
      `;
        })
        .join("");

      container.innerHTML = `
        <div class="page-header">
          <h2>مدیریت رزروها</h2>
        </div>
        ${bookingsHTML}
      `;

      container.querySelectorAll(".approve-booking-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          await approveBooking(button.dataset.id);
          populateHostBookingsPage();
        });
      });

      container.querySelectorAll(".reject-booking-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          await rejectBooking(button.dataset.id);
          populateHostBookingsPage();
        });
      });
    } catch (error) {
      console.error("Failed to load host bookings:", error);
      container.innerHTML = `
        <div class="page-header">
          <h2>مدیریت رزروها</h2>
        </div>
        <p class="placeholder-full-width">خطا در بارگذاری رزروها.</p>
      `;
    }
  }

  function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("activeMode");
    showPage("#page-login");
  }

  const logoutButton = document.querySelector("#logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }

  function resetSearchPage() {
    const searchInput = document.querySelector(
      "#page-search-results .search-bar input"
    );
    if (searchInput) searchInput.value = "";

    const starMenu = document.getElementById("star-filter-menu");
    if (starMenu) {
      starMenu
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
    }

    const priceMenu = document.getElementById("price-filter-menu");
    if (priceMenu) {
      const defaultPrice = priceMenu.querySelector('input[value="all"]');
      if (defaultPrice) defaultPrice.checked = true;
    }

    const sortMenu = document.getElementById("sort-filter-menu");
    if (sortMenu) {
      const defaultSort = sortMenu.querySelector('input[value="default"]');
      if (defaultSort) defaultSort.checked = true;
    }
  }

  function populatePaymentPage() {
    const tempBooking = JSON.parse(sessionStorage.getItem("tempBooking"));
    if (!tempBooking) {
      alert("اطلاعات رزرو یافت نشد.");
      window.location.hash = "#page-home";
      return;
    }

    document.getElementById("payment-amount").textContent =
      tempBooking.totalPrice;
    if (tempBooking.guestName) {
      document.getElementById("card-holder-name").textContent =
        tempBooking.guestName.toUpperCase();
    }

    const cancelPaymentBtn = document.querySelector(
      "#page-payment .btn-danger"
    );
    if (cancelPaymentBtn) {
      const newCancelBtn = cancelPaymentBtn.cloneNode(true);
      cancelPaymentBtn.parentNode.replaceChild(newCancelBtn, cancelPaymentBtn);

      newCancelBtn.addEventListener("click", () => {
        window.location.hash = "#page-home";
      });
    }

    const processBtn = document.getElementById("process-payment-button");
    const newProcessBtn = processBtn.cloneNode(true);
    processBtn.parentNode.replaceChild(newProcessBtn, processBtn);

    newProcessBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const cardInput = document.querySelector(
        "#payment-form input[type='tel']"
      ).value;
      const passInput = document.querySelector(
        "#payment-form input[type='password']"
      ).value;

      if (!cardInput || !passInput) {
        alert("لطفاً شماره کارت و رمز دوم را وارد کنید.");
        return;
      }

      newProcessBtn.innerHTML =
        '<div class="spinner" style="width:20px; height:20px; border-width:2px; display:inline-block; vertical-align:middle;"></div> در حال پرداخت...';
      newProcessBtn.disabled = true;

      setTimeout(async () => {
        try {
          const bookingData = {
            accommodation_id: tempBooking.hotelId,
            check_in_date: tempBooking.checkInDate,
            check_out_date: tempBooking.checkOutDate,
            number_of_guests: tempBooking.numberOfGuests,
          };

          await createBooking(bookingData);

          const trackingCode = Math.floor(Math.random() * 90000000) + 10000000;

          sessionStorage.removeItem("tempBooking");

          alert(
            `پرداخت با موفقیت انجام شد!\nشماره پیگیری: ${trackingCode}\nوضعیت رزرو: در انتظار تایید میزبان`
          );

          window.location.hash = "#page-bookings";
        } catch (error) {
          alert(`خطا در ثبت نهایی رزرو: ${error.message}`);
          newProcessBtn.innerHTML =
            '<iconify-icon icon="mdi:check-circle-outline"></iconify-icon> پرداخت و تکمیل رزرو';
          newProcessBtn.disabled = false;
        }
      }, 2000);
    });
  }

  async function router() {
    updateFooterNav();

    const homeAvatar = document.getElementById("home-profile-avatar");
    if (homeAvatar) {
      const userString = localStorage.getItem("user");
      if (userString) {
        const user = JSON.parse(userString);
        homeAvatar.innerHTML = getInitials(user.username);
      } else {
        homeAvatar.innerHTML = getInitials(null);
      }
    }

    const isAuthenticated = !!localStorage.getItem("token");
    const userString = localStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;

    const touristPages = [
      "#page-home",
      "#page-details",
      "#page-bookings",
      "#page-watchlist",
      "#page-book-hotel",
      "#page-profile",
      "#page-book-hotel",
      "#page-search-results",
      "#page-payment",
    ];
    const hostPages = [
      "#page-host-dashboard",
      "#page-host-accommodations",
      "#page-host-bookings",
      "#page-create-accommodation",
    ];
    const adminPages = [
      "#page-admin-dashboard",
      "#page-admin-listings",
      "#page-admin-users",
      "#page-admin-edit-user",
    ];

    const sharedProtectedPages = ["#page-profile"];

    const allProtectedPages = [
      ...touristPages,
      ...hostPages,
      ...adminPages,
      ...sharedProtectedPages,
    ];

    let path = window.location.hash || "#page-home";

    const basePath = path.split("?")[0];

    if (basePath === "#page-login") {
      const loginForm = document.querySelector("#page-login form");
      if (loginForm) loginForm.reset();
    }
    if (basePath === "#page-signup") {
      const signupForm = document.querySelector("#page-signup form");
      if (signupForm) signupForm.reset();
    }
    if (basePath === "#page-home") {
      const homeSearch = document.querySelector("#page-home .search-bar input");
      if (homeSearch) homeSearch.value = "";
      await populateHotelSliders();
    }

    if (allProtectedPages.includes(basePath) && !isAuthenticated) {
      window.location.hash = "#page-login";
      return;
    }

    if (user) {
      if (adminPages.includes(basePath) && user.role !== "admin") {
        console.warn("Access Denied: Admin Only");
        window.location.hash = "#page-home";
        return;
      }

      if (
        hostPages.includes(basePath) &&
        user.role !== "host" &&
        user.role !== "admin"
      ) {
        console.warn("Access Denied: Host/Admin Only");
        window.location.hash = "#page-home";
        return;
      }
    }

    if (
      (basePath === "#page-login" || basePath === "#page-signup") &&
      isAuthenticated
    ) {
      window.location.hash = "#page-home";
      return;
    }

    if (path.startsWith("#page-details?hotel=")) {
      const hotelId = parseInt(path.split("=")[1], 10);
      showPage("#page-details");
      await populateDetailsPage(hotelId);
    } else if (path.startsWith("#page-book-hotel?hotel=")) {
      const hotelId = parseInt(path.split("=")[1], 10);
      showPage("#page-book-hotel");
      populateBookHotelPage(hotelId);
    } else if (path === "#page-watchlist") {
      showPage("#page-watchlist");
      await populateWatchlistPage();
    } else if (path === "#page-bookings") {
      showPage("#page-bookings");
      await populateBookingsPage();
    } else if (path === "#page-profile") {
      showPage("#page-profile");
      await populateProfilePage();
    } else if (path === "#page-host-dashboard") {
      showPage("#page-host-dashboard");
      await populateHostDashboardPage();
    } else if (path === "#page-host-accommodations") {
      showPage("#page-host-accommodations");
      await populateHostAccommodationsPage();
    } else if (path.startsWith("#page-create-accommodation")) {
      const accommodationId = new URLSearchParams(path.split("?")[1]).get("id");
      showPage("#page-create-accommodation");
      await populateCreateEditAccommodationForm(accommodationId);
    } else if (path === "#page-host-bookings") {
      showPage("#page-host-bookings");
      populateHostBookingsPage();
    } else if (path === "#page-admin-dashboard") {
      showPage("#page-admin-dashboard");
      await populateAdminDashboardPage();
    } else if (path === "#page-admin-listings") {
      showPage("#page-admin-listings");
      await populateAdminListingsPage();
    } else if (path === "#page-admin-users") {
      showPage("#page-admin-users");
      await populateAdminUsersPage();
    } else if (path.startsWith("#page-admin-edit-user")) {
      const userId = new URLSearchParams(path.split("?")[1]).get("id");
      showPage("#page-admin-edit-user");
      await populateAdminEditUserPage(userId);
    } else if (path.startsWith("#page-search-results")) {
      const params = new URLSearchParams(path.split("?")[1]);
      const query = params.get("q") || "";
      const sort = params.get("sort") || null;

      resetSearchPage();

      showPage("#page-search-results");

      await handleSearchAndFilter(query, {}, sort);
    } else if (path === "#page-payment") {
      showPage("#page-payment");
      populatePaymentPage();
    } else {
      showPage(basePath);
    }
  }

  window.addEventListener("hashchange", router);

  const homeSearchInput = document.querySelector(
    "#page-home .search-bar input"
  );
  homeSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && homeSearchInput.value.trim() !== "") {
      window.location.hash = `#page-search-results?q=${homeSearchInput.value.trim()}`;
    }
  });

  const searchResultsInput = document.querySelector(
    "#page-search-results .search-bar input"
  );

  let currentFiltersState = {};

  function getCurrentFiltersAndSort() {
    const starMenu = document.getElementById("star-filter-menu");
    const checkedStars = [
      ...starMenu.querySelectorAll('input[name="star"]:checked'),
    ].map((el) => el.value);

    const priceMenu = document.getElementById("price-filter-menu");
    const selectedPrice = priceMenu.querySelector(
      'input[name="price"]:checked'
    ).value;

    const sortMenu = document.getElementById("sort-filter-menu");
    const selectedSort = sortMenu.querySelector(
      'input[name="sort"]:checked'
    ).value;

    return { stars: checkedStars, price: selectedPrice, sort: selectedSort };
  }

  searchResultsInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearchAndFilter(
        searchResultsInput.value.trim(),
        getCurrentFiltersAndSort(),
        null
      );
    }
  });

  new Swiper(".filter-swiper", {
    slidesPerView: "auto",
    spaceBetween: 8,
    freeMode: true,
  });

  const filterButtons = document.querySelectorAll(".filter-button");
  const allFilterMenus = document.querySelectorAll(".filter-menu");

  filterButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const targetMenuId = button.dataset.filterTarget;
      const menu = document.getElementById(targetMenuId);

      allFilterMenus.forEach((otherMenu) => {
        if (otherMenu !== menu && otherMenu.classList.contains("show")) {
          otherMenu.classList.remove("show");
        }
      });

      menu.classList.toggle("show");

      if (menu.classList.contains("show")) {
        const buttonRect = button.getBoundingClientRect();
        const headerRect = document
          .querySelector(".search-header-fixed")
          .getBoundingClientRect();
        menu.style.top = `${buttonRect.bottom - headerRect.top + 10}px`;
        menu.style.right = `${headerRect.right - buttonRect.right}px`;
      }
    });

    const menu = document.getElementById(button.dataset.filterTarget);
    if (menu) {
      const applyBtn = menu.querySelector(".apply-filters");
      applyBtn.addEventListener("click", () => {
        const query = searchResultsInput.value.trim();
        const filtersAndSort = getCurrentFiltersAndSort();
        handleSearchAndFilter(query, filtersAndSort, null);
        menu.classList.remove("show");
      });
    }
  });

  document.addEventListener("click", (e) => {
    allFilterMenus.forEach((menu) => {
      const isClickInsideMenu = menu.contains(e.target);
      const isClickOnFilterButton = e.target.closest(".filter-button");

      const controllingButton = document.querySelector(
        `[data-filter-target="${menu.id}"]`
      );

      if (
        !isClickInsideMenu &&
        controllingButton &&
        !controllingButton.contains(e.target)
      ) {
        menu.classList.remove("show");
      }
    });
  });

  async function populateAdminDashboardPage() {
    const statsContainer = document.getElementById("admin-stats-container");
    statsContainer.innerHTML =
      '<p class="placeholder-full-width">در حال بارگذاری آمار...</p>';

    try {
      const response = await adminGetDashboardStats();
      const stats = response.data;

      statsContainer.innerHTML = `
      <div class="dashboard-summary">
        <div class="summary-card">
          <p class="count">${stats.totalUsers}</p>
          <p class="label">کل کاربران</p>
        </div>
        <div class="summary-card">
          <p class="count">${stats.totalHosts}</p>
          <p class="label">کل میزبان‌ها</p>
        </div>
        <div class="summary-card">
          <p class="count">${stats.totalListings}</p>
          <p class="label">کل اقامتگاه‌ها</p>
        </div>
        <div class="summary-card">
          <p class="count" style="color: ${
            stats.pendingListings > 0 ? "#f59e0b" : "#10b981"
          };">
            ${stats.pendingListings}
          </p>
          <p class="label">در انتظار تایید</p>
        </div>
      </div>
      
      <h3 style="margin-top: 30px; border-bottom: none;">اقدامات سریع</h3>
      <div class="admin-quick-actions">
        <a href="#page-admin-listings" class="btn btn-primary nav-link">
          <iconify-icon icon="mdi:format-list-checks"></iconify-icon>
          <span>بررسی اقامتگاه‌ها (${stats.pendingListings})</span>
        </a>
        <a href="#page-admin-users" class="btn btn-secondary nav-link">
          <iconify-icon icon="mdi:account-group"></iconify-icon>
          <span>مدیریت کاربران</span>
        </a>
      </div>
    `;
    } catch (error) {
      console.error("Failed to load admin dashboard:", error);
      statsContainer.innerHTML =
        '<p class="placeholder-full-width">خطا در بارگذاری آمار داشبورد.</p>';
    }
  }

  async function populateAdminListingsPage() {
    const pendingListContainer = document.getElementById("admin-pending-list");
    pendingListContainer.innerHTML =
      '<p class="placeholder-full-width">در حال بارگذاری...</p>';

    try {
      const pendingResponse = await adminGetPendingListings();
      const pendingListings = pendingResponse.data;

      if (pendingListings.length === 0) {
        pendingListContainer.innerHTML =
          '<p class="placeholder-full-width">هیچ اقامتگاهی در انتظار تایید نیست.</p>';
      } else {
        pendingListContainer.innerHTML = pendingListings
          .map(
            (listing) => `
        <div class="admin-card">
          <p><strong>${listing.name}</strong> (ID: ${listing.id})</p>
          <p>مالک: (User ID: ${listing.owner_id})</p>
          <div class="admin-actions">
            <button class="btn btn-primary btn-small admin-action-btn" data-action="approve" data-id="${listing.id}">تایید</button>
            <button class="btn btn-danger btn-small admin-action-btn" data-action="reject" data-id="${listing.id}">رد کردن</button>
            <button class="btn btn-secondary btn-small admin-action-btn" data-action="suspend" data-id="${listing.id}">تعلیق</button>
          </div>
        </div>
      `
          )
          .join("");
      }
    } catch (error) {
      pendingListContainer.innerHTML =
        '<p class="placeholder-full-width">خطا در بارگذاری داده‌ها.</p>';
    }
  }

  async function populateAdminUsersPage() {
    const userListContainer = document.getElementById("admin-user-list");
    const filterContainer = document.getElementById("admin-user-filters");

    new Swiper("#page-admin-users .filter-swiper", {
      slidesPerView: "auto",
      spaceBetween: 8,
      freeMode: true,
    });

    userListContainer.innerHTML =
      '<p class="placeholder-full-width">در حال بارگذاری...</p>';

    let allUsers = [];

    function renderUserList(filterRole) {
      let filteredUsers = allUsers;

      if (filterRole === "host") {
        filteredUsers = allUsers.filter((user) => user.role === "host");
      } else if (filterRole === "tourist") {
        filteredUsers = allUsers.filter((user) => user.role === "tourist");
      }

      filterContainer.querySelectorAll(".filter-button").forEach((btn) => {
        if (btn.dataset.filter === filterRole) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });

      if (filteredUsers.length === 0) {
        if (filterRole === "all") {
          userListContainer.innerHTML =
            '<p class="placeholder-full-width">کاربری یافت نشد.</p>';
        } else {
          userListContainer.innerHTML = `<p class="placeholder-full-width">هیچ کاربری با نقش "${filterRole}" یافت نشد.</p>`;
        }
      } else {
        userListContainer.innerHTML = filteredUsers
          .map(
            (user) => `
        <div class="admin-card">
          <p><strong>${user.username}</strong> (ID: ${user.id})</p>
          <p>نقش: ${user.role} | وضعیت: ${user.status}</p>
          <p>امکان رزرو: ${user.can_book ? "دارد" : "ندارد"} | امکان میزبانی: ${
              user.can_host ? "دارد" : "ندارد"
            }</p>
          <div class="admin-actions">
            <a href="#page-admin-edit-user?id=${
              user.id
            }" class="btn btn-primary btn-small nav-link">ویرایش دسترسی</a>
          </div>
        </div>
      `
          )
          .join("");
      }
    }

    try {
      const usersResponse = await adminGetAllUsers();
      allUsers = usersResponse.data;

      renderUserList("all");

      filterContainer.querySelectorAll(".filter-button").forEach((button) => {
        button.addEventListener("click", () => {
          const filter = button.dataset.filter;
          renderUserList(filter);
        });
      });
    } catch (error) {
      userListContainer.innerHTML =
        '<p class="placeholder-full-width">خطا در بارگذاری داده‌ها.</p>';
    }
  }

  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("admin-action-btn")) {
      const action = event.target.dataset.action;
      const id = event.target.dataset.id;
      let statusToSet = "";

      if (action === "approve") statusToSet = "approved";
      else if (action === "reject") statusToSet = "rejected";
      else if (action === "suspend") statusToSet = "suspended";
      else return;

      if (
        confirm(`آیا از "${action}" کردن این مورد (ID: ${id}) اطمینان دارید؟`)
      ) {
        try {
          await adminUpdateListingStatus(id, statusToSet);
          alert("وضعیت با موفقیت تغییر کرد.");
          populateAdminListingsPage();
        } catch (error) {
          alert(`عملیات ناموفق بود: ${error.message}`);
        }
      }
    }

    if (event.target.dataset.action === "edit-user") {
      const userId = event.target.dataset.id;

      alert(
        `دکمه ویرایش برای کاربر ${userId} کلیک شد. \nUI ویرایش هنوز پیاده‌سازی نشده است.`
      );
    }
  });

  async function populateAdminEditUserPage(userId) {
    const formContainer = document.getElementById(
      "admin-edit-user-form-container"
    );
    formContainer.innerHTML =
      '<p class="placeholder-full-width">در حال بارگذاری اطلاعات کاربر...</p>';

    try {
      const response = await adminGetUserDetails(userId);
      const user = response.data;

      if (!user) {
        formContainer.innerHTML =
          '<p class="placeholder-full-width">کاربر یافت نشد.</p>';
        return;
      }

      formContainer.innerHTML = `
      <form id="admin-edit-form">
        <p><strong>کاربر: ${user.username}</strong> (ID: ${user.id})</p>
        
        <div class="input-group">
          <label for="edit-user-role">نقش (Role)</label>
          <select id="edit-user-role" required>
            <option value="tourist" ${
              user.role === "tourist" ? "selected" : ""
            }>Tourist</option>
            <option value="host" ${
              user.role === "host" ? "selected" : ""
            }>Host</option>
            <option value="admin" ${
              user.role === "admin" ? "selected" : ""
            }>Admin</option>
          </select>
          <iconify-icon icon="mdi:account-tie"></iconify-icon>
        </div>

        <div class="input-group">
          <label for="edit-user-status">وضعیت (Status)</label>
          <select id="edit-user-status" required>
            <option value="active" ${
              user.status === "active" ? "selected" : ""
            }>Active</option>
            <option value="suspended" ${
              user.status === "suspended" ? "selected" : ""
            }>Suspended</option>
          </select>
          <iconify-icon icon="mdi:account-lock"></iconify-icon>
        </div>

        <div class="form-checkbox-group">
          <label>
            <input type="checkbox" id="edit-user-can-book" ${
              user.can_book ? "checked" : ""
            }>
            <span>امکان رزرو دارد (can_book)</span>
          </label>
          <label>
            <input type="checkbox" id="edit-user-can-host" ${
              user.can_host ? "checked" : ""
            }>
            <span>امکان میزبانی دارد (can_host)</span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary full-width" id="admin-save-user-button">
          <iconify-icon icon="mdi:content-save-outline"></iconify-icon>
          <span>ذخیره تغییرات</span>
        </button>
      </form>
    `;

      const saveButton = document.getElementById("admin-save-user-button");
      saveButton.addEventListener("click", async (e) => {
        e.preventDefault();
        saveButton.disabled = true;
        saveButton.textContent = "در حال ذخیره...";

        try {
          const accessData = {
            role: document.getElementById("edit-user-role").value,
            status: document.getElementById("edit-user-status").value,
            can_book: document.getElementById("edit-user-can-book").checked
              ? 1
              : 0,
            can_host: document.getElementById("edit-user-can-host").checked
              ? 1
              : 0,
          };

          await adminUpdateUserAccess(user.id, accessData);
          alert("دسترسی کاربر با موفقیت به‌روز شد.");
          window.location.hash = "#page-admin-users";
        } catch (error) {
          alert(`خطا در ذخیره: ${error.message}`);
          saveButton.disabled = false;
          saveButton.textContent = "ذخیره تغییرات";
        }
      });
    } catch (error) {
      console.error("Failed to populate admin edit user page:", error);
      formContainer.innerHTML =
        '<p class="placeholder-full-width">خطا در بارگذاری اطلاعات.</p>';
    }
  }
});
