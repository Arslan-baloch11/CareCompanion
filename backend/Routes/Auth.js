// =====================================================
// CARECOMPANION AUTH ROUTES
// =====================================================

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Caregiver = require("../models/Caregiver");

const router = express.Router();


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticate(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });

        }

        const token =
            authHeader.split(" ")[1];

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        const userId =
            decoded.userId ||
            decoded.id ||
            decoded._id ||
            decoded.sub ||
            decoded.user?.id ||
            decoded.user?._id;

        if (!userId) {

            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });

        }

        req.user = {
            id: userId.toString(),
            userId: userId.toString(),
            role: decoded.role,
            email: decoded.email
        };

        next();

    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });

    }

}


// =====================================================
// ENSURE CAREGIVER PROFILE
// =====================================================
// Every caregiver account must have a document in the
// caregivers collection.
// =====================================================

async function ensureCaregiverProfile(user) {

    if (
        !user ||
        user.role !== "caregiver"
    ) {
        return null;
    }


    // -------------------------------------------------
    // Find by User ID
    // -------------------------------------------------

    let caregiver =
        await Caregiver.findOne({
            user: user._id
        });


    // -------------------------------------------------
    // If not found, try email
    // This also repairs older accounts.
    // -------------------------------------------------

    if (
        !caregiver &&
        user.email
    ) {

        caregiver =
            await Caregiver.findOne({
                email:
                    user.email
                        .trim()
                        .toLowerCase()
            });


        if (caregiver) {

            caregiver.user =
                user._id;

            caregiver.name =
                user.name ||
                caregiver.name;

            caregiver.email =
                user.email;

            caregiver.phone =
                user.phone ||
                caregiver.phone ||
                "";

            caregiver.city =
                user.city ||
                caregiver.city ||
                "Not Set";

            await caregiver.save();

            console.log(
                "Existing caregiver profile linked:",
                caregiver._id.toString()
            );

        }

    }


    // -------------------------------------------------
    // Create new caregiver profile
    // -------------------------------------------------

    if (!caregiver) {

        caregiver =
            await Caregiver.create({

                user:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone ||
                    "",

                city:
                    user.city ||
                    "Not Set",

                gender:
                    "male",

                services:
                    [],

                experience:
                    0,

                hourlyRate:
                    0,

                rating:
                    0,

                reviews:
                    0,

                bio:
                    "",

                verified:
                    false,

                available:
                    true,

                profileImage:
                    ""

            });


        console.log(
            "Caregiver profile automatically created:",
            caregiver._id.toString()
        );

    }


    return caregiver;

}


// =====================================================
// REGISTER
// =====================================================

router.post(
    "/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                password,
                phone,
                city,
                role
            } = req.body;


            // -------------------------------------------------
            // VALIDATION
            // -------------------------------------------------

            if (
                !name ||
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name, email and password are required."

                });

            }


            if (
                name.trim().length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name must contain at least 2 characters."

                });

            }


            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Password must be at least 6 characters."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            // -------------------------------------------------
            // CHECK EXISTING USER
            // -------------------------------------------------

            const existingUser =
                await User.findOne({

                    email:
                        normalizedEmail

                });


            if (existingUser) {

                return res.status(400).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            // -------------------------------------------------
            // HASH PASSWORD
            // -------------------------------------------------

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            // -------------------------------------------------
            // CREATE USER
            // -------------------------------------------------

            const user =
                await User.create({

                    name:
                        name.trim(),

                    email:
                        normalizedEmail,

                    password:
                        hashedPassword,

                    phone:
                        phone
                            ? String(phone).trim()
                            : "",

                    city:
                        city
                            ? String(city).trim()
                            : "",

                    role:
                        role === "caregiver"
                            ? "caregiver"
                            : "customer"

                });


            // -------------------------------------------------
            // AUTO CREATE CAREGIVER PROFILE
            // -------------------------------------------------

            let caregiver = null;

            if (
                user.role === "caregiver"
            ) {

                caregiver =
                    await ensureCaregiverProfile(
                        user
                    );

            }


            // -------------------------------------------------
            // JWT
            // -------------------------------------------------

            const token =
                jwt.sign(

                    {
                        id:
                            user._id.toString(),

                        userId:
                            user._id.toString(),

                        role:
                            user.role,

                        email:
                            user.email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn:
                            "7d"
                    }

                );


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                token,

                caregiverCreated:
                    Boolean(caregiver),

                user: {

                    _id:
                        user._id,

                    id:
                        user._id.toString(),

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    city:
                        user.city,

                    role:
                        user.role,

                    isActive:
                        user.isActive,

                    profileImage:
                        user.profileImage || ""

                }

            });

        }

        catch (error) {

            console.error(
                "REGISTER ERROR:",
                error
            );


            // Duplicate key
            if (
                error.code === 11000
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "An account with this email already exists."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Registration failed.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

router.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            // -------------------------------------------------
            // VALIDATION
            // -------------------------------------------------

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            // -------------------------------------------------
            // FIND USER
            // -------------------------------------------------

            const user =
                await User.findOne({

                    email:
                        normalizedEmail

                });


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // -------------------------------------------------
            // ACTIVE ACCOUNT CHECK
            // -------------------------------------------------

            if (
                user.isActive === false
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your account has been deactivated."

                });

            }


            // -------------------------------------------------
            // PASSWORD
            // -------------------------------------------------

            const passwordMatch =
                await bcrypt.compare(

                    password,

                    user.password

                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // -------------------------------------------------
            // AUTO CREATE / REPAIR CAREGIVER PROFILE
            // -------------------------------------------------

            let caregiver = null;

            if (
                user.role === "caregiver"
            ) {

                caregiver =
                    await ensureCaregiverProfile(
                        user
                    );

            }


            // -------------------------------------------------
            // JWT
            // -------------------------------------------------

            const token =
                jwt.sign(

                    {

                        id:
                            user._id.toString(),

                        userId:
                            user._id.toString(),

                        role:
                            user.role,

                        email:
                            user.email

                    },

                    process.env.JWT_SECRET,

                    {

                        expiresIn:
                            "7d"

                    }

                );


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return res.json({

                success: true,

                message:
                    "Login successful.",

                token,

                caregiverReady:
                    Boolean(caregiver),

                user: {

                    _id:
                        user._id,

                    id:
                        user._id.toString(),

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    city:
                        user.city,

                    role:
                        user.role,

                    isActive:
                        user.isActive,

                    profileImage:
                        user.profileImage || ""

                }

            });

        }

        catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Login failed.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET CURRENT USER
