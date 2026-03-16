const DEFAULT_DEV_API_KEY = "onye-dev-key";

// Fallback key is for local development only; override with APP_API_KEY in real environments.
export const getExpectedApiKey = () =>
  process.env.APP_API_KEY || DEFAULT_DEV_API_KEY;

export const apiKeyAuth = (req, res, next) => {
  const expected = getExpectedApiKey();
  const provided = req.get("x-api-key");

  if (!provided || provided !== expected) {
    return res.status(401).json({
      error: "Unauthorized: invalid or missing x-api-key",
    });
  }

  return next();
};
