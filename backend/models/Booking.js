// =====================================================
// CARECOMPANION BOOKING MODEL
// =====================================================

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        caregiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Caregiver",
            required: true
        },

        service: {
            type: String,
            required: true,
            trim: true
        },

        bookingDate: {
            type: Date,
            required: true
        },

        startTime: {
            type: String,
            required: true
        },

        hours: {
            type: Number,
            required: true,
            min: 1
        },

        hourlyRate: {
            type: Number,
            required: true
        },

        totalPrice: {
            type: Number,
            required: true
        },

        address: {
            type: String,
            required: true,
            trim: true
        },

        notes: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "rejected",
                "completed",
                "cancelled"
            ],
            default: "pending"
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

module.exports = mongoose.model("Booking", bookingSchema);