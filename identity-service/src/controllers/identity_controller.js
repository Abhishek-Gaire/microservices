const generateToken = require("../utils/generate_token");
const logger = require("../utils/logger");
const {validateRegistration, validateLogin} = require("../utils/validation_schema");

const User = require("../models/user_model")
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


//logout

module.export = {registerUser,loginUser}