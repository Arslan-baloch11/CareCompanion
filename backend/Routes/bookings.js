// =====================================================
// CARECOMPANION BOOKING ROUTES
// =====================================================

const express = require("express");
const jwt = require("jsonwebtoken");

const Booking = require("../models/Booking");
const User = require("../models/User");
const Caregiver = require("../models/Caregiver");
const Notification = require("../models/Notification");
const Availability = require("../models/Availability");

const router = express.Router();


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const authenticate = (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (
            !authHeader.startsWith("Bearer ")
        ) {

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

            email: decoded.email || ""

        };

        next();

    } catch (error) {

        console.error(
            "BOOKING AUTH ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });

    }

};


// =====================================================
// GET / CREATE CAREGIVER PROFILE
// =====================================================
//
// This is an important fallback.
//
// If a caregiver account exists in Users but its
// Caregiver document is missing, this function creates it.
// It also repairs an old profile found by email.
// =====================================================

async function getOrCreateCaregiver(userData) {

    if (!userData) {
        return null;
    }


    const userId =
        userData.id ||
        userData.userId;


    if (!userId) {
        return null;
    }


    // -------------------------------------------------
    // First try User ID
    // -------------------------------------------------

    let caregiver =
        await Caregiver.findOne({
            user: userId
        });


    // -------------------------------------------------
    // Try email if User ID relation is missing
    // -------------------------------------------------

    if (
        !caregiver &&
        userData.email
    ) {

        caregiver =
            await Caregiver.findOne({

                email:
                    userData.email
                        .trim()
                        .toLowerCase()

            });


        if (caregiver) {

            caregiver.user =
                userId;

            await caregiver.save();

            console.log(
                "Caregiver profile relationship repaired:",
                caregiver._id.toString()
            );

        }

    }


    // -------------------------------------------------
    // If still missing, create profile
    // -------------------------------------------------

    if (!caregiver) {

        const user =
            await User.findById(
                userId
            );


        if (!user) {

            return null;

        }


        if (
            user.role !== "caregiver"
        ) {

            return null;

        }


        caregiver =
            await Caregiver.create({

                user:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                phone:
                    user.phone || "",

                city:
                    user.city || "Not Set",

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
            "Caregiver profile created from booking fallback:",
            caregiver._id.toString()
        );

    }


    return caregiver;

}


// =====================================================
// CREATE NOTIFICATION
// =====================================================

async function createNotification({

    recipient,
    type,
    title,
    message,
    booking

}) {

    try {

        if (!recipient) {
            return null;
        }


        return await Notification.create({

            recipient,

            type,

            title,

            message,

            booking:
                booking || null

        });

    } catch (error) {

        console.error(
            "Notification Creation Error:",
            error.message
        );

        return null;

    }

}


// =====================================================
// CREATE ADMIN NOTIFICATION
// =====================================================

async function createAdminNotification({

    type,
    title,
    message,
    booking

}) {

    try {

        const admins =
            await User.find({

                role: "admin",

                isActive: true

            }).select("_id");


        if (!admins.length) {
            return;
        }


        await Promise.all(

            admins.map(
                admin =>
                    createNotification({

                        recipient:
                            admin._id,

                        type,

                        title,

                        message,

                        booking

                    })
            )

        );

    } catch (error) {

        console.error(
            "Admin Notification Error:",
            error.message
        );

    }

}


// =====================================================
// TIME TO MINUTES
// =====================================================

function timeToMinutes(time) {

    if (!time) {
        return null;
    }


    const parts =
        String(time).split(":");


    if (
        parts.length < 2
    ) {

        return null;

    }


    const hours =
        Number(parts[0]);


    const minutes =
        Number(parts[1]);


    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {

        return null;

    }


    return (
        hours * 60 +
        minutes
    );

}


// =====================================================
// MINUTES TO TIME
// =====================================================

function minutesToTime(
    totalMinutes
) {

    if (
        !Number.isFinite(
            totalMinutes
        )
    ) {

        return null;

    }


    const hours =
        Math.floor(
            totalMinutes / 60
        );


    const minutes =
        totalMinutes % 60;


    return (
        String(hours)
            .padStart(2, "0") +
        ":" +
        String(minutes)
            .padStart(2, "0")
    );

}


// =====================================================
// GET DAY KEY
// =====================================================

function getDayKey(
    dateString
) {

    if (!dateString) {
        return null;
    }


    const parts =
        String(dateString).split("-");


    if (
        parts.length !== 3
    ) {

        return null;

    }


    const year =
        Number(parts[0]);


    const month =
        Number(parts[1]);


    const day =
        Number(parts[2]);


    const date =
        new Date(
            year,
            month - 1,
            day
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    const dayMap = {

        0: "sunday",
        1: "monday",
        2: "tuesday",
        3: "wednesday",
        4: "thursday",
        5: "friday",
        6: "saturday"

    };


    return dayMap[
        date.getDay()
    ];

}


// =====================================================
// VALIDATE CAREGIVER AVAILABILITY
// =====================================================

async function validateCaregiverAvailability({

    caregiverId,
    bookingDate,
    startTime,
    hours

}) {

    const availability =
        await Availability.findOne({

            caregiver:
                caregiverId

        });


    if (!availability) {

        return {

            valid: false,

            message:
                "Caregiver availability schedule is not configured yet."

        };

    }


    const dayKey =
        getDayKey(
            bookingDate
        );


    if (!dayKey) {

        return {

            valid: false,

            message:
                "Invalid booking date."

        };

    }


    const dayAvailability =
        availability[
            dayKey
        ];


    if (
        !dayAvailability ||
        dayAvailability.available === false
    ) {

        return {

            valid: false,

            message:
                `Caregiver is unavailable on ${dayKey}. Please choose another date.`

        };

    }


    const bookingStart =
        timeToMinutes(
            startTime
        );


    const availableStart =
        timeToMinutes(
            dayAvailability.startTime
        );


    const availableEnd =
        timeToMinutes(
            dayAvailability.endTime
        );


    if (
        bookingStart === null ||
        availableStart === null ||
        availableEnd === null
    ) {

        return {

            valid: false,

            message:
                "Caregiver availability time is invalid."

        };

    }


    const bookingDuration =
        Number(hours);


    if (
        !Number.isFinite(
            bookingDuration
        ) ||
        bookingDuration < 1
    ) {

        return {

            valid: false,

            message:
                "Minimum booking duration is 1 hour."

        };

    }


    const bookingEnd =
        bookingStart +
        (
            bookingDuration * 60
        );


    if (
        bookingStart <
        availableStart
    ) {

        return {

            valid: false,

            message:
                `Booking must start at or after ${dayAvailability.startTime}.`

        };

    }


    if (
        bookingEnd >
        availableEnd
    ) {

        return {

            valid: false,

            message:
                `Booking must end by ${dayAvailability.endTime}.`

        };

    }


    return {
        valid: true
    };

}


// =====================================================
// CHECK BOOKING CONFLICT
// =====================================================

async function checkBookingConflict({

    caregiverId,
    bookingDate,
    startTime,
    hours

}) {

    const newStart =
        timeToMinutes(
            startTime
        );


    const newEnd =
        newStart +
        (
            Number(hours) * 60
        );


    const existingBookings =
        await Booking.find({

            caregiver:
                caregiverId,

            bookingDate:
                bookingDate,

            status: {

                $in: [
                    "pending",
                    "accepted"
                ]

            }

        });


    for (
        const existingBooking
        of existingBookings
    ) {

        const existingStart =
            timeToMinutes(
                existingBooking.startTime
            );


        const existingEnd =
            existingStart +
            (
                Number(
                    existingBooking.hours
                ) * 60
            );


        const overlaps =
            newStart <
                existingEnd &&
            newEnd >
                existingStart;


        if (overlaps) {

            return {

                conflict: true,

                booking:
                    existingBooking

            };

        }

    }


    return {
        conflict: false
    };

}


// =====================================================
// GET CAREGIVER SCHEDULE
// =====================================================

router.get(
    "/schedule/:caregiverId/:date",
    async (req, res) => {

        try {

            const caregiverId =
                req.params.caregiverId;


            const bookingDate =
                req.params.date;


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


            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    bookingDate
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid date format. Use YYYY-MM-DD."

                });

            }


            const availability =
                await Availability.findOne({

                    caregiver:
                        caregiver._id

                });


            if (!availability) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver availability schedule not found."

                });

            }


            const dayKey =
                getDayKey(
                    bookingDate
                );


            if (!dayKey) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid booking date."

                });

            }


            const dayAvailability =
                availability[
                    dayKey
                ];


            if (
                !dayAvailability ||
                dayAvailability.available === false
            ) {

                return res.json({

                    success: true,

                    caregiverAvailable:
                        caregiver.available !== false,

                    date:
                        bookingDate,

                    day:
                        dayKey,

                    available:
                        false,

                    availability:
                        null,

                    bookedSlots:
                        [],

                    message:
                        "Caregiver is unavailable on this day."

                });

            }


            const bookings =
                await Booking.find({

                    caregiver:
                        caregiver._id,

                    bookingDate:
                        bookingDate,

                    status: {

                        $in: [
                            "pending",
                            "accepted"
                        ]

                    }

                })
                    .populate(
                        "customer",
                        "name"
                    )
                    .sort({

                        startTime: 1

                    });


            const bookedSlots =
                bookings.map(
                    booking => {

                        const start =
                            timeToMinutes(
                                booking.startTime
                            );


                        const end =
                            start +
                            (
                                Number(
                                    booking.hours
                                ) * 60
                            );


                        return {

                            bookingId:
                                booking._id,

                            startTime:
                                booking.startTime,

                            endTime:
                                minutesToTime(
                                    end
                                ),

                            hours:
                                booking.hours,

                            status:
                                booking.status,

                            service:
                                booking.service

                        };

                    }
                );


            return res.json({

                success: true,

                caregiverAvailable:
                    caregiver.available !== false,

                date:
                    bookingDate,

                day:
                    dayKey,

                available:
                    caregiver.available !== false,

                availability: {

                    startTime:
                        dayAvailability.startTime,

                    endTime:
                        dayAvailability.endTime

                },

                bookedSlots

            });

        }

        catch (error) {

            console.error(
                "SCHEDULE API ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load caregiver schedule."

            });

        }

    }
);


