const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("./models/User");

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const ADMIN_EMAIL = "admin@carecompanion.com";
const ADMIN_PASSWORD = "Admin@12345";

async function createOrResetAdmin() {
    try {
        if (!MONGODB_URI) {
            console.error("MONGODB_URI is missing from .env");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");

        await mongoose.connect(MONGODB_URI);

        console.log("MongoDB connected.");

        const hashedPassword = await bcrypt.hash(
            ADMIN_PASSWORD,
            12
        );

        let admin = await User.findOne({
            email: ADMIN_EMAIL
        });

        if (admin) {

            admin.name = "CareCompanion Admin";
            admin.email = ADMIN_EMAIL;
            admin.password = hashedPassword;
            admin.role = "admin";
            admin.isActive = true;

            await admin.save();

            console.log("");
            console.log("========================================");
            console.log("ADMIN ACCOUNT RESET SUCCESSFULLY");
            console.log("========================================");
            console.log("Email:    " + ADMIN_EMAIL);
            console.log("Password: " + ADMIN_PASSWORD);
            console.log("Role:     admin");
            console.log("Active:   true");
            console.log("========================================");
            console.log("");

        } else {

            admin = new User({
                name: "CareCompanion Admin",
                email: ADMIN_EMAIL,
                password: hashedPassword,
                phone: "",
                city: "",
                role: "admin",
                isActive: true,
                profileImage: ""
            });

            await admin.save();

            console.log("");
            console.log("========================================");
            console.log("ADMIN ACCOUNT CREATED SUCCESSFULLY");
            console.log("========================================");
            console.log("Email:    " + ADMIN_EMAIL);
            console.log("Password: " + ADMIN_PASSWORD);
            console.log("Role:     admin");
            console.log("Active:   true");
            console.log("========================================");
            console.log("");
        }

        await mongoose.disconnect();

        console.log("MongoDB connection closed.");
        process.exit(0);

    } catch (error) {

        console.error("");
        console.error("========================================");
        console.error("ADMIN CREATION/RESET FAILED");
        console.error("========================================");
        console.error(error);
        console.error("========================================");
        console.error("");

        try {
            await mongoose.disconnect();
        } catch (disconnectError) {}

        process.exit(1);
    }
}

createOrResetAdmin();