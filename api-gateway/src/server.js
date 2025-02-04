require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const proxy = require("express-http-proxy");

const logger = require("./utils/logger");
const errorHandler = require("../../identity-service/src/middleware/error_handler");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//rate limiting
const rateLimitOptions = rateLimit({
    windowMs:15 * 60*1000,
    max:100,
    standardHeaders:true,
    legacyHeaders:false,
    handler:(req,res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded fro IP: ${req.ip}`);
        res.status(429).json({
            success:false,
            message:"too many requests"
        })
    },
    store:new RedisStore({
        sendCommand:(...args) => redisClient.call(...args)
    })
})
app.use(rateLimitOptions);

app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/,"/api")
    },
    proxyErrorHandler: (err, res, next) =>{
        logger.error(`Proxy error: ${err.message}`);
        res.status(500).json({
            message:"Internal Server Error", error:err.messae
        })
    }
}

//setting up proxy for identity service
app.use("/v1/auth", proxy(process.env.IDENTITYY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["Content-Type"] = "application/json"
        return proxyReqOpts
    },
    userResDecorator: (proxyRes, proxyResData, userReq,userRes) => {
        logger.info(`Response received from Identity service:${proxyRes.statusCode}`)
        return proxyRes.data;
    }
}));

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`)
    logger.info(`Identity Service is running on port ${process.env.IDENTITY_SERVICE_URL}`)
    logger.info(`Redis URL ${process.env.REDIS_URL}`)

})