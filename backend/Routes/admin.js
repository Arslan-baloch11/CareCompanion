const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Caregiver = require("../models/Caregiver");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const Notification = require("../models/Notification");

const adminAuth = require("../middleware/adminAuth");

const router = express.Router();


// =====================================================
// ADMIN LOGIN
// PUBLIC ROUTE
// =====================================================

router.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

            if (!email || !password) {

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


            // -----------------------------------------
            // FIND USER
            // -----------------------------------------

            const user =
                await User.findOne({
                    email: normalizedEmail
                });


            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid admin email or password."
                });

            }


            // -----------------------------------------
            // CHECK ADMIN ROLE
            // -----------------------------------------

            if (
                user.role !== "admin"
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "This account does not have administrator access."
                });

            }


            // -----------------------------------------
            // CHECK ACTIVE STATUS
            // -----------------------------------------

            if (
                user.isActive === false
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "This admin account has been deactivated."
                });

            }


            // -----------------------------------------
            // CHECK PASSWORD
            // -----------------------------------------

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid admin email or password."
                });

            }


            // -----------------------------------------
            // CREATE ADMIN JWT
            // -----------------------------------------
            // IMPORTANT:
            // userId is the REAL MongoDB _id
            // -----------------------------------------

            const token =
                jwt.sign(
                    {
                        userId:
                            user._id.toString(),

                        role:
                            "admin",

                        email:
                            user.email
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn: "7d"
                    }
                );


            // -----------------------------------------
            // ADMIN LOGIN RESPONSE
            // -----------------------------------------

            return res.json({

                success: true,

                message:
                    "Admin login successful.",

                token,

                user: {

                    _id:
                        user._id,

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
                        user.profileImage

                }

            });

        } catch (error) {

            console.error(
                "Admin login error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Admin login failed."
            });

        }

    }
);


// =====================================================
// ADMIN STATISTICS
// =====================================================

router.get(
    "/stats",
    adminAuth,
    async (req, res) => {

        try {

            const [
                totalUsers,
                totalCustomers,
                totalCaregivers,
                verifiedCaregivers,
                pendingCaregivers,
                totalBookings,
                pendingBookings,
                acceptedBookings,
                completedBookings,
                cancelledBookings,
                rejectedBookings,
                totalReviews,
                bookingValueResult
            ] = await Promise.all([

                User.countDocuments(),

                User.countDocuments({
                    role: "customer"
                }),

                User.countDocuments({
                    role: "caregiver"
                }),

                Caregiver.countDocuments({
                    verified: true
                }),

                Caregiver.countDocuments({
                    verified: false
                }),

                Booking.countDocuments(),

                Booking.countDocuments({
                    status: "pending"
                }),

                Booking.countDocuments({
                    status: "accepted"
                }),

                Booking.countDocuments({
                    status: "completed"
                }),

                Booking.countDocuments({
                    status: "cancelled"
                }),

                Booking.countDocuments({
                    status: "rejected"
                }),

                Review.countDocuments(),

                Booking.aggregate([
                    {
                        $match: {
                            status: {
                                $in: [
                                    "accepted",
                                    "completed"
                                ]
                            }
                        }
                    },

                    {
                        $group: {
                            _id: null,

                            total: {
                                $sum: "$totalPrice"
                            }
                        }
                    }
                ])

            ]);


            const totalBookingValue =
                bookingValueResult[0]?.total || 0;


            const completedValueResult =
                await Booking.aggregate([
                    {
                        $match: {
                            status: "completed"
                        }
                    },

                    {
                        $group: {
                            _id: null,

                            total: {
                                $sum: "$totalPrice"
                            }
                        }
                    }
                ]);


            const completedBookingValue =
                completedValueResult[0]?.total || 0;


            res.json({

                totalUsers,

                totalCustomers,

                totalCaregivers,

                verifiedCaregivers,

                pendingCaregivers,

                totalBookings,

                pendingBookings,

                acceptedBookings,

                completedBookings,

                cancelledBookings,

                rejectedBookings,

                totalReviews,

                totalBookingValue,

                completedBookingValue

            });

        } catch (error) {

            console.error(
                "Admin stats error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load admin statistics."
            });

        }

    }
);


// =====================================================
// USERS
// =====================================================

router.get(
    "/users",
    adminAuth,
    async (req, res) => {

        try {

            const users =
                await User.find()
                    .select("-password")
                    .sort({
                        createdAt: -1
                    })
                    .lean();


            res.json(users);

        } catch (error) {

            console.error(
                "Admin users error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load users."
            });

        }

    }
);


// =====================================================
// USER ACTIVE / INACTIVE
// =====================================================

router.put(
    "/users/:id/status",
    adminAuth,
    async (req, res) => {

        try {

            const {
                isActive
            } = req.body;


            const user =
                await User.findById(
                    req.params.id
                );


            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found."
                });

            }


            if (
                user._id.toString() ===
                req.admin._id.toString()
            ) {

                return res.status(400).json({
                    message:
                        "You cannot deactivate your own admin account."
                });

            }


            user.isActive =
                Boolean(isActive);


            await user.save();


            res.json({

                success: true,

                message:
                    user.isActive
                        ? "User activated successfully."
                        : "User deactivated successfully."

            });

        } catch (error) {

            console.error(
                "Admin user status error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to update user status."
            });

        }

    }
);