// =====================================================
// CREATE BOOKING
// =====================================================

router.post(
    "/",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "customer"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only customers can create bookings."

                });

            }


            const {

                caregiver,
                service,
                bookingDate,
                startTime,
                hours,
                address,
                notes

            } = req.body;


            if (
                !caregiver ||
                !service ||
                !bookingDate ||
                !startTime ||
                !hours ||
                !address
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please provide all required booking details."

                });

            }


            const numericHours =
                Number(hours);


            if (
                !Number.isFinite(
                    numericHours
                ) ||
                numericHours < 1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Booking duration must be at least 1 hour."

                });

            }


            const caregiverData =
                await Caregiver.findById(
                    caregiver
                );


            if (!caregiverData) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver not found."

                });

            }


            if (
                caregiverData.available === false
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This caregiver is currently unavailable."

                });

            }


            const availabilityResult =
                await validateCaregiverAvailability({

                    caregiverId:
                        caregiverData._id,

                    bookingDate,

                    startTime,

                    hours:
                        numericHours

                });


            if (
                !availabilityResult.valid
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        availabilityResult.message

                });

            }


            const conflictResult =
                await checkBookingConflict({

                    caregiverId:
                        caregiverData._id,

                    bookingDate,

                    startTime,

                    hours:
                        numericHours

                });


            if (
                conflictResult.conflict
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This caregiver already has a booking during the selected time. Please choose another time."

                });

            }


            const totalPrice =
                Number(
                    caregiverData.hourlyRate || 0
                ) *
                numericHours;


            const booking =
                await Booking.create({

                    customer:
                        req.user.id,

                    caregiver:
                        caregiverData._id,

                    service,

                    bookingDate,

                    startTime,

                    hours:
                        numericHours,

                    hourlyRate:
                        caregiverData.hourlyRate || 0,

                    totalPrice,

                    address,

                    notes:
                        notes || ""

                });


            // -------------------------------------------------
            // NOTIFY CAREGIVER
            // -------------------------------------------------

            await createNotification({

                recipient:
                    caregiverData.user,

                type:
                    "booking_created",

                title:
                    "New Booking Request",

                message:
                    `You received a new ${service} booking request.`,

                booking:
                    booking._id

            });


            // -------------------------------------------------
            // NOTIFY ADMIN
            // -------------------------------------------------

            await createAdminNotification({

                type:
                    "booking_created",

                title:
                    "New Booking Created",

                message:
                    `A new ${service} booking has been created.`,

                booking:
                    booking._id

            });


            const populatedBooking =
                await Booking.findById(
                    booking._id
                )
                    .populate(
                        "customer",
                        "name email phone city"
                    )
                    .populate(
                        "caregiver",
                        "name email city hourlyRate rating"
                    );


            return res.status(201).json({

                success: true,

                message:
                    "Booking request created successfully.",

                booking:
                    populatedBooking

            });

        }

        catch (error) {

            console.error(
                "CREATE BOOKING ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to create booking.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// GET CUSTOMER BOOKINGS
// =====================================================

router.get(
    "/customer",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "customer"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only customers can access customer bookings."

                });

            }


            const bookings =
                await Booking.find({

                    customer:
                        req.user.id

                })
                    .populate(

                        "caregiver",

                        "name email city services hourlyRate rating"

                    )
                    .sort({

                        createdAt:
                            -1

                    });


            return res.json({

                success: true,

                count:
                    bookings.length,

                bookings

            });

        }

        catch (error) {

            console.error(
                "CUSTOMER BOOKINGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load customer bookings."

            });

        }

    }
);


