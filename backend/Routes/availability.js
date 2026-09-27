// =====================================================
// CARECOMPANION AVAILABILITY ROUTES
// =====================================================

const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Caregiver = require("../models/Caregiver");
const Availability = require("../models/Availability");

const router = express.Router();


// =====================================================
// DAYS
// =====================================================

const DAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
];


// =====================================================
// DEFAULT DAY
// =====================================================

function defaultDay() {

    return {
        available: true,
        startTime: "09:00",
        endTime: "17:00"
    };

}


// =====================================================
// DEFAULT AVAILABILITY
// =====================================================

function defaultAvailability() {

    return {

        monday: defaultDay(),

        tuesday: defaultDay(),

        wednesday: defaultDay(),

        thursday: defaultDay(),

        friday: defaultDay(),

        saturday: defaultDay(),

        sunday: defaultDay()

    };

}


// =====================================================
// AUTHENTICATION
// =====================================================

function authenticate(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."

            });

        }


        const token =
            authHeader.split(" ")[1];


        if (!token) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication token missing."

            });

        }


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // -------------------------------------------------
        // Support old and new token formats
        // -------------------------------------------------

        const userId =
            decoded.userId ||
            decoded.id ||
            decoded._id ||
            decoded.sub ||
            null;


        req.user = {

            ...decoded,

            id: userId,

            userId: userId

        };


        next();

    }

    catch (error) {

        console.error(
            "Availability authentication error:",
            error.message
        );


        return res.status(401).json({

            success: false,

            message:
                "Invalid or expired token."

        });

    }

}


// =====================================================
// RESOLVE CAREGIVER
// =====================================================
//
// This is the important permanent fix.
//
// It can locate the caregiver using:
// 1. MongoDB user ID
// 2. Token userId
// 3. Token email
// 4. Caregiver email
//
// =====================================================

async function resolveCaregiver(
    req
) {

    let user = null;

    let caregiver = null;


    const tokenUserId =
        req.user?.userId ||
        req.user?.id ||
        req.user?._id;


    const tokenEmail =
        req.user?.email
            ? String(
                req.user.email
            )
                .trim()
                .toLowerCase()
            : "";


    // -------------------------------------------------
    // FIND USER BY ID
    // -------------------------------------------------

    if (
        tokenUserId &&
        mongoose.Types.ObjectId.isValid(
            tokenUserId
        )
    ) {

        user =
            await User.findById(
                tokenUserId
            );

    }


    // -------------------------------------------------
    // FALLBACK: FIND USER BY EMAIL
    // -------------------------------------------------

    if (
        !user &&
        tokenEmail
    ) {

        user =
            await User.findOne({
                email: tokenEmail
            });

    }


    // -------------------------------------------------
    // USER MUST EXIST
    // -------------------------------------------------

    if (!user) {

        return {

            user: null,

            caregiver: null,

            reason:
                "User account could not be resolved from authentication token."

        };

    }


    // -------------------------------------------------
    // ROLE CHECK
    // -------------------------------------------------

    if (
        user.role !== "caregiver"
    ) {

        return {

            user,

            caregiver: null,

            reason:
                "Only caregiver accounts can manage availability."

        };

    }


    // -------------------------------------------------
    // ACCOUNT STATUS
    // -------------------------------------------------

    if (
        user.isActive === false
    ) {

        return {

            user,

            caregiver: null,

            reason:
                "This caregiver account is deactivated."

        };

    }


    // -------------------------------------------------
    // FIND CAREGIVER BY USER ID
    // -------------------------------------------------

    caregiver =
        await Caregiver.findOne({

            user:
                user._id

        });


    // -------------------------------------------------
    // FALLBACK: FIND BY EMAIL
    // -------------------------------------------------

    if (
        !caregiver &&
        user.email
    ) {

        caregiver =
            await Caregiver.findOne({

                email:
                    user.email

            });

    }


    // -------------------------------------------------
    // SELF-HEAL USER RELATION
    // -------------------------------------------------
    //
    // If caregiver was found using email but its
    // user field is outdated, connect it to the
    // authenticated MongoDB user.
    //
    // -------------------------------------------------

    if (
        caregiver &&
        caregiver.user &&
        caregiver.user.toString() !==
            user._id.toString()
    ) {

        caregiver.user =
            user._id;

        await caregiver.save();

    }


    return {

        user,

        caregiver,

        reason:
            null

    };

}


