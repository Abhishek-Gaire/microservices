require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const  Redis = require("ioredis");
const {rateLimit} = require("express-rate-limit");
const {RedisStore} = require("rate-limit-redis");

const app = express();

const logger = require("./utils/logger");

mongoose.connect(process.env.MONGO_URI)
    .then(() => logger.info("Connected To MongoDB database"))
    .catch((e) => logger.error("Mongo connection error"))

const redisClient = new Redis(process.env.REDIS_URI);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next()
})

//DDOS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient:redisClient,
    keyPrefix:"middleware",
    points:10,
    duration:1
})
app.use((req,res,next) => {
    rateLimiter.consume(req.ip).then(() => next()).catch(() => 
    logger.warn(`Rate Limit exceeded for IP: ${req.ip}`))
    res.status(429).json({
        success:false,
        message:"too many requests"
    })
})

// IP based rate limitiong for sensitive enpoints
const sensitiveEndPointslimiter = rateLimit({
    windowMs:15 * 60*1000,
    max:50,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res) => {
        logger.warn(`Sensitive endpoint rate limiyt exceeded fro IP: ${req.ip}`);
        res.status(429).json({
            success:false,
            message:"too many requests"
        })
    },
    store:new RedisStore({
        sendCommand:(...args) => redisClient.call(...args)
    })
})

// apply this sensitive endpoint limiters for out=r routes
app.use("/api/v1/auth/register",sensitiveEndPointslimiter)

const identityRoute = require("./routes/identity_service");
app.use("/api/v1/auth/register",identityRoute)

const errorHandler = require("./middleware/error_handler")
app.use(errorHandler)

const PORT = process.env.PORT || 3001;

app.listen(PORT, ()=>{
    logger.info(`Identity service running on port ${PORT}`)
})

process.on("unhandledRejection",(reason,promise) => {
    logger.error("unhandled rejection at",promise,"reason",reason)
})