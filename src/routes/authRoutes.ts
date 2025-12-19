import { User } from '../models/User';
import express, {Request, Response, NextFunction} from 'express';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '../utils/getJwtSecret';
import { generateToken } from '../utils/generateToken';

const router = express.Router();

// @route         POST api/auth/register
// @description   Register new user
// @access        Public
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body || {};

    if(!name || !email || !password){
      res.status(400);
      throw new Error('All fields are required');
    }

    const existingUser = await User.findOne({
      email: email
    });

    if(existingUser){
      res.status(400);
      throw new Error('User already exists')
    };

    const user = await User.create({
      name,
      email,
      password
    });

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