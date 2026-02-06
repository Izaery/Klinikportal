import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

export function generateToken(user: AuthenticatedUser): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(user, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }

  req.user = user;
  next();
}

// Middleware zum Prüfen bestimmter Rollen
export function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    next();
  };
}
