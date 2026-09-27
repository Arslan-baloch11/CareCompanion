// =====================================================
// CARECOMPANION - SEED CAREGIVERS
// =====================================================

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Caregiver = require("./models/Caregiver");

dotenv.config();


// =====================================================
// DEMO CAREGIVERS
// =====================================================

const caregivers = [

    {
        name: "Ahmed Khan",
        email: "ahmed@carecompanion.com",
        phone: "03001234567",
        city: "Lahore",
        gender: "male",
        services: ["elderly", "companion"],
        experience: 5,
        hourlyRate: 1200,
        rating: 4.8,
        reviews: 124,
        bio: "Experienced and caring professional providing elderly companionship and daily assistance.",
        verified: true,
        available: true
    },

    {
        name: "Ayesha Malik",
        email: "ayesha@carecompanion.com",
        phone: "03012345678",
        city: "Islamabad",
        gender: "female",
        services: ["elderly", "personal"],
        experience: 7,
        hourlyRate: 1500,
        rating: 4.9,
        reviews: 156,
        bio: "Dedicated caregiver with extensive experience in elderly and personal care.",
        verified: true,
        available: true
    },

    {
        name: "Usman Ali",
        email: "usman@carecompanion.com",
        phone: "03023456789",
        city: "Lahore",
        gender: "male",
        services: ["companion", "transport"],
        experience: 4,
        hourlyRate: 1000,
        rating: 4.7,
        reviews: 89,
        bio: "Friendly caregiver offering companionship and transportation assistance.",
        verified: true,
        available: true
    },

    {
        name: "Sara Ahmed",
        email: "sara@carecompanion.com",
        phone: "03034567890",
        city: "Karachi",
        gender: "female",
        services: ["companion", "personal"],
        experience: 6,
        hourlyRate: 1300,
        rating: 4.8,
        reviews: 112,
        bio: "Compassionate caregiver specializing in personal assistance and companionship.",
        verified: true,
        available: false
    },

    {
        name: "Bilal Hassan",
        email: "bilal@carecompanion.com",
        phone: "03045678901",
        city: "Faisalabad",
        gender: "male",
        services: ["elderly", "transport"],
        experience: 8,
        hourlyRate: 1400,
        rating: 4.9,
        reviews: 201,
        bio: "Highly experienced caregiver providing elderly support and safe transportation.",
        verified: true,
        available: true
    },

    {
        name: "Hina Raza",
        email: "hina@carecompanion.com",
        phone: "03056789012",
        city: "Multan",
        gender: "female",
        services: ["elderly", "companion", "personal"],
        experience: 5,
        hourlyRate: 1100,
        rating: 4.8,
        reviews: 137,
        bio: "Warm and reliable caregiver providing elderly, personal and companionship services.",
        verified: true,
        available: true
    }

];


// =====================================================
// SEED DATABASE
// =====================================================

async function seedCaregivers() {

    try {

        console.log("");
        console.log("========================================");
        console.log("   CARECOMPANION CAREGIVER SEED");
        console.log("========================================");


        // -------------------------------------------------
        // CONNECT MONGODB
        // -------------------------------------------------

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log("MongoDB connected.");
        console.log("");


        // -------------------------------------------------
        // CREATE / UPDATE CAREGIVER USERS
        // -------------------------------------------------

        const defaultPassword =
            await bcrypt.hash(
                "Caregiver@123",
                10
            );


        for (const caregiverData of caregivers) {

            let user = await User.findOne({
                email: caregiverData.email
            });


            if (!user) {

                user = await User.create({

                    name: caregiverData.name,

                    email: caregiverData.email,

                    password: defaultPassword,

                    phone: caregiverData.phone,

                    city: caregiverData.city,

                    role: "caregiver"

                });

                console.log(
                    `✓ User created: ${caregiverData.name}`
                );

            } else {

                user.role = "caregiver";

                user.name = caregiverData.name;

                user.phone = caregiverData.phone;

                user.city = caregiverData.city;

                await user.save();

                console.log(
                    `✓ User linked: ${caregiverData.name}`
                );

            }


            // -------------------------------------------------
            // REMOVE OLD CAREGIVER PROFILE
            // -------------------------------------------------

            await Caregiver.deleteOne({

                email: caregiverData.email

            });


            // -------------------------------------------------
            // CREATE CAREGIVER PROFILE
            // -------------------------------------------------

            await Caregiver.create({

                user: user._id,

                name: caregiverData.name,

                email: caregiverData.email,

                phone: caregiverData.phone,

                city: caregiverData.city,

                gender: caregiverData.gender,

                services: caregiverData.services,

                experience: caregiverData.experience,

                hourlyRate: caregiverData.hourlyRate,

                rating: caregiverData.rating,

                reviews: caregiverData.reviews,

                bio: caregiverData.bio,

                verified: caregiverData.verified,

                available: caregiverData.available

            });

        }


        console.log("");

        console.log("========================================");

        console.log("       SEED COMPLETED");

        console.log("========================================");

        console.log("6 caregiver profiles created.");

        console.log("6 caregiver user accounts created/linked.");

        console.log("");

        console.log("Demo caregiver login password:");

        console.log("Caregiver@123");

        console.log("");

        console.log("========================================");


        await mongoose.connection.close();

        process.exit(0);

    }

    catch (error) {

        console.error("");

        console.error("========================================");

        console.error("       SEED FAILED");

        console.error("========================================");

        console.error(error.message);

        console.error("========================================");

        console.error("");

        try {

            await mongoose.connection.close();

        } catch (closeError) {

            console.error(closeError.message);

        }

        process.exit(1);

    }

}


// =====================================================
// RUN SEED
// =====================================================

seedCaregivers();