const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const authRoutes = require("./routes/Auth");
const caregiverRoutes = require("./routes/caregivers");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const notificationRoutes = require("./routes/notifications");
const availabilityRoutes = require("./routes/availability");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json({ limit: "2mb" }));

// =========================
// BASIC ROUTES
// =========================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "CareCompanion backend is running successfully.",
        database:
            mongoose.connection.readyState === 1
                ? "Connected"
                : "Disconnected"
    });
});

app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        success: connected,
        message: connected
            ? "CareCompanion API is working!"
            : "CareCompanion API is running but MongoDB is not connected.",
        database: connected ? "Connected" : "Disconnected"
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Backend connection successful!",
        project: "CareCompanion",
        version: "1.0.0"
    });
});

// =========================
// API ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/caregivers", caregiverRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/admin", adminRoutes);

// =========================
// 404
// =========================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found.",
        path: req.originalUrl
    });
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// =========================
// MONGODB CONNECTION
// =========================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing.");
}

// Connect MongoDB
let mongoPromise;

function connectMongoDB() {
    if (!MONGODB_URI) {
        return Promise.reject(
            new Error("MONGODB_URI is missing.")
        );
    }

    if (mongoose.connection.readyState === 1) {
        return Promise.resolve();
    }

    if (!mongoPromise) {
        mongoPromise = mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000
        });
    }

    return mongoPromise;
}

// =========================
// VERCEL HANDLER
// =========================

module.exports = async (req, res) => {
    try {
        await connectMongoDB();
        return app(req, res);
    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
};

// =========================
// LOCAL DEVELOPMENT
// =========================

if (require.main === module) {
    const PORT = Number(process.env.PORT) || 5000;

    connectMongoDB()
        .then(() => {
            app.listen(PORT, "0.0.0.0", () => {
                console.log(
                    `CareCompanion backend running on port ${PORT}`
                );
            });
        })
        .catch((error) => {
            console.error(
                "MongoDB connection failed:",
                error.message
            );

            process.exit(1);
        });
}
