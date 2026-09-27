// =====================================================
// CARECOMPANION API CONFIGURATION
// =====================================================

const API_BASE_URL = "http://127.0.0.1:5000/api";


// =====================================================
// GENERIC API REQUEST
// =====================================================

async function apiRequest(endpoint, options = {}) {

    try {

        const token = localStorage.getItem(
            "carecompanion_token"
        );

        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers,
                mode: "cors"
            }
        );

        let result = {};

        try {
            result = await response.json();
        } catch (error) {
            result = {};
        }

        if (!response.ok) {

            throw new Error(
                result.message ||
                `Request failed (${response.status})`
            );
        }

        return result;

    } catch (error) {

        console.error(
            "API REQUEST ERROR:",
            endpoint,
            error
        );

        if (
            error.message === "Failed to fetch"
        ) {

            throw new Error(
                "Backend server se connection nahi ho raha. Please make sure backend is running on port 5000."
            );
        }

        throw error;
    }
}


// =====================================================
// AUTH
// =====================================================

async function registerUser(userData) {

    return apiRequest(
        "/auth/register",
        {
            method: "POST",
            body: JSON.stringify(userData)
        }
    );

}


async function loginUser(email, password) {

    return apiRequest(
        "/auth/login",
        {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        }
    );

}


// =====================================================
// CAREGIVERS
// =====================================================

async function getCaregivers(params = "") {

    return apiRequest(
        `/caregivers${params}`
    );

}


async function getCaregiver(id) {

    return apiRequest(
        `/caregivers/${id}`
    );

}


async function searchCaregivers(params = "") {

    return apiRequest(
        `/caregivers/search${params}`
    );

}


async function updateCaregiverAvailability(
    available
) {

    return apiRequest(
        "/caregivers/availability",
        {
            method: "PUT",
            body: JSON.stringify({
                available
            })
        }
    );

}


// =====================================================
// BOOKINGS
// =====================================================

async function createBooking(bookingData) {

    return apiRequest(
        "/bookings",
        {
            method: "POST",
            body: JSON.stringify(bookingData)
        }
    );

}


async function getCustomerBookings() {

    return apiRequest(
        "/bookings/customer"
    );

}


async function getCaregiverBookings() {

    return apiRequest(
        "/bookings/caregiver"
    );

}


async function acceptBooking(id) {

    return apiRequest(
        `/bookings/${id}/accept`,
        {
            method: "PUT"
        }
    );

}


async function rejectBooking(id) {

    return apiRequest(
        `/bookings/${id}/reject`,
        {
            method: "PUT"
        }
    );

}


async function completeBooking(id) {

    return apiRequest(
        `/bookings/${id}/complete`,
        {
            method: "PUT"
        }
    );

}


async function cancelBooking(id) {

    return apiRequest(
        `/bookings/${id}/cancel`,
        {
            method: "PUT"
        }
    );

}


// =====================================================
// REVIEWS
// =====================================================

async function createReview(reviewData) {

    return apiRequest(
        "/reviews",
        {
            method: "POST",
            body: JSON.stringify(reviewData)
        }
    );

}


async function getCaregiverReviews(caregiverId) {

    return apiRequest(
        `/reviews/caregiver/${caregiverId}`
    );

}


async function getBookingReview(bookingId) {

    return apiRequest(
        `/reviews/booking/${bookingId}`
    );

}


// =====================================================
// NOTIFICATIONS
// =====================================================

async function getNotifications() {

    return apiRequest(
        "/notifications"
    );

}


async function getUnreadNotificationCount() {

    return apiRequest(
        "/notifications/unread-count"
    );

}


async function markNotificationAsRead(id) {

    return apiRequest(
        `/notifications/${id}/read`,
        {
            method: "PUT"
        }
    );

}


async function markAllNotificationsAsRead() {

    return apiRequest(
        "/notifications/read-all",
        {
            method: "PUT"
        }
    );

}


async function deleteNotification(id) {

    return apiRequest(
        `/notifications/${id}`,
        {
            method: "DELETE"
        }
    );

}


// =====================================================
// SESSION
// =====================================================

function saveLoginSession(data) {

    if (
        !data ||
        !data.token
    ) {

        throw new Error(
            "Invalid login response."
        );

    }

    localStorage.setItem(
        "carecompanion_token",
        data.token
    );

    if (data.user) {

        localStorage.setItem(
            "carecompanion_user",
            JSON.stringify(data.user)
        );

    }

}


function getCurrentUser() {

    try {

        const user =
            localStorage.getItem(
                "carecompanion_user"
            );

        return user
            ? JSON.parse(user)
            : null;

    } catch (error) {

        return null;

    }

}


function logoutUser() {

    localStorage.removeItem(
        "carecompanion_token"
    );

    localStorage.removeItem(
        "carecompanion_user"
    );

}


function isLoggedIn() {

    return Boolean(
        localStorage.getItem(
            "carecompanion_token"
        )
    );

}