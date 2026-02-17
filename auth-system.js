/**
 * ChitraHarsha VisvaDarsana - User Authentication System
 * Version: 7.0.0
 *
 * Features:
 * - OTP Verification (Email + SMS)
 * - Multi-factor authentication (MFA)
 * - Biometric authentication support
 * - Social login integration
 * - Session management
 * - OAuth 2.0 / JWT tokens
 * - Rate limiting
 * - Password policies
 * - Cloud storage integration
 * - Data encryption
 *
 * Copyright (c) 2026 The ChitraHarsha VPK Ventures
 * Patent Pending - All Rights Reserved
 */

class UserAuthenticationSystem {
  constructor() {
    this.version = "7.0.0";
    this.users = new Map();
    this.sessions = new Map();
    this.loginAttempts = new Map();
    this.otpStore = new Map(); // OTP storage
    this.maxLoginAttempts = 5;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.otpLength = 6;
    this.maxOtpAttempts = 3;
    this.mfaEnabled = true;

    console.log(`🔐 User Authentication System v${this.version} loaded`);
  }

  /**
   * Initialize authentication system
   */
  async initialize() {
    console.log("🚀 Initializing authentication system...");

    // Load users from storage
    await this.loadUsers();

    // Clean expired sessions
    this.startSessionCleanup();

    console.log("✅ Authentication system initialized");
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { email, password, firstName, lastName } = userData;

    // Validate email
    if (!this.validateEmail(email)) {
      throw new Error("Invalid email address");
    }

    // Validate password strength
    if (!this.validatePasswordStrength(password)) {
      throw new Error("Password does not meet security requirements");
    }

    // Check if user exists
    if (this.users.has(email)) {
      throw new Error("User already exists");
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Generate user ID
    const userId = this.generateUserId();

    // Create user
    const user = {
      id: userId,
      email,
      passwordHash,
      firstName,
      lastName,
      createdAt: new Date().toISOString(),
      verified: false,
      mfaEnabled: false,
      role: "user",
      status: "active",
    };

    // Store user
    this.users.set(email, user);
    await this.saveUsers();

    // Store user data in cloud storage (encrypted)
    if (window.CloudStorage) {
      await window.CloudStorage.store(
        "userData",
        {
          userId,
          email,
          firstName,
          lastName,
          category: "user_profile",
          userId: userId,
        },
        true,
      );
    }

    // Send OTP for verification
    const otpResult = await this.sendOTP(email, "registration");

    console.log(`✅ User registered: ${email}`);

    return {
      userId,
      email,
      otpSent: true,
      message:
        "Registration successful. Please verify with OTP sent to your email.",
    };
  }

  /**
   * Login user
   */
  async login(email, password, mfaCode = null) {
    // Check rate limiting
    if (this.isRateLimited(email)) {
      throw new Error("Too many login attempts. Please try again later.");
    }

    // Get user
    const user = this.users.get(email);
    if (!user) {
      this.recordLoginAttempt(email, false);
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      this.recordLoginAttempt(email, false);
      throw new Error("Invalid credentials");
    }

    // Check MFA
    if (user.mfaEnabled && this.mfaEnabled) {
      if (!mfaCode) {
        // Send MFA code
        await this.sendMFACode(email);
        return {
          requiresMFA: true,
          message: "MFA code sent to your registered device",
        };
      }

      // Verify MFA code
      const isValidMFA = await this.verifyMFACode(email, mfaCode);
      if (!isValidMFA) {
        throw new Error("Invalid MFA code");
      }
    }

    // Create session
    const session = await this.createSession(user);

    // Clear login attempts
    this.loginAttempts.delete(email);

    console.log(`✅ User logged in: ${email}`);

    return {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Logout user
   */
  async logout(sessionId) {
    const session = this.sessions.get(sessionId);

    if (session) {
      this.sessions.delete(sessionId);
      console.log(`✅ User logged out: ${session.userId}`);
      return { success: true };
    }

    return { success: false, message: "Session not found" };
  }

  /**
   * Create session
   */
  async createSession(user) {
    const sessionId = this.generateSessionId();
    const expiresAt = Date.now() + this.sessionTimeout;

    // Generate JWT token
    const token = await this.generateJWT(user);

    const session = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      token,
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Verify session
   */
  async verifySession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { valid: false, message: "Session not found" };
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return { valid: false, message: "Session expired" };
    }

    // Update last activity
    session.lastActivity = Date.now();

    return {
      valid: true,
      user: {
        id: session.userId,
        email: session.email,
      },
    };
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId) {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Generate MFA secret
    const mfaSecret = this.generateMFASecret();
    user.mfaSecret = mfaSecret;
    user.mfaEnabled = true;

    await this.saveUsers();

    return {
      success: true,
      secret: mfaSecret,
      qrCode: this.generateQRCode(mfaSecret),
    };
  }

  /**
   * Biometric authentication (Web Authentication API)
   */
  async registerBiometric(userId) {
    if (!window.PublicKeyCredential) {
      throw new Error("Biometric authentication not supported");
    }

    const user = Array.from(this.users.values()).find((u) => u.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Create credential (simulated)
    const credential = {
      id: this.generateCredentialId(),
      type: "public-key",
      publicKey: "simulated_public_key",
      counter: 0,
    };

    user.biometricCredentials = user.biometricCredentials || [];
    user.biometricCredentials.push(credential);

    await this.saveUsers();

    console.log("✅ Biometric registered");

    return { success: true, credentialId: credential.id };
  }

  /**
   * Social login (OAuth 2.0)
   */
  async socialLogin(provider, accessToken) {
    console.log(`🔐 Social login: ${provider}`);

    // Verify token with provider (simulated)
    const profile = await this.verifyOAuthToken(provider, accessToken);

    // Find or create user
    let user = this.users.get(profile.email);

    if (!user) {
      // Create new user
      user = {
        id: this.generateUserId(),
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        createdAt: new Date().toISOString(),
        verified: true,
        socialProvider: provider,
        role: "user",
        status: "active",
      };

      this.users.set(profile.email, user);
      await this.saveUsers();
    }

    // Create session
    const session = await this.createSession(user);

    return {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
      token: session.token,
    };
  }

  /**
   * Password reset
   */
  async requestPasswordReset(email) {
    const user = this.users.get(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: "If email exists, reset link has been sent",
      };
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour

    await this.saveUsers();

    // Send reset email (simulated)
    await this.sendPasswordResetEmail(email, resetToken);

    console.log(`✅ Password reset requested: ${email}`);

    return { success: true, message: "Password reset link sent" };
  }

  async resetPassword(resetToken, newPassword) {
    // Find user with token
    const user = Array.from(this.users.values()).find(
      (u) => u.resetToken === resetToken && u.resetTokenExpiry > Date.now(),
    );

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Validate new password
    if (!this.validatePasswordStrength(newPassword)) {
      throw new Error("Password does not meet security requirements");
    }

    // Update password
    user.passwordHash = await this.hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await this.saveUsers();

    console.log(`✅ Password reset: ${user.email}`);

    return { success: true, message: "Password reset successfully" };
  }

  /**
   * Utility functions
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  validatePasswordStrength(password) {
    // Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  }

  async hashPassword(password) {
    // Simulated PBKDF2 (in production, use actual crypto)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async verifyPassword(password, hash) {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  async generateJWT(user) {
    // Simplified JWT generation
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + this.sessionTimeout,
      }),
    );
    const signature = await this.hashPassword(header + "." + payload);

    return `${header}.${payload}.${signature}`;
  }

  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMFASecret() {
    return Math.random().toString(36).substr(2, 16).toUpperCase();
  }

  generateQRCode(secret) {
    return `otpauth://totp/ChitraHarsha?secret=${secret}`;
  }

  generateCredentialId() {
    return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateResetToken() {
    return Math.random().toString(36).substr(2, 32);
  }

  isRateLimited(email) {
    const attempts = this.loginAttempts.get(email);
    return (
      attempts &&
      attempts.count >= this.maxLoginAttempts &&
      Date.now() - attempts.lastAttempt < 900000
    ); // 15 min lockout
  }

  recordLoginAttempt(email, success) {
    if (success) {
      this.loginAttempts.delete(email);
      return;
    }

    const attempts = this.loginAttempts.get(email) || {
      count: 0,
      lastAttempt: 0,
    };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);
  }

  // ===== OTP VERIFICATION SYSTEM =====

  /**
   * Generate and send OTP
   * @param {string} destination - Email or phone number
   * @param {string} purpose - 'registration', 'login', 'reset', 'transaction'
   * @returns {Promise<object>} OTP send result
   */
  async sendOTP(destination, purpose = "login") {
    console.log(`📱 Generating OTP for ${purpose}...`);

    // Generate secure OTP
    const otp = this.generateSecureOTP();
    const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store OTP with metadata
    const otpRecord = {
      id: otpId,
      otp: await this.hashPassword(otp), // Store hashed OTP
      destination,
      purpose,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.otpExpiry,
      attempts: 0,
      maxAttempts: this.maxOtpAttempts,
      verified: false,
    };

    this.otpStore.set(otpId, otpRecord);

    // Store encrypted OTP in cloud storage for audit
    if (window.CloudStorage) {
      await window.CloudStorage.store(
        "userData",
        {
          category: "otp_audit",
          destination,
          purpose,
          otpId,
          timestamp: new Date().toISOString(),
        },
        true,
      );
    }

    // Simulate sending via email/SMS
    if (destination.includes("@")) {
      await this.sendOTPViaEmail(destination, otp, purpose);
    } else {
      await this.sendOTPViaSMS(destination, otp, purpose);
    }

    console.log(`✅ OTP sent to ${destination} (Purpose: ${purpose})`);

    return {
      success: true,
      otpId,
      destination: this.maskDestination(destination),
      expiresIn: this.otpExpiry / 1000 + " seconds",
      message: `OTP sent to ${this.maskDestination(destination)}`,
    };
  }

  /**
   * Verify OTP
   * @param {string} otpId - OTP identifier
   * @param {string} userOtp - OTP entered by user
   * @returns {Promise<object>} Verification result
   */
  async verifyOTP(otpId, userOtp) {
    console.log(`🔍 Verifying OTP...`);

    const otpRecord = this.otpStore.get(otpId);

    if (!otpRecord) {
      return { success: false, message: "OTP not found or expired" };
    }

    // Check expiry
    if (Date.now() > otpRecord.expiresAt) {
      this.otpStore.delete(otpId);
      return {
        success: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      this.otpStore.delete(otpId);
      return {
        success: false,
        message: "Maximum OTP attempts exceeded. Please request a new OTP.",
      };
    }

    // Increment attempts
    otpRecord.attempts++;

    // Verify OTP hash
    const inputHash = await this.hashPassword(userOtp);
    if (inputHash !== otpRecord.otp) {
      const remaining = otpRecord.maxAttempts - otpRecord.attempts;
      return {
        success: false,
        message: `Invalid OTP. ${remaining} attempts remaining.`,
        attemptsRemaining: remaining,
      };
    }

    // OTP verified successfully
    otpRecord.verified = true;
    this.otpStore.delete(otpId);

    // Handle purpose-specific actions
    await this.handleOTPVerificationSuccess(otpRecord);

    console.log(`✅ OTP verified successfully for ${otpRecord.purpose}`);

    return {
      success: true,
      purpose: otpRecord.purpose,
      destination: otpRecord.destination,
      message: "OTP verified successfully",
    };
  }

  /**
   * Handle post-OTP verification actions
   */
  async handleOTPVerificationSuccess(otpRecord) {
    switch (otpRecord.purpose) {
      case "registration":
        // Mark user as verified
        const user = this.users.get(otpRecord.destination);
        if (user) {
          user.verified = true;
          user.verifiedAt = new Date().toISOString();
          await this.saveUsers();
        }
        break;
      case "login":
        // Login verified, session already created
        break;
      case "reset":
        // Password reset authorized
        break;
      case "transaction":
        // Transaction authorized
        break;
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(otpId) {
    const otpRecord = this.otpStore.get(otpId);

    if (!otpRecord) {
      return { success: false, message: "Original OTP request not found" };
    }

    // Delete old OTP and send a new one
    this.otpStore.delete(otpId);
    return await this.sendOTP(otpRecord.destination, otpRecord.purpose);
  }

  /**
   * Generate cryptographically secure OTP
   */
  generateSecureOTP() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otp = ((array[0] % 900000) + 100000).toString();
    return otp;
  }

  /**
   * Send OTP via email
   */
  async sendOTPViaEmail(email, otp, purpose) {
    // Simulated email sending (in production, integrate with email service)
    const subjects = {
      registration: "Verify Your Account - ChitraHarsha VisvaDarsana",
      login: "Login Verification - ChitraHarsha VisvaDarsana",
      reset: "Password Reset OTP - ChitraHarsha VisvaDarsana",
      transaction: "Transaction Authorization - ChitraHarsha VisvaDarsana",
    };

    console.log(`📧 Email OTP sent to ${email}`);
    console.log(`   Subject: ${subjects[purpose] || "Verification OTP"}`);
    console.log(`   OTP Code: ${otp}`);
    console.log(`   Expires in: ${this.otpExpiry / 60000} minutes`);
  }

  /**
   * Send OTP via SMS
   */
  async sendOTPViaSMS(phone, otp, purpose) {
    // Simulated SMS sending (in production, integrate with SMS gateway)
    console.log(`📱 SMS OTP sent to ${phone}`);
    console.log(`   Message: Your ChitraHarsha verification code is ${otp}`);
    console.log(`   Valid for ${this.otpExpiry / 60000} minutes`);
  }

  /**
   * Mask destination for privacy
   */
  maskDestination(destination) {
    if (destination.includes("@")) {
      const [name, domain] = destination.split("@");
      return name.substring(0, 2) + "***@" + domain;
    } else {
      return destination.substring(0, 3) + "****" + destination.slice(-2);
    }
  }

  // ===== ORIGINAL METHODS (ENHANCED) =====

  async sendVerificationEmail(email) {
    return await this.sendOTP(email, "registration");
  }

  async sendMFACode(email) {
    const result = await this.sendOTP(email, "login");
    return result;
  }

  async verifyMFACode(email, code) {
    // Find active OTP for this email
    for (const [otpId, record] of this.otpStore) {
      if (record.destination === email && record.purpose === "login") {
        const result = await this.verifyOTP(otpId, code);
        return result.success;
      }
    }
    return false;
  }

  async verifyOAuthToken(provider, token) {
    // Simulated OAuth verification
    return {
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
    };
  }

  async sendPasswordResetEmail(email, token) {
    return await this.sendOTP(email, "reset");
  }

  startSessionCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions) {
        if (now > session.expiresAt) {
          this.sessions.delete(sessionId);
        }
      }
      // Clean expired OTPs
      for (const [otpId, record] of this.otpStore) {
        if (now > record.expiresAt) {
          this.otpStore.delete(otpId);
        }
      }
    }, 60000); // Every minute
  }

  async saveUsers() {
    // Save to Quantum SQL
    if (window.QuantumSQL) {
      for (const [email, user] of this.users) {
        await window.QuantumSQL.insert("users", user);
      }
    }
    // Also save encrypted backup to cloud storage
    if (window.CloudStorage) {
      const userList = Array.from(this.users.values()).map((u) => ({
        ...u,
        passwordHash: "[REDACTED]",
      }));
      await window.CloudStorage.store(
        "userData",
        {
          category: "user_backup",
          userCount: userList.length,
          timestamp: new Date().toISOString(),
        },
        true,
      );
    }
  }

  async loadUsers() {
    if (window.QuantumSQL) {
      const users = await window.QuantumSQL.select("users");
      users.forEach((record) => {
        this.users.set(record.data.email, record.data);
      });
    }
  }

  getStats() {
    return {
      version: this.version,
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      activeOTPs: this.otpStore.size,
      mfaEnabled: this.mfaEnabled,
      otpExpiry: this.otpExpiry / 1000 + "s",
      maxOtpAttempts: this.maxOtpAttempts,
      features: [
        "OTP Verification (Email + SMS)",
        "Multi-Factor Authentication",
        "Biometric Authentication",
        "Social Login (OAuth)",
        "Password Reset with OTP",
        "Session Management",
        "Rate Limiting",
        "JWT Tokens",
        "Cloud Storage Integration",
        "Data Encryption",
      ],
    };
  }
}

// Global instance
window.AuthSystem = new UserAuthenticationSystem();

console.log("🔐 User Authentication System v7.0.0 with OTP ready");
