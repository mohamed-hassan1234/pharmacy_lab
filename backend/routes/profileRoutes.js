const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const {
    cleanString,
    normalizeEmail,
    isValidEmail,
    assertStrongPassword
} = require('../utils/security');

// @desc    Get Current User Profile
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Profile (Name, Email)
router.patch('/me', protect, async (req, res) => {
    try {
        const name = cleanString(req.body?.name, { maxLength: 80, allowEmpty: true });
        const email = normalizeEmail(req.body?.email);
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            if (!isValidEmail(email)) {
                return res.status(400).json({ message: 'Please provide a valid email address' });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        if (name) user.name = name;

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Change Password
router.patch('/me/change-password', protect, async (req, res) => {
    try {
        const currentPassword = cleanString(req.body?.currentPassword, {
            trim: false,
            maxLength: 128
        });
        const newPassword = cleanString(req.body?.newPassword, {
            trim: false,
            maxLength: 128
        });
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from the current password' });
        }

        assertStrongPassword(newPassword, 'New password');
        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete Own Account
router.delete('/me', protect, async (req, res) => {
    try {
        const password = cleanString(req.body?.password, {
            trim: false,
            maxLength: 128
        });
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Verify password before deletion
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password is incorrect' });
        }

        // Prevent admin from deleting themselves if they're the only admin
        if (user.role === 'Admin') {
            const adminCount = await User.countDocuments({ role: 'Admin' });
            if (adminCount <= 1) {
                return res.status(403).json({ message: 'Cannot delete the only admin account' });
            }
        }

        await user.deleteOne();
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
