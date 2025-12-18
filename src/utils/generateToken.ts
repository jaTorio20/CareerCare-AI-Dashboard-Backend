import { SignJWT } from "jose";
import { JWT_SECRET } from "./getJwtSecret";

/*
- Generates a JWT
  @param {Object} payload - Data to embed in the token.
  @param {string} expiresIn - Expiration time (15m, 7d, 30)
*/

interface JWTPayload {
  [key: string]: string | number | boolean;
}

export const generateToken = async (payload: JWTPayload, expiresIn = '15m') => {
  return await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt() //Will set to current timestamp
  .setExpirationTime(expiresIn) //
  .sign(JWT_SECRET)
};