// =====================================================
// GET CAREGIVER BOOKINGS
// =====================================================

router.get(
    "/caregiver",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "caregiver"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only caregivers can access this page."

                });

            }


            // Important:
            // This now finds OR creates the caregiver profile.
            const caregiver =
                await getOrCreateCaregiver(
                    req.user
                );


            if (!caregiver) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver profile could not be created. Please log in again."

                });

            }


            const bookings =
                await Booking.find({

                    caregiver:
                        caregiver._id

                })
                    .populate(

                        "customer",

                        "name email phone city"

                    )
                    .sort({

                        createdAt:
                            -1

                    });


            return res.json({

                success: true,

                count:
                    bookings.length,

                bookings,

                caregiver: {

                    _id:
                        caregiver._id,

                    name:
                        caregiver.name,

                    email:
                        caregiver.email,

                    city:
                        caregiver.city

                }

            });

        }

        catch (error) {

            console.error(
                "CAREGIVER BOOKINGS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to load caregiver bookings.",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// ACCEPT BOOKING
// =====================================================

router.put(
    "/:id/accept",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "caregiver"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only caregivers can accept bookings."

                });

            }


            const caregiver =
                await getOrCreateCaregiver(
                    req.user
                );


            if (!caregiver) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver profile not found."

                });

            }


            const booking =
                await Booking.findOne({

                    _id:
                        req.params.id,

                    caregiver:
                        caregiver._id

                });


            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }


            if (
                booking.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This booking cannot be accepted."

                });

            }


            booking.status =
                "accepted";


            await booking.save();


            await createNotification({

                recipient:
                    booking.customer,

                type:
                    "booking_accepted",

                title:
                    "Booking Accepted",

                message:
                    `${caregiver.name} accepted your booking request.`,

                booking:
                    booking._id

            });


            await createAdminNotification({

                type:
                    "booking_accepted",

                title:
                    "Booking Accepted",

                message:
                    `${caregiver.name} accepted a customer booking.`,

                booking:
                    booking._id

            });


            return res.json({

                success: true,

                message:
                    "Booking accepted successfully.",

                booking

            });

        }

        catch (error) {

            console.error(
                "ACCEPT BOOKING ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to accept booking."

            });

        }

    }
);


