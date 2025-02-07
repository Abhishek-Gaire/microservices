const generateToken = require("../utils/generate_token");
const logger = require("../utils/logger");
const {validateRegistration, validateLogin} = require("../utils/validation_schema");

const User = require("../models/user_model");
const RefreshToken = require("../models/refresh_token");
// user registration
const registerUser =async(req,res) => {
    logger.info("Registration endpoint hit...")
    try{
        const{error}  = validateRegistration(req.body);
        if(error){
            logger.warn("Validation error",error.details[0].message);
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }
        const {email,password,username} = req.body;

        let user = await User.findOne({
            $or:[{email},{username}]
        })
        if(user){
            logger.warn("User Already Exists")
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }
        user = new User({username,email,password});
        await user.save();
        logger.warn("User saved successfully", user._id)

        const {accessToken,refreshToken} = await generateToken(user);

        res.status(201).json({
            success:true,
            message:"User Created Successfully",
            accessToken,
            refreshToken
        })
    }catch(error){
        logger.error("Registration Error",error);
        return res.status(500).josn({
            success:false,
            message:"Internal Server Error"
        })
    }
}

//user login
const loginUser = async (req, res) => {
        logger.info("Login endpoint hit...")
    try {
        const { error } = validateLogin(req.body)
        if(error){
            logger.warn("Validation error",error.details[0].message);
            return res.status(400).json({
                success:false,
                message:error.details[0].message
            })
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn("Invalid User");
            return res.status(400).json({
                success: false,
                message:"Invalid credentials"
            })
        }

        //validate password
        const isValidPassword = await User.comparePassword(password);
        if (!isValidPassword) {
             logger.warn("Invalid Password");
            return res.status(400).json({
                success: false,
                message:"Invalid Password"
            })
        }

        const { accessToken, generateToken } = await generateToken(user);
        res.json({
            accessToken,
            refreshToken,
            userId: user._id
        })
    } catch (error) {
        logger.error("Registration Error",error);
        return res.status(500).josn({
            success:false,
            message:"Internal Server Error"
        })
    }
}


//refresh token
const refreshTokenUser = async (req, res) => {
    logger.info("Refresh endpoint hit")
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn("RefreshToken Missing")
            return res.status(400).json({
                success: false,
                message:"Refresh token missing"
            })
        }

        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken || storedToken.expiresAt < new Date()) {
            logger.warn("Invalid or expired refresh token")
            return res.status(401).json({
                success: false,
                message:"Invalid or expired refresh token"
            })
        }

        const user = await User.findById(storedToken.user)
        if (!user) {
            logger.warn("User not found")
            return res.status(401).json({
                success: false,
                message:"User not found"
            })
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateToken(user);

        //delete the old refresh token
        await RefreshToken.deleteOne({ _id: storedToken._id })
        
        res.json({
            accessToken: newAccessToken,
            refreshToken:newRefreshToken
        })
    } catch (error) {
        logger.error("Refresh Token Error",error);
        return res.status(500).josn({
            success:false,
            message:"Internal Server Error"
        })
    }
}

//logout
const logoutUser = async (req, res) => {
    logger.info("Logout Endpoint hit");
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            logger.warn("RefreshToken Missing")
            return res.status(400).json({
                success: false,
                message:"Refresh token missing"
            })
        }

        await RefreshToken.deleteOne({ token: refreshToken });
        logger.info("Refresh Token deleted for logout");

        return res.json({
            success: true,
            message:"User Logged Out Successfully"
        })
    } catch (error) {
       logger.error("Logout Error User",error);
        return res.status(500).josn({
            success:false,
            message:"Internal Server Error"
        }) 
    }
}
module.export = {registerUser,loginUser,refreshTokenUser,logoutUser}