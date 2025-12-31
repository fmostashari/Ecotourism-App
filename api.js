const API_BASE_URL = "http://10.195.163.64:4000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `An API error occurred for endpoint: ${endpoint}`
      );
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

async function loginUser(username, password) {
  return fetchAPI("/Login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      UserName: username,
      Password: password,
    }),
  });
}

async function registerUser(username, password, phoneNumber) {
  return fetchAPI("/Register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      UserName: username,
      Password: password,
      PhoneNumber: phoneNumber,
    }),
  });
}

async function becomeHost() {
  try {
    const response = await fetch(`${API_BASE_URL}/users/become-host`, {
      method: "POST",
      headers: getAuthHeaders(), // از تابع کمکی استفاده کنید
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error("Become Host API Error: ", error);
    throw error;
  }
}

async function createAccommodation(accommodationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/accommodations`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(accommodationData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error("Create Accommodation API Error: ", error);
    throw error;
  }
}

async function getAccommodations() {
  return fetchAPI("/accommodations");
}

async function getAccommodationById(id) {
  return fetchAPI(`/accommodations/${id}`);
}

async function getMyBookings() {
  return fetchAPI("/bookings/my-reservations", { headers: getAuthHeaders() });
}

async function createBooking(bookingData) {
  return fetchAPI("/bookings", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(bookingData),
  });
}

async function cancelBooking(bookingId) {
  return fetchAPI(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

async function getFavorites() {
  return fetchAPI("/favorites", { headers: getAuthHeaders() });
}

async function addFavorite(accommodationId) {
  return fetchAPI("/favorites", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ accommodation_id: accommodationId }),
  });
}

async function removeFavorite(accommodationId) {
  return fetchAPI(`/favorites/${accommodationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

async function deleteAccommodation(accommodationId) {
  return fetchAPI(`/host/accommodations/${accommodationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

async function getHostAccommodations() {
  return fetchAPI("/host/accommodations", { headers: getAuthHeaders() });
}

async function getHostBookings() {
  return fetchAPI("/host/bookings", { headers: getAuthHeaders() });
}

async function updateAccommodation(accommodationId, accommodationData) {
  return fetchAPI(`/host/accommodations/${accommodationId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(accommodationData),
  });
}

async function approveBooking(bookingId) {
  return fetchAPI(`/host/bookings/${bookingId}/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

async function rejectBooking(bookingId) {
  return fetchAPI(`/host/bookings/${bookingId}/reject`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

async function getUserProfile() {
  return fetchAPI("/users/profile", { headers: getAuthHeaders() });
}

// --- ADMIN API FUNCTIONS ---

// گرفتن لیست اقامتگاه‌های در انتظار
const adminGetPendingListings = () => {
  return fetchAPI("/admin/listings/pending", { headers: getAuthHeaders() });
};

// تغییر وضعیت یک اقامتگاه (تایید/رد)
const adminUpdateListingStatus = (id, status) => {
  return fetchAPI(`/admin/listings/${id}/status`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
};

// گرفتن لیست همه کاربران
const adminGetAllUsers = () => {
  return fetchAPI("/admin/users", { headers: getAuthHeaders() });
};

// به‌روزرسانی دسترسی یک کاربر
const adminUpdateUserAccess = (id, accessData) => {
  // accessData = { role, status, can_book, can_host }
  return fetchAPI(`/admin/users/${id}/access`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(accessData),
  });
};

const adminGetDashboardStats = () => {
  return fetchAPI("/admin/dashboard", { headers: getAuthHeaders() });
};

const adminGetUserDetails = (id) => {
  return fetchAPI(`/admin/users/${id}`, { headers: getAuthHeaders() });
};

export {
  loginUser,
  registerUser,
  becomeHost,
  createAccommodation,
  getAccommodations,
  getAccommodationById,
  getMyBookings,
  createBooking,
  cancelBooking,
  getFavorites,
  addFavorite,
  deleteAccommodation,
  removeFavorite,
  getHostAccommodations,
  getHostBookings,
  approveBooking,
  updateAccommodation,
  rejectBooking,
  getUserProfile,
  adminGetPendingListings,
  adminUpdateListingStatus,
  adminGetAllUsers,
  adminGetUserDetails,
  adminUpdateUserAccess,
  adminGetDashboardStats,
};