// =====================================================

router.get(
    "/me",
    authenticate,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                )
                .select("-password");


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found."

                });

            }


            return res.json({

                success: true,

                user

            });

        }

        catch (error) {

            console.error(
                "GET CURRENT USER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load profile."

            });

        }

    }
);


// =====================================================
// UPDATE CUSTOMER PROFILE
// =====================================================

router.put(
    "/profile/update",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !== "customer"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only customers can update this profile."

                });

            }


            const {
                name,
                phone,
                city
            } = req.body;


            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name is required."

                });

            }


            if (
                name.trim().length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name must contain at least 2 characters."

                });

            }


            if (
                name.trim().length > 100
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name cannot exceed 100 characters."

                });

            }


            if (
                phone &&
                String(phone).trim().length > 30
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Phone number is too long."

                });

            }


            if (
                city &&
                String(city).trim().length > 100
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "City name is too long."

                });

            }


            const user =
                await User.findById(
                    req.user.id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            user.name =
                name.trim();

            user.phone =
                phone
                    ? String(phone).trim()
                    : "";

            user.city =
                city
                    ? String(city).trim()
                    : "";


            await user.save();


            return res.json({

                success: true,

                message:
                    "Profile updated successfully.",

                user: {

                    _id:
                        user._id,

                    id:
                        user._id.toString(),

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    city:
                        user.city,

                    role:
                        user.role

                }

            });

        }

        catch (error) {

            console.error(
                "UPDATE CUSTOMER PROFILE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to update profile."

            });

        }

    }
);


// =====================================================
// CHANGE PASSWORD
// =====================================================

router.put(
    "/change-password",
    authenticate,
    async (req, res) => {

        try {

            const {
                currentPassword,
                newPassword
            } = req.body;


            if (
                !currentPassword ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current password and new password are required."

                });

            }


            if (
                newPassword.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 6 characters."

                });

            }


            const user =
                await User.findById(
                    req.user.id
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            const passwordMatch =
                await bcrypt.compare(

                    currentPassword,

                    user.password

                );


            if (!passwordMatch) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Current password is incorrect."

                });

            }


            user.password =
                await bcrypt.hash(
                    newPassword,
                    10
                );


            await user.save();


            return res.json({

                success: true,

                message:
                    "Password changed successfully."

            });

        }

        catch (error) {

            console.error(
                "CHANGE PASSWORD ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to change password."

            });

        }

    }
);


// =====================================================
// FORGOT PASSWORD
// =====================================================

router.post(
    "/forgot-password",
    async (req, res) => {

        try {

            const {
                email
            } = req.body;


            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email address is required."

                });

            }


            const normalizedEmail =
                email
                    .trim()
                    .toLowerCase();


            const user =
                await User.findOne({

                    email:
                        normalizedEmail

                });


            // Do not reveal account existence.
            if (!user) {

                return res.json({

                    success: true,

                    message:
                        "If an account with this email exists, a password reset link has been generated."

                });

            }


            const resetToken =
                jwt.sign(

                    {

                        id:
                            user._id.toString(),

                        userId:
                            user._id.toString(),

                        purpose:
                            "password-reset"

                    },

                    process.env.JWT_SECRET,

                    {

                        expiresIn:
                            "15m"

                    }

                );


            const resetLink =
                "http://127.0.0.1:5500/frontend/reset-password.html?token=" +
                encodeURIComponent(
                    resetToken
                );


            console.log(
                "========================================"
            );

            console.log(
                "PASSWORD RESET LINK:"
            );

            console.log(
                resetLink
            );

            console.log(
                "========================================"
            );


            return res.json({

                success: true,

                message:
                    "Password reset link generated successfully.",

                resetLink

            });

        }

        catch (error) {

            console.error(
                "FORGOT PASSWORD ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to process password reset request."

            });

        }

    }
);


// =====================================================
// RESET PASSWORD
// =====================================================

router.post(
    "/reset-password",
    async (req, res) => {

        try {

            const {
                token,
                newPassword
            } = req.body;


            if (
                !token ||
                !newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Reset token and new password are required."

                });

            }


            if (
                newPassword.length < 6
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 6 characters."

                });

            }


            let decoded;


            try {

                decoded =
                    jwt.verify(

                        token,

                        process.env.JWT_SECRET

                    );

            }

            catch (tokenError) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Reset link is invalid or expired."

                });

            }


            if (
                !decoded ||
                decoded.purpose !==
                    "password-reset"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid password reset token."

                });

            }


            const userId =
                decoded.userId ||
                decoded.id;


            const user =
                await User.findById(
                    userId
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User account not found."

                });

            }


            user.password =
                await bcrypt.hash(

                    newPassword,

                    10

                );


            await user.save();


            return res.json({

                success: true,

                message:
                    "Password reset successfully. You can now login with your new password."

            });

        }

        catch (error) {

            console.error(
                "RESET PASSWORD ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to reset password."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;