// =====================================================
// REJECT BOOKING
// =====================================================

router.put(
    "/:id/reject",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "caregiver"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only caregivers can reject bookings."

                });

            }


            const caregiver =
                await getOrCreateCaregiver(
                    req.user
                );


            if (!caregiver) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver profile not found."

                });

            }


            const booking =
                await Booking.findOne({

                    _id:
                        req.params.id,

                    caregiver:
                        caregiver._id

                });


            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }


            if (
                booking.status !==
                "pending"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This booking cannot be rejected."

                });

            }


            booking.status =
                "rejected";


            await booking.save();


            await createNotification({

                recipient:
                    booking.customer,

                type:
                    "booking_rejected",

                title:
                    "Booking Rejected",

                message:
                    `${caregiver.name} rejected your booking request.`,

                booking:
                    booking._id

            });


            await createAdminNotification({

                type:
                    "booking_rejected",

                title:
                    "Booking Rejected",

                message:
                    `${caregiver.name} rejected a customer booking.`,

                booking:
                    booking._id

            });


            return res.json({

                success: true,

                message:
                    "Booking rejected.",

                booking

            });

        }

        catch (error) {

            console.error(
                "REJECT BOOKING ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to reject booking."

            });

        }

    }
);


// =====================================================
// COMPLETE BOOKING
// =====================================================

