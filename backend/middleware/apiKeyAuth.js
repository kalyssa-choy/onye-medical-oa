const DEFAULT_DEV_API_KEY = "onye-dev-key";

// Fallback key is for local development only, override with APP_API_KEY in real application
export const getExpectedApiKey = () =>
  process.env.APP_API_KEY || DEFAULT_DEV_API_KEY;

// middleware to check if the api key is valid (matches expected key and blocked unauthorized access)
// @param req the request object
// @param res the response object
// @param next the next middleware function
// @return the next middleware function or a 401 error if the api key is invalid
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
