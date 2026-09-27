const express = require("express");
const jwt = require("jsonwebtoken");
const Notification = require("../models/Notification");

const router = express.Router();


// =====================================================
// AUTH MIDDLEWARE
// =====================================================

const authMiddleware = (req, res, next) => {
    try {

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
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
// GET MY NOTIFICATIONS
// =====================================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {

        try {

            const notifications =
                await Notification.find({
                    recipient: req.user.id
                })
                .populate(
                    "booking",
                    "service bookingDate startTime status"
                )
                .sort({
                    createdAt: -1
                })
                .limit(50);


            const unreadCount =
                await Notification.countDocuments({
                    recipient: req.user.id,
                    isRead: false
                });


            res.json({

                success: true,

                count:
                    notifications.length,

                unreadCount,

                notifications

            });

        } catch (error) {

            console.error(
                "Get Notifications Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server error while loading notifications."

            });

        }

    }
);


// =====================================================
// GET UNREAD COUNT
// =====================================================

router.get(
    "/unread-count",
    authMiddleware,
    async (req, res) => {

        try {

            const unreadCount =
                await Notification.countDocuments({
                    recipient: req.user.id,
                    isRead: false
                });


            res.json({

                success: true,

                unreadCount

            });

        } catch (error) {

            console.error(
                "Unread Count Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Unable to get unread notification count."

            });

        }

    }
);


// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

router.put(
    "/:id/read",
    authMiddleware,
    async (req, res) => {

        try {

            const notification =
                await Notification.findOne({
                    _id: req.params.id,
                    recipient: req.user.id
                });


            if (!notification) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Notification not found."

                });

            }


            notification.isRead = true;

            await notification.save();


            res.json({

                success: true,

                message:
                    "Notification marked as read.",

                notification

            });

        } catch (error) {

            console.error(
                "Mark Notification Read Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server error."

            });

        }

    }
);


// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

router.put(
    "/read-all",
    authMiddleware,
    async (req, res) => {

        try {

            await Notification.updateMany(
                {
                    recipient: req.user.id,
                    isRead: false
                },
                {
                    $set: {
                        isRead: true
                    }
                }
            );


            res.json({

                success: true,

                message:
                    "All notifications marked as read."

            });

        } catch (error) {

            console.error(
                "Read All Notifications Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server error."

            });

        }

    }
);


// =====================================================
// DELETE ONE NOTIFICATION
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const notification =
                await Notification.findOneAndDelete({
                    _id: req.params.id,
                    recipient: req.user.id
                });


            if (!notification) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Notification not found."

                });

            }


            res.json({

                success: true,

                message:
                    "Notification deleted successfully."

            });

        } catch (error) {

            console.error(
                "Delete Notification Error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Server error."

            });

        }

    }
);


module.exports = router;