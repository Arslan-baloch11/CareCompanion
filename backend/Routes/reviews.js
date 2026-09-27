const express = require("express");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Caregiver = require("../models/Caregiver");
const jwt = require("jsonwebtoken");

const router = express.Router();


// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};


// =====================================================
// CREATE REVIEW
// =====================================================

router.post("/", authMiddleware, async (req, res) => {
    try {

        if (req.user.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can submit reviews."
            });
        }

        const {
            bookingId,
            rating,
            comment
        } = req.body;


        if (!bookingId || !rating) {
            return res.status(400).json({
                success: false,
                message: "Booking ID and rating are required."
            });
        }


        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5."
            });
        }


        // Find booking

        const booking = await Booking.findById(
            bookingId
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found."
            });
        }


        // Make sure booking belongs to customer

        if (
            booking.customer.toString() !==
            req.user.id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot review this booking."
            });
        }


        // Review only completed bookings

        if (booking.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "You can review only completed bookings."
            });
        }


        // Check if review already exists

        const existingReview = await Review.findOne({
            booking: bookingId
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: "You have already reviewed this booking."
            });
        }


        // Create review

        const review = await Review.create({
            customer: req.user.id,
            caregiver: booking.caregiver,
            booking: booking._id,
            rating: Number(rating),
            comment: comment || ""
        });


        // =================================================
        // UPDATE CAREGIVER RATING
        // =================================================

        const caregiverReviews = await Review.find({
            caregiver: booking.caregiver
        });


        const totalReviews =
            caregiverReviews.length;


        const totalRating =
            caregiverReviews.reduce(
                (sum, item) =>
                    sum + item.rating,
                0
            );


        const averageRating =
            totalReviews > 0
                ? totalRating / totalReviews
                : 0;


        await Caregiver.findByIdAndUpdate(
            booking.caregiver,
            {
                rating: Number(
                    averageRating.toFixed(1)
                ),
                reviews: totalReviews
            }
        );


        res.status(201).json({
            success: true,
            message: "Review submitted successfully.",
            review
        });

    } catch (error) {

        console.error(
            "Create Review Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error while creating review."
        });
    }
});


// =====================================================
// GET CAREGIVER REVIEWS
// =====================================================

router.get(
    "/caregiver/:caregiverId",
    async (req, res) => {

        try {

            const reviews = await Review.find({
                caregiver: req.params.caregiverId
            })
                .populate(
                    "customer",
                    "name"
                )
                .sort({
                    createdAt: -1
                });


            res.json({
                success: true,
                count: reviews.length,
                reviews
            });

        } catch (error) {

            console.error(
                "Get Reviews Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Server error while loading reviews."
            });
        }
    }
);


// =====================================================
// GET MY REVIEW FOR A BOOKING
// =====================================================

router.get(
    "/booking/:bookingId",
    authMiddleware,
    async (req, res) => {

        try {

            const review = await Review.findOne({
                booking: req.params.bookingId,
                customer: req.user.id
            });


            res.json({
                success: true,
                review: review || null
            });

        } catch (error) {

            console.error(
                "Get Booking Review Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Server error."
            });
        }
    }
);


module.exports = router;