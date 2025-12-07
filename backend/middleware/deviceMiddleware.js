// middleware/deviceMiddleware.js
/**
 * This middleware checks whether the current request is coming
 * from the user's registered (primary) device.
 *
 * - Expects GUID in header:  X-Device-Id
 * - Allows registration of primaryDeviceId on first usage (already done in authRoutes).
 * - If deviceId !== primaryDeviceId => block write/sync operations.
 */

export const requirePrimaryDevice = (req, res, next) => {
  try {
    const deviceId =
      req.headers["x-device-id"] || req.headers["X-Device-Id"] || null;

    if (!deviceId) {
      return res.status(400).json({
        error:
          "Device ID missing. Please ensure your client sends X-Device-Id header.",
      });
    }

    if (!req.user.primaryDeviceId) {
      // Should not normally happen if you set it on signup/login,
      // but we can be strict and block modification here.
      return res.status(403).json({
        error:
          "Primary device not registered. Please re-login from your original device.",
      });
    }

    if (deviceId !== req.user.primaryDeviceId) {
      return res.status(403).json({
        error:
          "Write operations are allowed only from your registered device. You are in view-only mode on this device.",
      });
    }

    // Mark for downstream use if needed
    req.isPrimaryDevice = true;
    next();
  } catch (err) {
    console.error("requirePrimaryDevice error:", err.message);
    return res.status(500).json({ error: "Server error (device check)" });
  }
};
