function notFound(req, res, next) {
  res.status(404).json({
    error: `Not Found - ${req.method} ${req.originalUrl}`,
  });
}

module.exports = notFound;
