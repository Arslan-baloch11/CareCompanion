// =====================================================
// CARECOMPANION CAREGIVER MODEL
// =====================================================

const mongoose = require("mongoose");

const caregiverSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            default: ""
        },

        city: {
            type: String,
            required: true,
            trim: true
        },

        gender: {
            type: String,
            enum: ["male", "female"],
            required: true
        },

        services: {
            type: [String],
            default: []
        },

        experience: {
            type: Number,
            default: 0
        },

        hourlyRate: {
            type: Number,
            required: true
        },

        rating: {
            type: Number,
            default: 0
        },

        reviews: {
            type: Number,
            default: 0
        },

        bio: {
            type: String,
            default: ""
        },

        verified: {
            type: Boolean,
            default: false
        },

        available: {
            type: Boolean,
            default: true
        },

        profileImage: {
            type: String,
            default: ""
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

module.exports = mongoose.model("Caregiver", caregiverSchema);