import type { CookieOptions } from 'express';

export const cookieConfig: CookieOptions = {
  httpOnly: true,
  secure: process.env.SECURE_COOKIE === 'true',
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 24, // 1 dia
};