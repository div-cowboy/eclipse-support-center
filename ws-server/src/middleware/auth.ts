import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (!decoded.userId || !decoded.chatId) {
      throw new Error('Invalid token payload: missing userId or chatId');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract token from query parameters
 */
export function extractToken(url: string): string | null {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get('token');
  } catch (error) {
    logger.error('Failed to extract token from URL', error);
    return null;
  }
}

/**
 * Validate internal API request
 */
export function validateInternalRequest(authHeader: string | undefined): boolean {
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  
  if (!expectedSecret) {
    logger.warn('INTERNAL_API_SECRET not set, internal requests will fail');
    return false;
  }
  
  return authHeader === `Bearer ${expectedSecret}`;
}

