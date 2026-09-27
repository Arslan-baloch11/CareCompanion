const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./routes/auth");
const caregiverRoutes = require("./routes/caregivers");
const bookingRoutes = require("./routes/bookings");
const reviewRoutes = require("./routes/reviews");
const notificationRoutes = require("./routes/notifications");
const availabilityRoutes = require("./routes/availability");
const adminRoutes = require("./routes/admin");

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// PORT
// =====================================================

const PORT = Number(process.env.PORT) || 5000;

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
    process.env.FRONTEND_URL,

    // Local development
    "http://localhost:5500",
    "http://127.0.0.1:5500",

    "http://localhost:5501",
    "http://127.0.0.1:5501",

    "http://localhost:3000",
    "http://127.0.0.1:3000",

    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:8080",
    "http://127.0.0.1:8080",

    // Capacitor Android/iOS
    "http://localhost",
    "https://localhost",
    "capacitor://localhost"
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {

            // Requests without Origin
            if (!origin) {
                return callback(null, true);
            }

            // Capacitor / local file requests
            if (origin === "null") {
                console.log("CORS ALLOWED: Origin null");
                return callback(null, true);
            }

            // Exact allowed origins
            if (allowedOrigins.includes(origin)) {
                console.log("CORS ALLOWED:", origin);
                return callback(null, true);
            }

            // Any localhost / 127.0.0.1 port
            try {
                const parsedUrl = new URL(origin);

                const isLocalhost =
                    (
                        parsedUrl.protocol === "http:" ||
                        parsedUrl.protocol === "https:"
                    ) &&
                    (
                        parsedUrl.hostname === "localhost" ||
                        parsedUrl.hostname === "127.0.0.1"
                    );

                if (isLocalhost) {
                    console.log("CORS ALLOWED LOCAL:", origin);
                    return callback(null, true);
                }

            } catch (error) {
                console.error(
                    "CORS ORIGIN PARSE ERROR:",
                    error.message
                );
            }

            console.error("CORS BLOCKED:", origin);

            return callback(
                new Error("CORS policy: Origin not allowed.")
            );
        },

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        credentials: true,

        optionsSuccessStatus: 204
    })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(
    express.json({
        limit: "2mb"
    })
);

// =====================================================
// BASIC ROUTE
// =====================================================

app.get("/", (req, res) => {

    const isProduction =
        process.env.NODE_ENV === "production" ||
        process.env.RENDER === "true";

    res.status(200).json({
        success: true,

        message:
            "CareCompanion backend is running successfully.",

        environment:
            isProduction ? "production" : "development",

        database:
            mongoose.connection.readyState === 1
                ? "Connected"
                : "Disconnected",

        port: PORT
    });
});

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {

    const databaseConnected =
        mongoose.connection.readyState === 1;

    res.status(
        databaseConnected ? 200 : 503
    ).json({

        success: databaseConnected,

        message:
            databaseConnected
                ? "CareCompanion API is working!"
                : "CareCompanion API is running but MongoDB is not connected.",

        database:
            databaseConnected
                ? "Connected"
                : "Disconnected",

        mongoState:
            mongoose.connection.readyState,

        port: PORT
    });
});

// =====================================================
// TEST
// =====================================================

app.get("/api/test", (req, res) => {

    res.status(200).json({

        success: true,

        message: "Backend connection successful!",

        project: "CareCompanion",

        version: "1.0.0",

        database:
            mongoose.connection.readyState === 1
                ? "Connected"
                : "Disconnected"
    });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/caregivers", caregiverRoutes);

app.use("/api/bookings", bookingRoutes);

app.use("/api/reviews", reviewRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/availability", availabilityRoutes);

app.use("/api/admin", adminRoutes);

// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "API route not found.",

        path: req.originalUrl
    });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {

    console.error("");
    console.error("========================================");
    console.error("SERVER ERROR");
    console.error("========================================");
    console.error(err.stack || err.message || err);
    console.error("========================================");
    console.error("");

    // CORS error
    if (
        err.message &&
        err.message.includes("CORS policy")
    ) {
        return res.status(403).json({

            success: false,

            message: "Request blocked by CORS policy."
        });
    }

    // JSON parse error
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
        return res.status(400).json({

            success: false,

            message: "Invalid JSON request body."
        });
    }

    // General error
    return res.status(500).json({

        success: false,

        message: "Internal server error."
    });
});

// =====================================================
// MONGODB
// =====================================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {

    console.error("");
    console.error("========================================");
    console.error("MONGODB CONNECTION ERROR");
    console.error("========================================");
    console.error("MONGODB_URI is missing.");
    console.error("========================================");
    console.error("");

    process.exit(1);
}

// =====================================================
// MONGODB EVENTS
// =====================================================

mongoose.connection.on(
    "connected",
    () => {
        console.log("MongoDB connection established.");
    }
);

mongoose.connection.on(
    "error",
    (error) => {

        console.error(
            "MongoDB runtime error:",
            error.message
        );
    }
);

mongoose.connection.on(
    "disconnected",
    () => {

        console.error(
            "MongoDB disconnected."
        );
    }
);

// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        console.log("");
        console.log("========================================");
        console.log("   STARTING CARECOMPANION BACKEND");
        console.log("========================================");
        console.log("");

        // Connect MongoDB first
        await mongoose.connect(
            MONGODB_URI,
            {
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 15000
            }
        );

        console.log("");
        console.log("========================================");
        console.log("       MONGODB CONNECTED");
        console.log("========================================");
        console.log("Status: Connected successfully");
        console.log("========================================");
        console.log("");

        // Start Express
        // IMPORTANT FOR RENDER:
        // Render requires the server to listen on 0.0.0.0
        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log("");
                console.log("========================================");
                console.log("       CARECOMPANION BACKEND");
                console.log("========================================");

                console.log(
                    `Server running on port ${PORT}`
                );

                console.log(
                    `Health: /api/health`
                );

                console.log(
                    `Test: /api/test`
                );

                console.log(
                    `Auth: /api/auth`
                );

                console.log(
                    `Caregivers: /api/caregivers`
                );

                console.log(
                    `Bookings: /api/bookings`
                );

                console.log(
                    `Reviews: /api/reviews`
                );

                console.log(
                    `Notifications: /api/notifications`
                );

                console.log(
                    `Availability: /api/availability`
                );

                console.log(
                    `Admin: /api/admin`
                );

                console.log("========================================");
                console.log("");
                console.log(
                    "CareCompanion backend is READY."
                );
                console.log("");
            }
        );

    } catch (error) {

        console.error("");
        console.error("========================================");
        console.error("MONGODB CONNECTION FAILED");
        console.error("========================================");
        console.error(error.message);
        console.error("========================================");
        console.error("");

        console.error("Check these things:");
        console.error("1. MongoDB Atlas Network Access");
        console.error("2. MONGODB_URI is correct");
        console.error("3. Internet connection is working");
        console.error("4. MongoDB Atlas cluster is running");
        console.error("");

        process.exit(1);
    }
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

async function shutdownServer(signal) {

    console.log("");
    console.log(
        `${signal} received. Shutting down server...`
    );

    try {

        await mongoose.connection.close();

        console.log(
            "MongoDB connection closed."
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "Shutdown error:",
            error.message
        );

        process.exit(1);
    }
}

process.on(
    "SIGINT",
    () => {
        shutdownServer("SIGINT");
    }
);

process.on(
    "SIGTERM",
    () => {
        shutdownServer("SIGTERM");
    }
);

// =====================================================
// START
// =====================================================

startServer();