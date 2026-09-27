const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

const Caregiver = require("../models/Caregiver");

// =====================================================
// AUTHENTICATION
// =====================================================

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
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
// GET ALL CAREGIVERS
// =====================================================

router.get("/", async (req, res) => {

    try {

        const {
            search,
            city,
            gender,
            service,
            available,
            verified
        } = req.query;

        const filter = {};

        if (city) {
            filter.city = {
                $regex: city.trim(),
                $options: "i"
            };
        }

        if (gender) {
            filter.gender = gender;
        }

        if (available !== undefined) {
            filter.available = available === "true";
        }

        if (verified !== undefined) {
            filter.verified = verified === "true";
        }

        if (service) {
            filter.services = {
                $regex: service.trim(),
                $options: "i"
            };
        }

        if (search) {

            filter.$or = [
                {
                    name: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    city: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    bio: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                },
                {
                    services: {
                        $regex: search.trim(),
                        $options: "i"
                    }
                }
            ];
        }

        const caregivers =
            await Caregiver
                .find(filter)
                .sort({
                    verified: -1,
                    rating: -1,
                    createdAt: -1
                })
                .lean();

        return res.status(200).json({

            success: true,

            count: caregivers.length,

            caregivers

        });

    } catch (error) {

        console.error(
            "GET CAREGIVERS ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load caregivers.",

            error:
                error.message

        });
    }
});

// =====================================================
// SEARCH CAREGIVERS
// =====================================================

router.get("/search", async (req, res) => {

    try {

        const {
            q = "",
            city = "",
            service = ""
        } = req.query;

        const filter = {};

        const conditions = [];

        if (q.trim()) {

            conditions.push(
                {
                    name: {
                        $regex: q.trim(),
                        $options: "i"
                    }
                },
                {
                    bio: {
                        $regex: q.trim(),
                        $options: "i"
                    }
                },
                {
                    city: {
                        $regex: q.trim(),
                        $options: "i"
                    }
                }
            );
        }

        if (city.trim()) {

            filter.city = {
                $regex: city.trim(),
                $options: "i"
            };
        }

        if (service.trim()) {

            filter.services = {
                $regex: service.trim(),
                $options: "i"
            };
        }

        if (conditions.length > 0) {
            filter.$or = conditions;
        }

        const caregivers =
            await Caregiver
                .find(filter)
                .sort({
                    verified: -1,
                    rating: -1
                })
                .lean();

        return res.status(200).json({

            success: true,

            count: caregivers.length,

            caregivers

        });

    } catch (error) {

        console.error(
            "SEARCH CAREGIVERS ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to search caregivers."

        });
    }
});

// =====================================================
// GET MY CAREGIVER PROFILE
// =====================================================

router.get("/me", authenticate, async (req, res) => {

    try {

        if (req.user.role !== "caregiver") {

            return res.status(403).json({

                success: false,

                message:
                    "Only caregivers can access this profile."

            });
        }

        const caregiver =
            await Caregiver.findOne({
                user: req.user.id
            }).lean();

        if (!caregiver) {

            return res.status(404).json({

                success: false,

                message:
                    "Caregiver profile not found."

            });
        }

        return res.status(200).json({

            success: true,

            caregiver

        });

    } catch (error) {

        console.error(
            "GET MY CAREGIVER ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load caregiver profile."

        });
    }
});

// =====================================================
// GET SINGLE CAREGIVER
// =====================================================

router.get("/:id", async (req, res) => {

    try {

        const caregiverId =
            req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(
                caregiverId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid caregiver ID."

            });
        }

        const caregiver =
            await Caregiver.findById(
                caregiverId
            ).lean();

        if (!caregiver) {

            return res.status(404).json({

                success: false,

                message:
                    "Caregiver not found."

            });
        }

        return res.status(200).json({

            success: true,

            caregiver

        });

    } catch (error) {

        console.error(
            "GET CAREGIVER ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load caregiver."

        });
    }
});

// =====================================================
// UPDATE MY CAREGIVER PROFILE
// =====================================================

router.put("/profile", authenticate, async (req, res) => {

    try {

        if (req.user.role !== "caregiver") {

            return res.status(403).json({

                success: false,

                message:
                    "Only caregivers can update this profile."

            });
        }

        const allowedFields = [
            "name",
            "email",
            "phone",
            "city",
            "gender",
            "services",
            "experience",
            "hourlyRate",
            "bio",
            "profileImage"
        ];

        const updates = {};

        allowedFields.forEach(field => {

            if (
                req.body[field] !== undefined
            ) {

                updates[field] =
                    req.body[field];

            }

        });

        if (
            updates.email &&
            typeof updates.email === "string"
        ) {

            updates.email =
                updates.email
                    .trim()
                    .toLowerCase();

        }

        const caregiver =
            await Caregiver.findOneAndUpdate(
                {
                    user: req.user.id
                },
                {
                    $set: updates
                },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!caregiver) {

            return res.status(404).json({

                success: false,

                message:
                    "Caregiver profile not found."

            });
        }

        return res.status(200).json({

            success: true,

            message:
                "Caregiver profile updated successfully.",

            caregiver

        });

    } catch (error) {

        console.error(
            "UPDATE CAREGIVER PROFILE ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update caregiver profile."

        });
    }
});

// =====================================================
// UPDATE CAREGIVER AVAILABILITY
// =====================================================

router.put("/availability", authenticate, async (req, res) => {

    try {

        if (req.user.role !== "caregiver") {

            return res.status(403).json({

                success: false,

                message:
                    "Only caregivers can update availability."

            });
        }

        const { available } = req.body;

        if (typeof available !== "boolean") {

            return res.status(400).json({

                success: false,

                message:
                    "Availability must be true or false."

            });
        }

        const caregiver =
            await Caregiver.findOneAndUpdate(
                {
                    user: req.user.id
                },
                {
                    $set: {
                        available
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!caregiver) {

            return res.status(404).json({

                success: false,

                message:
                    "Caregiver profile not found."

            });
        }

        return res.status(200).json({

            success: true,

            message:
                available
                    ? "Caregiver is now available."
                    : "Caregiver is now unavailable.",

            caregiver

        });

    } catch (error) {

        console.error(
            "UPDATE AVAILABILITY ERROR:",
            error.message
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to update availability."

        });
    }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;