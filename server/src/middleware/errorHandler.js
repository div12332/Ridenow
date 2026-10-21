export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body contains invalid JSON.' })
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' })
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(', ') })
  }
  if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' })
  if (error.name === 'CastError') return res.status(400).json({ message: 'The requested resource is invalid.' })
  console.error(error)
  return res.status(500).json({ message: 'An unexpected server error occurred.' })
}
