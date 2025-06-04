const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
require('dotenv').config();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// Generate JWT access token
const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'mentra-api',
    subject: user.id.toString()
  });
};

// Generate JWT refresh token
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    type: 'refresh',
    jti: crypto.randomUUID() // Unique token ID for revocation
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'mentra-api',
    subject: user.id.toString()
  });
};

// Verify JWT token
const verifyToken = (token, tokenType = 'access') => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mentra-api'
    });

    // Check token type
    if (decoded.type !== tokenType) {
      throw new Error(`Invalid token type. Expected ${tokenType}, got ${decoded.type}`);
    }

    return {
      valid: true,
      decoded,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      decoded: null,
      error: error.message
    };
  }
};

// Hash password
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    throw new Error('Failed to verify password');
  }
};

// Create user session in database
const createUserSession = async (userId, sessionToken, ipAddress, userAgent) => {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const sessionQuery = `
      INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `;

    const [result] = await sequelize.query(sessionQuery, {
      replacements: [userId, sessionToken, ipAddress, userAgent, expiresAt]
    });

    return result[0];
  } catch (error) {
    console.error('Failed to create user session:', error);
    throw new Error('Failed to create session');
  }
};

// Update session activity
const updateSessionActivity = async (sessionToken) => {
  try {
    const updateQuery = `
      UPDATE user_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP
      RETURNING id
    `;

    const [result] = await sequelize.query(updateQuery, {
      replacements: [sessionToken]
    });

    return result.length > 0;
  } catch (error) {
    console.error('Failed to update session activity:', error);
    return false;
  }
};

// Revoke user session
const revokeSession = async (sessionToken) => {
  try {
    const deleteQuery = `
      DELETE FROM user_sessions 
      WHERE session_token = $1
      RETURNING id
    `;

    const [result] = await sequelize.query(deleteQuery, {
      replacements: [sessionToken]
    });

    return result.length > 0;
  } catch (error) {
    console.error('Failed to revoke session:', error);
    return false;
  }
};

// Revoke all user sessions (logout from all devices)
const revokeAllUserSessions = async (userId) => {
  try {
    const deleteQuery = `
      DELETE FROM user_sessions 
      WHERE user_id = $1
      RETURNING id
    `;

    const [result] = await sequelize.query(deleteQuery, {
      replacements: [userId]
    });

    return result.length;
  } catch (error) {
    console.error('Failed to revoke all user sessions:', error);
    return 0;
  }
};

// Clean up expired sessions
const cleanupExpiredSessions = async () => {
  try {
    const deleteQuery = `
      DELETE FROM user_sessions 
      WHERE expires_at < CURRENT_TIMESTAMP
      RETURNING id
    `;

    const [result] = await sequelize.query(deleteQuery);
    const cleanedCount = result.length;

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }

    return cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    return 0;
  }
};

// Get user by email
const getUserByEmail = async (email) => {
  try {
    const userQuery = `
      SELECT 
        u.*,
        sp.grade_level,
        sp.learning_style,
        tp.school_name,
        tp.subjects_taught,
        pp.relationship_type
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id  
      LEFT JOIN parent_profiles pp ON u.id = pp.user_id
      WHERE u.email = $1 AND u.deleted_at IS NULL
    `;

    const [result] = await sequelize.query(userQuery, {
      replacements: [email.toLowerCase()]
    });

    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw new Error('Failed to retrieve user');
  }
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const userQuery = `
      SELECT 
        u.*,
        sp.grade_level,
        sp.learning_style,
        tp.school_name,
        tp.subjects_taught,
        pp.relationship_type
      FROM users u
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id  
      LEFT JOIN parent_profiles pp ON u.id = pp.user_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;

    const [result] = await sequelize.query(userQuery, {
      replacements: [userId]
    });

    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw new Error('Failed to retrieve user');
  }
};

// Update user last login
const updateLastLogin = async (userId, ipAddress) => {
  try {
    const updateQuery = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await sequelize.query(updateQuery, {
      replacements: [userId]
    });

    return true;
  } catch (error) {
    console.error('Failed to update last login:', error);
    return false;
  }
};

// Authenticate user
const authenticateUser = async (email, password, ipAddress, userAgent) => {
  try {
    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
        user: null,
        tokens: null
      };
    }

    // Check user status
    if (user.status !== 'active') {
      return {
        success: false,
        message: 'Account is not active. Please contact support.',
        user: null,
        tokens: null
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password',
        user: null,
        tokens: null
      };
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Create session
    await createUserSession(user.id, refreshToken, ipAddress, userAgent);

    // Update last login
    await updateLastLogin(user.id, ipAddress);

    // Remove sensitive data
    const { password_hash, ...safeUser } = user;

    return {
      success: true,
      message: 'Authentication successful',
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    return {
      success: false,
      message: 'Authentication failed',
      user: null,
      tokens: null
    };
  }
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const tokenVerification = verifyToken(refreshToken, 'refresh');
    if (!tokenVerification.valid) {
      return {
        success: false,
        message: 'Invalid refresh token',
        tokens: null
      };
    }

    // Check if session exists and is valid
    const sessionQuery = `
      SELECT us.*, u.email, u.role 
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 AND us.expires_at > CURRENT_TIMESTAMP
    `;

    const [sessionResult] = await sequelize.query(sessionQuery, {
      replacements: [refreshToken]
    });

    if (sessionResult.length === 0) {
      return {
        success: false,
        message: 'Session not found or expired',
        tokens: null
      };
    }

    const session = sessionResult[0];

    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: session.user_id,
      email: session.email,
      role: session.role
    });

    // Update session activity
    await updateSessionActivity(refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: refreshToken, // Keep same refresh token
        expiresIn: JWT_EXPIRES_IN
      }
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return {
      success: false,
      message: 'Token refresh failed',
      tokens: null
    };
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  createUserSession,
  updateSessionActivity,
  revokeSession,
  revokeAllUserSessions,
  cleanupExpiredSessions,
  getUserByEmail,
  getUserById,
  updateLastLogin,
  authenticateUser,
  refreshAccessToken
}; 