// =====================================================
// GET MY AVAILABILITY
// =====================================================

router.get(
    "/my",
    authenticate,
    async (req, res) => {

        try {

            const resolved =
                await resolveCaregiver(
                    req
                );


            // -------------------------------------------------
            // CAREGIVER NOT FOUND
            // -------------------------------------------------

            if (
                !resolved.caregiver
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        resolved.reason ||
                        "Caregiver profile not found."

                });

            }


            const caregiver =
                resolved.caregiver;


            // -------------------------------------------------
            // FIND EXISTING AVAILABILITY
            // -------------------------------------------------

            let availability =
                await Availability.findOne({

                    caregiver:
                        caregiver._id

                });


            // -------------------------------------------------
            // CREATE DEFAULT SCHEDULE IF MISSING
            // -------------------------------------------------

            if (!availability) {

                availability =
                    await Availability.create({

                        caregiver:
                            caregiver._id,

                        ...defaultAvailability()

                    });

            }


            return res.json({

                success: true,

                caregiver: {

                    _id:
                        caregiver._id,

                    name:
                        caregiver.name,

                    email:
                        caregiver.email

                },

                availability

            });

        }

        catch (error) {

            console.error(
                "Get My Availability Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load availability."

            });

        }

    }
);


// =====================================================
// GET CAREGIVER AVAILABILITY
// =====================================================

router.get(
    "/:caregiverId",
    async (req, res) => {

        try {

            const caregiverId =
                req.params.caregiverId;


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
                );


            if (!caregiver) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver not found."

                });

            }


            let availability =
                await Availability.findOne({

                    caregiver:
                        caregiver._id

                });


            // -------------------------------------------------
            // CREATE DEFAULT IF NOT EXISTS
            // -------------------------------------------------

            if (!availability) {

                availability =
                    await Availability.create({

                        caregiver:
                            caregiver._id,

                        ...defaultAvailability()

                    });

            }


            return res.json({

                success: true,

                caregiver: {

                    _id:
                        caregiver._id,

                    name:
                        caregiver.name,

                    email:
                        caregiver.email

                },

                availability

            });

        }

        catch (error) {

            console.error(
                "Get Caregiver Availability Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load caregiver availability."

            });

        }

    }
);


// =====================================================
// UPDATE MY AVAILABILITY
// =====================================================

router.put(
    "/update",
    authenticate,
    async (req, res) => {

        try {

            const resolved =
                await resolveCaregiver(
                    req
                );


            if (
                !resolved.caregiver
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        resolved.reason ||
                        "Caregiver profile not found."

                });

            }


            const caregiver =
                resolved.caregiver;


            const body =
                req.body || {};


            // -------------------------------------------------
            // BUILD CLEAN PAYLOAD
            // -------------------------------------------------

            const cleanAvailability = {};


            for (
                const day
                of DAYS
            ) {

                const dayData =
                    body[day] || {};


                const available =
                    dayData.available !== false;


                const startTime =
                    typeof dayData.startTime === "string" &&
                    /^\d{2}:\d{2}$/.test(
                        dayData.startTime
                    )
                        ? dayData.startTime
                        : "09:00";


                const endTime =
                    typeof dayData.endTime === "string" &&
                    /^\d{2}:\d{2}$/.test(
                        dayData.endTime
                    )
                        ? dayData.endTime
                        : "17:00";


                // -------------------------------------------------
                // VALIDATE TIME
                // -------------------------------------------------

                if (
                    available &&
                    startTime >= endTime
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            `${day}: End time must be later than start time.`

                    });

                }


                cleanAvailability[day] = {

                    available,

                    startTime,

                    endTime

                };

            }


            // -------------------------------------------------
            // FIND OR CREATE
            // -------------------------------------------------

            let availability =
                await Availability.findOne({

                    caregiver:
                        caregiver._id

                });


            if (!availability) {

                availability =
                    new Availability({

                        caregiver:
                            caregiver._id

                    });

            }


            // -------------------------------------------------
            // SAVE ALL DAYS
            // -------------------------------------------------

            for (
                const day
                of DAYS
            ) {

                availability[day] =
                    cleanAvailability[day];

            }


            await availability.save();


            return res.json({

                success: true,

                message:
                    "Weekly availability saved successfully.",

                availability

            });

        }

        catch (error) {

            console.error(
                "Update Availability Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save weekly availability."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;