router.put(
    "/:id/complete",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "caregiver"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only caregivers can complete bookings."

                });

            }


            const caregiver =
                await getOrCreateCaregiver(
                    req.user
                );


            if (!caregiver) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Caregiver profile not found."

                });

            }


            const booking =
                await Booking.findOne({

                    _id:
                        req.params.id,

                    caregiver:
                        caregiver._id

                });


            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }


            if (
                booking.status !==
                "accepted"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only accepted bookings can be completed."

                });

            }


            booking.status =
                "completed";


            await booking.save();


            await createNotification({

                recipient:
                    booking.customer,

                type:
                    "booking_completed",

                title:
                    "Booking Completed",

                message:
                    `Your booking with ${caregiver.name} has been completed.`,

                booking:
                    booking._id

            });


            await createNotification({

                recipient:
                    booking.customer,

                type:
                    "review_reminder",

                title:
                    "Rate Your Caregiver",

                message:
                    `Please take a moment to rate ${caregiver.name} and share your experience.`,

                booking:
                    booking._id

            });


            await createAdminNotification({

                type:
                    "booking_completed",

                title:
                    "Booking Completed",

                message:
                    `A booking with ${caregiver.name} has been completed.`,

                booking:
                    booking._id

            });


            return res.json({

                success: true,

                message:
                    "Booking completed successfully.",

                booking

            });

        }

        catch (error) {

            console.error(
                "COMPLETE BOOKING ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to complete booking."

            });

        }

    }
);


// =====================================================
// CANCEL BOOKING
// =====================================================

router.put(
    "/:id/cancel",
    authenticate,
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "customer"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Only customers can cancel bookings."

                });

            }


            const booking =
                await Booking.findOne({

                    _id:
                        req.params.id,

                    customer:
                        req.user.id

                });


            if (!booking) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."

                });

            }


            if (
                booking.status !==
                    "pending" &&
                booking.status !==
                    "accepted"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This booking cannot be cancelled."

                });

            }


            booking.status =
                "cancelled";


            await booking.save();


            const caregiver =
                await Caregiver.findById(
                    booking.caregiver
                );


            if (caregiver) {

                await createNotification({

                    recipient:
                        caregiver.user,

                    type:
                        "booking_cancelled",

                    title:
                        "Booking Cancelled",

                    message:
                        "A customer has cancelled a booking request.",

                    booking:
                        booking._id

                });

            }


            await createAdminNotification({

                type:
                    "booking_cancelled",

                title:
                    "Booking Cancelled",

                message:
                    "A customer has cancelled a booking.",

                booking:
                    booking._id

            });


            return res.json({

                success: true,

                message:
                    "Booking cancelled successfully.",

                booking

            });

        }

        catch (error) {

            console.error(
                "CANCEL BOOKING ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to cancel booking."

            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;