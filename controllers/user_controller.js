// controllers/user_controller.js
const jwt = require("jsonwebtoken");
const userService = require("../services/user_service");

function generateToken(user) {
  const payload = {
    userId: user._id,
    roles: user.roles,
    status: user.status,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * POST /api/v1/users/register
 * Registration with OTP
 */
// controllers/user_controller.js - Update the registerUser function
async function registerUser(req, res) {
  try {
    const { full_name, email, phone, password, roles } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "full_name, email and password are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format. Please enter a valid email address.",
      });
    }

    // Validate roles if provided
    if (roles) {
      const validRoles = ["customer", "agent", "manager", "admin", "driver"];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      
      if (invalidRoles.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid roles: ${invalidRoles.join(", ")}. Valid roles are: ${validRoles.join(", ")}`,
        });
      }

      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Roles must be a non-empty array",
        });
      }
    }

    const user = await userService.registerUserWithEmailOtp({
      full_name,
      email,
      phone,
      password,
      roles, // Pass roles to service
    });

    res.status(201).json({
      success: true,
      message: "Registration started. OTP sent to your email for verification.",
      data: {
        userId: user._id,
        email: user.email,
        status: user.status,
        roles: user.roles, // Include roles in response
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to register user",
    });
  }
}

/**
 * POST /api/v1/users/verify-email
 */
async function verifyEmail(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const user = await userService.verifyEmailOtp({ email, otp });

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify email",
    });
  }
}

/**
 * POST /api/v1/users/login
 */
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await userService.getUserByEmailWithPassword(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isValid = await userService.validatePassword(user, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active. Please verify your email.",
      });
    }

    const token = generateToken(user);

    user.password_hash = undefined;

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
}

/**
 * GET /api/v1/users/me
 */
async function getProfile(req, res) {
  try {
    const user = await userService.getUserById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
    });
  }
}

/**
 * PATCH /api/v1/users/me
 */
async function updateProfile(req, res) {
  try {
    const user = await userService.updateOwnProfile(req.user._id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}

/**
 * GET /api/v1/users
 */
async function getUsers(req, res) {
  try {
    const { status, role, page, limit } = req.query;

    const result = await userService.listUsers({
      status,
      role,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
}

/**
 * GET /api/v1/users/:id
 */
async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
}

/**
 * PATCH /api/v1/users/:id
 */
async function updateUser(req, res) {
  try {
    const user = await userService.updateUserByAdmin(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
}

/**
 * PATCH /api/v1/users/:id/status
 */
async function updateUserStatus(req, res) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const user = await userService.changeUserStatus(req.params.id, status);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
}

/**
 * DELETE /api/v1/users/:id
 */
async function removeUser(req, res) {
  try {
    const user = await userService.deleteUser(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
}

/**
 * POST /api/v1/users/me/request-delete
 */
async function requestDeleteAccount(req, res) {
  try {
    await userService.sendDeleteAccountOtp(req.user._id);
    res.json({
      success: true,
      message: "OTP sent to your email to confirm account deletion",
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send delete account OTP",
    });
  }
}

/**
 * POST /api/v1/users/me/confirm-delete
 */
async function confirmDeleteAccount(req, res) {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "otp is required",
      });
    }

    await userService.verifyDeleteAccountOtpAndDelete(req.user._id, otp);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete account",
    });
  }
}

/**
 * 🔥 POST /api/v1/users/forgot-password/request-otp
 */
async function forgotPasswordRequest(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    await userService.requestPasswordResetOtp(email);

    res.json({
      success: true,
      message: "If an account with that email exists, an OTP has been sent.",
    });
  } catch (error) {
    // You can still hide 404 details if you want, but following your pattern:
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send password reset OTP",
    });
  }
}

/**
 * 🔥 POST /api/v1/users/forgot-password/reset
 */
async function forgotPasswordReset(req, res) {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: "email, otp and new_password are required",
      });
    }

    const user = await userService.resetPasswordWithOtp({
      email,
      otp,
      newPassword: new_password,
    });

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    if (!error.statusCode) console.error(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
}

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  removeUser,
  requestDeleteAccount,
  confirmDeleteAccount,
  forgotPasswordRequest,
  forgotPasswordReset,
};
