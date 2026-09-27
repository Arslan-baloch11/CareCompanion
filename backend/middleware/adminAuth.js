const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function adminAuth(req, res, next) {
    try {

        // =========================================
        // CHECK AUTHORIZATION HEADER
        // =========================================

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }


        // =========================================
        // GET TOKEN
        // =========================================

        const token =
            authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Admin token missing."
            });
        }


        // =========================================
        // VERIFY JWT
        // =========================================

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

        } catch (error) {

            console.error(
                "ADMIN JWT VERIFY ERROR:",
                error.message
            );

            return res.status(401).json({
                success: false,
                message: "Invalid or expired admin token."
            });

        }


        console.log(
            "ADMIN JWT DECODED:",
            decoded
        );


        // =========================================
        // GET USER ID
        // =========================================

        const userId =
            decoded.userId ||
            decoded.id ||
            decoded._id ||
            decoded.user?.id ||
            decoded.user?._id;


        // =========================================
        // FIND ADMIN USER
        // =========================================

        let user = null;


        if (userId) {

            try {

                user =
                    await User.findById(
                        userId
                    ).select("-password");

            } catch (error) {

                console.error(
                    "ADMIN USER ID ERROR:",
                    error.message
                );

            }

        }


        // =========================================
        // FALLBACK: FIND BY EMAIL
        // =========================================

        if (
            !user &&
            decoded.email
        ) {

            user =
                await User.findOne({
                    email:
                        String(
                            decoded.email
                        )
                            .trim()
                            .toLowerCase()
                }).select("-password");

        }


        // =========================================
        // USER NOT FOUND
        // =========================================

        if (!user) {

            console.error(
                "ADMIN USER NOT FOUND."
            );

            console.error(
                "Token User ID:",
                userId
            );

            console.error(
                "Token Email:",
                decoded.email
            );

            return res.status(401).json({
                success: false,
                message: "Admin account could not be found."
            });

        }


        console.log(
            "ADMIN USER FOUND:",
            user.email,
            user._id.toString()
        );


        // =========================================
        // CHECK ACTIVE
        // =========================================

        if (
            user.isActive === false
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Admin account is deactivated."
            });

        }


        // =========================================
        // CHECK ADMIN ROLE
        // =========================================

        if (
            user.role !== "admin"
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Administrator access required."
            });

        }


        // =========================================
        // SAVE ADMIN USER
        // =========================================

        req.admin = user;
        req.user = user;


        // =========================================
        // CONTINUE
        // =========================================

        next();

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Admin authentication failed."
        });

    }
}

module.exports = adminAuth;