const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const productRouter = require("./routes/productRoutes");
const userRouter = require("./routes/userRoutes");

const app = express();

// 1) GLOBAL SECURITY MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Rate limiting (Limits requests from same IP)
const limiter = rateLimit({
  max: 100, // Allow 100 requests per hour
  windowMs: 60 * 60 * 1000, 
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body. Also cookie parser.
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'price', 'category', 'seller', 'name'
  ]
}));

// Serving static files
app.use(express.static(`${__dirname}/public`));

// 2) ROUTES
app.use("/api/v1/products", productRouter);
app.use("/api/v1/users", userRouter);

// Add 404 Not Found Errors Handler for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;