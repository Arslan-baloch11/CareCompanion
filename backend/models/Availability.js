const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
    {
        caregiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Caregiver",
            required: true,
            unique: true
        },

        monday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        tuesday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        wednesday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        thursday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        friday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        saturday: {
            available: { type: Boolean, default: true },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        sunday: {
            available: { type: Boolean, default: false },
            startTime: { type: String, default: "09:00" },
            endTime: { type: String, default: "17:00" }
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Availability",
    availabilitySchema
);