// =====================================================
// CAREGIVERS
// =====================================================

router.get(
    "/caregivers",
    adminAuth,
    async (req, res) => {

        try {

            const caregivers =
                await Caregiver.find()
                    .populate(
                        "user",
                        "name email phone city role isActive"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .lean();


            res.json(caregivers);

        } catch (error) {

            console.error(
                "Admin caregivers error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load caregivers."
            });

        }

    }
);


// =====================================================
// CAREGIVER VERIFICATION
// =====================================================

router.put(
    "/caregivers/:id/verify",
    adminAuth,
    async (req, res) => {

        try {

            const {
                verified
            } = req.body;


            const caregiver =
                await Caregiver.findById(
                    req.params.id
                );


            if (!caregiver) {

                return res.status(404).json({
                    message:
                        "Caregiver not found."
                });

            }


            caregiver.verified =
                Boolean(verified);


            await caregiver.save();


            res.json({

                success: true,

                message:
                    caregiver.verified
                        ? "Caregiver verified successfully."
                        : "Caregiver verification removed.",

                caregiver

            });

        } catch (error) {

            console.error(
                "Admin caregiver verification error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to update caregiver verification."
            });

        }

    }
);


// =====================================================
// BOOKINGS
// =====================================================

router.get(
    "/bookings",
    adminAuth,
    async (req, res) => {

        try {

            const bookings =
                await Booking.find()

                    .populate(
                        "customer",
                        "name email phone city"
                    )

                    .populate({
                        path: "caregiver",

                        populate: {
                            path: "user",

                            select:
                                "name email phone city"
                        }
                    })

                    .sort({
                        bookingDate: -1,
                        createdAt: -1
                    })

                    .lean();


            res.json(bookings);

        } catch (error) {

            console.error(
                "Admin bookings error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load bookings."
            });

        }

    }
);


// =====================================================
// ADMIN BOOKING STATUS MANAGEMENT
// =====================================================

router.put(
    "/bookings/:id/status",
    adminAuth,
    async (req, res) => {

        try {

            const allowedStatuses = [
                "pending",
                "accepted",
                "rejected",
                "completed",
                "cancelled"
            ];


            const {
                status
            } = req.body;


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({
                    message:
                        "Invalid booking status."
                });

            }


            const booking =
                await Booking.findById(
                    req.params.id
                );


            if (!booking) {

                return res.status(404).json({
                    message:
                        "Booking not found."
                });

            }


            const previousStatus =
                booking.status;


            booking.status =
                status;


            await booking.save();


            res.json({

                success: true,

                message:
                    "Booking status updated successfully.",

                previousStatus,

                status:
                    booking.status,

                bookingId:
                    booking._id

            });

        } catch (error) {

            console.error(
                "Admin booking status error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to update booking status."
            });

        }

    }
);


// =====================================================
// REVIEWS
// =====================================================

router.get(
    "/reviews",
    adminAuth,
    async (req, res) => {

        try {

            const reviews =
                await Review.find()

                    .populate(
                        "customer",
                        "name email"
                    )

                    .populate(
                        "caregiver",
                        "name email"
                    )

                    .populate(
                        "booking",
                        "service bookingDate status"
                    )

                    .sort({
                        createdAt: -1
                    })

                    .lean();


            res.json(reviews);

        } catch (error) {

            console.error(
                "Admin reviews error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load reviews."
            });

        }

    }
);


// =====================================================
// DELETE REVIEW
// =====================================================

router.delete(
    "/reviews/:id",
    adminAuth,
    async (req, res) => {

        try {

            const review =
                await Review.findById(
                    req.params.id
                );


            if (!review) {

                return res.status(404).json({
                    message:
                        "Review not found."
                });

            }


            const caregiverId =
                review.caregiver;


            await Review.findByIdAndDelete(
                req.params.id
            );


            const remainingReviews =
                await Review.find({
                    caregiver:
                        caregiverId
                });


            const reviewCount =
                remainingReviews.length;


            const ratingTotal =
                remainingReviews.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.rating || 0
                        ),
                    0
                );


            const averageRating =
                reviewCount > 0
                    ? Number(
                        (
                            ratingTotal /
                            reviewCount
                        ).toFixed(1)
                    )
                    : 0;


            await Caregiver.findByIdAndUpdate(
                caregiverId,
                {
                    rating:
                        averageRating,

                    reviews:
                        reviewCount
                }
            );


            res.json({

                success: true,

                message:
                    "Review deleted successfully."

            });

        } catch (error) {

            console.error(
                "Admin delete review error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to delete review."
            });

        }

    }
);


// =====================================================
// ADMIN NOTIFICATIONS
// =====================================================

router.get(
    "/notifications",
    adminAuth,
    async (req, res) => {

        try {

            const notifications =
                await Notification.find()

                    .sort({
                        createdAt: -1
                    })

                    .limit(100)

                    .lean();


            res.json(
                notifications
            );

        } catch (error) {

            console.error(
                "Admin notifications error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load notifications."
            });

        }

    }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;