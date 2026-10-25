import { Router } from "express";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { randomBytes, createHash } from "node:crypto";
import { getDB } from "../db/connection.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./email.service.js";

const router = Router();

const USERS_COLLECTION = "auth_users";
const COOKIE_NAME = "foresight_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

let indexPromise;

async function getUsersCollection() {
  const users = getDB().collection(USERS_COLLECTION);

  if (!indexPromise) {
    indexPromise = users
      .createIndex({ email: 1 }, { unique: true })
      .catch((error) => {
        indexPromise = undefined;
        throw error;
      });
  }

  await indexPromise;
  return users;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short.");
  }

  return secret;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

function createToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified === true,
    createdAt: user.createdAt,
  };
}

function issueSession(res, user) {
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      ver: user.sessionVersion ?? 0,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

async function createVerificationToken(users, user) {
  const token = createToken();

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: new Date(
          Date.now() + VERIFICATION_TTL_MS
        ),
        updatedAt: new Date(),
      },
    }
  );

  return token;
}

/**
 * POST /api/v1/auth/register
 * Create an account and send its email verification link.
 */
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 80 characters.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and at most 72 bytes.",
      });
    }

    const users = await getUsersCollection();
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await users.findOne(
      { email: normalizedEmail },
      { projection: { _id: 1 } }
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists. Try signing in or requesting a verification email.",
      });
    }

    const now = new Date();
    const rawToken = createToken();

    const user = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      emailVerified: false,
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: new Date(
        now.getTime() + VERIFICATION_TTL_MS
      ),
      sessionVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(user);
    user._id = result.insertedId;

    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token: rawToken,
      });
    } catch (emailError) {
      // Do not leave a new account blocked if the verification email failed.
      await users.deleteOne({
        _id: user._id,
        emailVerified: false,
      }).catch(() => {});

      console.error("Verification email could not be sent:", emailError.message);

      return res.status(503).json({
        success: false,
        message: "Verification email could not be sent. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Account created. Check the email testing inbox for your verification link.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create your account. Please try again.",
    });
  }
});

/**
 * POST /api/v1/auth/verify-email
 * Verify a single-use email token and start a session.
 */
router.post("/verify-email", authLimiter, async (req, res) => {
  try {
    const { token } = req.body ?? {};

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    const users = await getUsersCollection();
    const tokenDigest = hashToken(token);
    const now = new Date();

    const user = await users.findOne({
      emailVerificationTokenHash: tokenDigest,
      emailVerificationExpiresAt: { $gt: now },
      emailVerified: { $ne: true },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    const update = await users.updateOne(
      {
        _id: user._id,
        emailVerificationTokenHash: tokenDigest,
        emailVerificationExpiresAt: { $gt: new Date() },
        emailVerified: { $ne: true },
      },
      {
        $set: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: {
          emailVerificationTokenHash: "",
          emailVerificationExpiresAt: "",
        },
      }
    );

    if (update.modifiedCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    const verifiedUser = await users.findOne({ _id: user._id });

    issueSession(res, verifiedUser);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      data: { user: publicUser(verifiedUser) },
    });
  } catch (error) {
    console.error("Email verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify your email. Please try again.",
    });
  }
});

/**
 * POST /api/v1/auth/resend-verification
 * Send a replacement link without revealing account existence.
 */
router.post("/resend-verification", authLimiter, async (req, res) => {
  const message =
    "If an account with that email needs verification, a verification link will be sent.";

  try {
    const { email } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(200).json({ success: true, message });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({
      email: normalizeEmail(email),
    });

    if (user && user.emailVerified !== true) {
      const token = await createVerificationToken(users, user);

      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          token,
        });
      } catch (emailError) {
        console.error(
          "Resend verification email failed:",
          emailError.message
        );
      }
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Resend verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not process the request. Please try again.",
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Require a verified email before creating a session.
 */
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      !isValidEmail(email) ||
      typeof password !== "string" ||
      password.length === 0 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({
      email: normalizeEmail(email),
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.emailVerified !== true) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message:
          "Please verify your email before signing in. You can request another verification email.",
      });
    }

    issueSession(res, user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: { user: publicUser(user) },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not log in. Please try again.",
    });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Always return a generic response to avoid revealing registered emails.
 */
router.post("/forgot-password", authLimiter, async (req, res) => {
  const message =
    "If a verified account exists with that email, a password-reset link will be sent.";

  try {
    const { email } = req.body ?? {};

    if (!isValidEmail(email)) {
      return res.status(200).json({ success: true, message });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({
      email: normalizeEmail(email),
      emailVerified: true,
    });

    if (user) {
      const token = createToken();

      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetTokenHash: hashToken(token),
            passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MS),
            updatedAt: new Date(),
          },
        }
      );

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token,
        });
      } catch (emailError) {
        console.error("Password-reset email failed:", emailError.message);
        await users.updateOne(
          {
            _id: user._id,
            passwordResetTokenHash: hashToken(token),
          },
          {
            $unset: {
              passwordResetTokenHash: "",
              passwordResetExpiresAt: "",
            },
          }
        ).catch(() => {});
      }
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Forgot-password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not process the request. Please try again.",
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Replace a password using a valid, single-use reset token.
 */
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body ?? {};

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and at most 72 bytes.",
      });
    }

    const users = await getUsersCollection();
    const tokenDigest = hashToken(token);
    const user = await users.findOne({
      passwordResetTokenHash: tokenDigest,
      passwordResetExpiresAt: { $gt: new Date() },
      emailVerified: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const update = await users.updateOne(
      {
        _id: user._id,
        passwordResetTokenHash: tokenDigest,
        passwordResetExpiresAt: { $gt: new Date() },
        emailVerified: true,
      },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
        $inc: { sessionVersion: 1 },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetExpiresAt: "",
        },
      }
    );

    if (update.modifiedCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired.",
      });
    }

    clearSession(res);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("Password-reset error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not reset your password. Please try again.",
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Verify the current session and return its user.
 */
router.get("/me", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "You are not logged in.",
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (
      typeof payload.sub !== "string" ||
      !ObjectId.isValid(payload.sub)
    ) {
      clearSession(res);

      return res.status(401).json({
        success: false,
        message: "Invalid session. Please log in again.",
      });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({
      _id: new ObjectId(payload.sub),
    });

    if (
      !user ||
      user.emailVerified !== true ||
      payload.ver !== (user.sessionVersion ?? 0)
    ) {
      clearSession(res);

      return res.status(401).json({
        success: false,
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: publicUser(user) },
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      clearSession(res);

      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    console.error("Session verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify your session.",
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Clear the session cookie.
 */
router.post("/logout", (req, res) => {
  clearSession(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;
