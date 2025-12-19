import { User } from '../models/User';
import express, {Request, Response, NextFunction} from 'express';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '../utils/getJwtSecret';
import { generateToken } from '../utils/generateToken';
import crypto from "crypto";
import { sendVerificationEmail } from '../utils/sendOtp';

const router = express.Router();

// @route         POST api/auth/register
// @description   Register new user
// @access        Public
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('All fields are required');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        return res.status(200).json({
          message: "Account already exists but not verified. Please verify your email.",
          needsVerification: true
        });
      }
      res.status(409);
      throw new Error("User already exists and is verified");
    }

    // Create user with isVerified = false
    const otp = crypto.randomInt(100000, 999999).toString();
    const user = await User.create({
      name,
      email,
      password,
      isVerified: false,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP via email
    await sendVerificationEmail({
      to: user.email,
      subject: "Verify your account",
      html: `
        <p>Your OTP is <strong>${otp}</strong> valid only for 10 minutes.</p>
        <p>Or click here to verify: 
          <a href="http://localhost:3000/verify?email=${encodeURIComponent(user.email)}">
            Verify Account
          </a>
        </p>`
    });

    res.status(201).json({
      message: "Registration successful. Please verify your email with the OTP sent."
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// @route         POST api/auth/resend-otp
// @description   Resend OTP to unverified user
// @access        Public
router.post('/resend-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      // Security: generic response to avoid account enumeration
      return res.status(200).json({ message: "If this email exists, an OTP has been sent." });
    }

    // if (user.isVerified) {
    //   res.status(400);
    //   throw new Error("User is already verified");
    // }

    // Optional: rate-limit resend
    if (user.lastOtpSentAt && Date.now() - user.lastOtpSentAt.getTime() < 60 * 1000) { // resend after 1 minute
      res.status(429);
      throw new Error("Please wait before requesting another OTP");
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.lastOtpSentAt = new Date();
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      subject: "Verify your account",
      html: `
        <p>Your OTP is <strong>${otp}</strong> valid only for 10 minutes</p>
        <p>Or click here to verify: 
          <a href="http://localhost:3000/verify?email=${encodeURIComponent(user.email)}">
            Verify Account
          </a>
        </p>`
    });

    res.status(200).json({ message: "New OTP has been sent to your email." });
  } catch (err) {
    console.error(err);
    next(err);
  }
});


router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (user.isVerified) {
      res.status(409); //Conflict
      throw new Error("User already verified");
    }

    //normalize OTP before comparing
    const cleanOtp = otp?.trim();

    if (user.otp !== cleanOtp || !user.otpExpires || Date.now() > user.otpExpires.getTime()) {
      res.status(401); // Unauthorized
      throw new Error("Invalid or expired OTP");
    }

    // Mark verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.lastOtpSentAt = undefined;
    await user.save();

    // Create Tokens
    const payload = { userId: user._id.toString() };
    const accessToken = await generateToken(payload, '15m');
    const refreshToken = await generateToken(payload, '30d');

    // Set refresh token in HTTP-Only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
});



// @route         POST api/auth/login
// @description   Authenticate user
// @access        Public
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body || {} ;

    if (!email || !password){
      res.status(400);
      throw new Error('Email and password are required');
    }

    //Find user
    const user = await User.findOne({ email });

    if(!user){
      res.status(401); //unauthorized
      throw new Error('Invalid Credentials');
    }

    // Block unverified accounts
    if (!user.isVerified) {
      res.status(403); // forbidden
      throw new Error('Account not verified. Please check your email for the OTP.');
    }

    //Check if password matches
    const isMatch = await user.matchPassword(password); //matchPassword created in User schema
  
    if(!isMatch){
      res.status(401); //unauthorized
      throw new Error('Invalid Credentials');
    };


    // Create Tokens
    const payload = { userId: user._id.toString() };
    //accessToken return or response with frontend
    const accessToken = await generateToken(payload, '15m'); // set user id to generateToken and set to 15 minutes
    const refreshToken = await generateToken(payload, '30d'); //refresh token stored in httponlyCookie

    // Set refresh token in HTTP-Only cookie
    res.cookie('refreshToken', refreshToken, { //first argument name of the cookie 2nd argument the data
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, //30 days
    })

    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
})


// @route         POST api/auth/logout
// @description   Logout user and clear refresh token
// @access        Private
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });

  res.status(200).json({message: 'Logged out successfully!'});
});

// @route         POST api/auth/refresh
// @description   Generate new access token from refresh token
// @access        Public (Needs valid refresh token in cookie)
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
 //if the refreshToken (login access) still valid, it will generate new accessToken
//every time the frontend calls the /refresh
  try {
    const token = req.cookies?.refreshToken;
    console.log('Refreshing token...')

    if(!token){
      res.status(401);
      throw new Error('No refresh token');
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const user = await User.findById(payload.userId);

    if (!user){
      res.status(401);
      throw new Error('No user');
    }

    const newAccessToken = await generateToken({userId: user._id.toString()}, '15m');

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      }
    })
  } catch (err) {
    res.status(401);
    next(err);
  }
});


export default router;