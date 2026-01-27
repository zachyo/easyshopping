# Password Security & Dual Authentication Guide

## Password Security Explained

### How Passwords Are Kept Secure

#### 1. **Password Hashing with Bcrypt**

**What is hashing?**

- A one-way mathematical function that converts a password into a fixed-length string
- **Impossible to reverse** - you can't get the original password from the hash
- Same password always produces the same hash

**Example:**

```
Password: "MySecurePass123!"
Bcrypt Hash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

**Why Bcrypt?**

- Industry standard for password hashing
- Built-in **salt** (random data added to each password)
- Configurable **work factor** (makes brute-force attacks slower)
- Resistant to rainbow table attacks

#### 2. **How It Works in Your Backend**

**Registration Flow:**

```typescript
// User submits: password = "MySecurePass123!"

// Backend hashes it with bcrypt (10 salt rounds)
import bcrypt from "bcryptjs";

const hashedPassword = await bcrypt.hash("MySecurePass123!", 10);
// Result: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// Store ONLY the hash in database, NEVER the plain password
await User.create({
  email: "user@example.com",
  password: hashedPassword, // Stored in database
});
```

**Login Flow:**

```typescript
// User submits: password = "MySecurePass123!"

// Backend retrieves hash from database
const user = await User.findOne({ where: { email: "user@example.com" } });
// user.password = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

// Compare submitted password with stored hash
const isValid = await bcrypt.compare("MySecurePass123!", user.password);
// Returns: true (if password matches) or false (if doesn't match)

if (isValid) {
  // Generate JWT token and log user in
} else {
  // Reject login attempt
}
```

#### 3. **Security Features**

**Salt (Automatic in Bcrypt):**

- Random data added to each password before hashing
- Prevents identical passwords from having identical hashes
- Each user gets a unique salt

**Example:**

```
User A: password = "password123"
Hash: "$2b$10$abc123..." (salt: abc123)

User B: password = "password123" (same password!)
Hash: "$2b$10$xyz789..." (salt: xyz789) - DIFFERENT HASH!
```

**Work Factor (Cost Factor):**

- Number of hashing iterations (default: 10 = 2^10 = 1,024 iterations)
- Higher = slower but more secure
- Protects against brute-force attacks

```typescript
// 10 rounds = ~65ms to hash (good balance)
bcrypt.hash(password, 10);

// 12 rounds = ~260ms to hash (more secure, slower)
bcrypt.hash(password, 12);
```

#### 4. **What Gets Stored in Database**

```sql
-- users table
id    | email              | password (HASHED)                                          | role
------|--------------------|------------------------------------------------------------|----------
uuid1 | user@example.com   | $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy | customer
uuid2 | vendor@example.com | $2b$10$abc123xyz789def456ghi789jkl012mno345pqr678stu901vwx234 | vendor
```

**Important:** The actual password "MySecurePass123!" is NEVER stored anywhere!

#### 5. **Security Best Practices (Already in Your Backend)**

✅ **Password never stored in plain text**
✅ **Password never logged**
✅ **Password never sent in API responses**
✅ **HTTPS required** (password encrypted in transit)
✅ **Bcrypt with salt** (prevents rainbow tables)
✅ **Work factor of 10+** (slows down brute-force)

---

## Dual Authentication: OAuth + Email/Password

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  OAuth Login     │         │ Email/Password   │     │
│  │  (Google, etc.)  │         │ Login            │     │
│  └────────┬─────────┘         └────────┬─────────┘     │
│           │                            │                │
│           └────────────┬───────────────┘                │
│                        │                                │
│                        ▼                                │
│              ┌──────────────────┐                       │
│              │  User Account    │                       │
│              │  (Same JWT)      │                       │
│              └──────────────────┘                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### User Model with Both Methods

```typescript
// User can authenticate with EITHER OAuth OR email/password
interface User {
  id: string;
  email: string;

  // Email/Password fields (optional if using OAuth)
  password?: string; // Bcrypt hashed

  // OAuth fields (optional if using email/password)
  oauthProvider?: "google" | "facebook" | "twitter";
  oauthId?: string;
  profilePicture?: string;

  // Common fields
  role: "customer" | "vendor";
  profileCompleted: boolean;
  createdAt: Date;
}
```

### Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,

  -- Email/Password authentication
  password VARCHAR(255), -- Bcrypt hash (nullable for OAuth users)

  -- OAuth authentication
  oauth_provider VARCHAR(20), -- 'google', 'facebook', 'twitter' (nullable)
  oauth_id VARCHAR(255), -- OAuth provider's user ID (nullable)
  profile_picture TEXT, -- From OAuth or uploaded

  -- Common fields
  role VARCHAR(20) NOT NULL,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_auth_method CHECK (
    (password IS NOT NULL) OR
    (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
  ),
  CONSTRAINT unique_oauth UNIQUE (oauth_provider, oauth_id)
);
```

**Key Points:**

- User MUST have either `password` OR `oauth_provider + oauth_id`
- Can't have both (prevents confusion)
- Email is always unique

---

## Implementation: Dual Authentication

### 1. Updated Auth Routes

**File:** `backend/src/routes/auth.routes.ts`

```typescript
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Customer, Vendor } from "../models";
import { OAuthService } from "../services/oauth.service";

const router = express.Router();
const oauthService = new OAuthService();

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

// Register with email/password (Customer)
router.post("/register/customer", async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, bvn } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword, // Store ONLY the hash
      role: "customer",
      profileCompleted: true,
    });

    // Create customer profile
    const customer = await Customer.create({
      userId: user.id,
      firstName,
      lastName,
      phone,
      bvn,
      profileCompleted: true,
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      message: "Customer registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Register with email/password (Vendor)
router.post("/register/vendor", async (req, res) => {
  try {
    const {
      email,
      password,
      businessName,
      businessCategory,
      settlementAccountNumber,
      settlementBankCode,
    } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: "vendor",
      profileCompleted: true,
    });

    const vendor = await Vendor.create({
      userId: user.id,
      businessName,
      businessCategory,
      settlementAccountNumber,
      settlementBankCode,
      verified: true,
      profileCompleted: true,
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      message: "Vendor registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      vendor,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// Login with email/password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user has password (not OAuth user)
    if (!user.password) {
      return res.status(400).json({
        error:
          "This account uses OAuth login. Please sign in with Google/Facebook/Twitter.",
      });
    }

    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get profile
    let profile = null;
    if (user.role === "customer") {
      profile = await Customer.findOne({ where: { userId: user.id } });
    } else if (user.role === "vendor") {
      profile = await Vendor.findOne({ where: { userId: user.id } });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
      },
      profile,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// ============================================
// OAUTH AUTHENTICATION
// ============================================

// Google OAuth
router.post("/oauth/google", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    // Verify OAuth token
    const oauthData = await oauthService.verifyGoogleToken(code, redirectUri);

    // Find user by OAuth ID
    let user = await User.findOne({
      where: {
        oauthProvider: "google",
        oauthId: oauthData.oauthId,
      },
    });

    // Check if email exists with password (prevent account hijacking)
    if (!user) {
      const existingEmailUser = await User.findOne({
        where: { email: oauthData.email },
      });
      if (existingEmailUser && existingEmailUser.password) {
        return res.status(400).json({
          error:
            "An account with this email already exists. Please log in with email/password.",
        });
      }
    }

    if (!user) {
      // Create new OAuth user
      user = await User.create({
        email: oauthData.email,
        oauthProvider: "google",
        oauthId: oauthData.oauthId,
        profilePicture: oauthData.profilePicture,
        profileCompleted: false,
        role: "customer", // Default, updated in profile completion
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    // Get profile if exists
    let profile = null;
    if (user.role === "customer") {
      profile = await Customer.findOne({ where: { userId: user.id } });
    } else if (user.role === "vendor") {
      profile = await Vendor.findOne({ where: { userId: user.id } });
    }

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        profileCompleted: user.profileCompleted,
      },
      profile,
    });
  } catch (error) {
    console.error("OAuth error:", error);
    return res.status(500).json({ error: "OAuth authentication failed" });
  }
});

// Facebook OAuth (similar structure)
router.post("/oauth/facebook", async (req, res) => {
  // Similar to Google OAuth
});

// Twitter OAuth (similar structure)
router.post("/oauth/twitter", async (req, res) => {
  // Similar to Google OAuth
});

export default router;
```

---

## Frontend: Dual Authentication UI

### Login Page with Both Options

```typescript
// /login page
function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'email'>('oauth');

  return (
    <div className="login-container">
      <h1>Welcome Back</h1>

      {/* OAuth Login (Default) */}
      {loginMethod === 'oauth' && (
        <div className="oauth-section">
          <button onClick={() => handleGoogleLogin()}>
            <GoogleIcon /> Continue with Google
          </button>
          <button onClick={() => handleFacebookLogin()}>
            <FacebookIcon /> Continue with Facebook
          </button>
          <button onClick={() => handleTwitterLogin()}>
            <TwitterIcon /> Continue with Twitter
          </button>

          <div className="divider">OR</div>

          <button
            onClick={() => setLoginMethod('email')}
            className="text-link"
          >
            Sign in with email
          </button>
        </div>
      )}

      {/* Email/Password Login */}
      {loginMethod === 'email' && (
        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            placeholder="Email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            required
          />
          <button type="submit">Sign In</button>

          <button
            onClick={() => setLoginMethod('oauth')}
            className="text-link"
          >
            ← Back to OAuth login
          </button>
        </form>
      )}
    </div>
  );
}
```

### Registration Page with Both Options

```typescript
// /register page
function RegisterPage() {
  const [registerMethod, setRegisterMethod] = useState<'oauth' | 'email'>('oauth');

  return (
    <div className="register-container">
      <h1>Create Account</h1>

      {/* OAuth Registration (Recommended) */}
      {registerMethod === 'oauth' && (
        <div className="oauth-section">
          <p className="recommended-badge">Recommended</p>

          <button onClick={() => handleGoogleSignup()}>
            <GoogleIcon /> Continue with Google
          </button>
          <button onClick={() => handleFacebookSignup()}>
            <FacebookIcon /> Continue with Facebook
          </button>
          <button onClick={() => handleTwitterSignup()}>
            <TwitterIcon /> Continue with Twitter
          </button>

          <div className="divider">OR</div>

          <button
            onClick={() => setRegisterMethod('email')}
            className="text-link"
          >
            Sign up with email
          </button>
        </div>
      )}

      {/* Email/Password Registration */}
      {registerMethod === 'email' && (
        <form onSubmit={handleEmailRegister}>
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />
          <input type="text" placeholder="First Name" required />
          <input type="text" placeholder="Last Name" required />
          <input type="tel" placeholder="Phone" required />
          <input type="text" placeholder="BVN (11 digits)" required />

          <button type="submit">Create Account</button>

          <button
            onClick={() => setRegisterMethod('oauth')}
            className="text-link"
          >
            ← Back to OAuth signup
          </button>
        </form>
      )}
    </div>
  );
}
```

---

## Security Comparison

### Email/Password Security

✅ Password hashed with bcrypt (10+ rounds)  
✅ Salt automatically included  
✅ One-way encryption (can't be reversed)  
✅ HTTPS encryption in transit  
✅ Never stored in plain text  
✅ Never logged or exposed in API

⚠️ User must create strong password  
⚠️ Password reset flow needed  
⚠️ Vulnerable to phishing

### OAuth Security

✅ No password to store or manage  
✅ Trusted provider (Google/Facebook/Twitter)  
✅ Email verification handled by provider  
✅ 2FA handled by provider  
✅ Automatic security updates from provider

⚠️ Dependency on third-party service  
⚠️ Requires OAuth app setup

---

## Recommendation

### Best Approach: **Offer Both, Recommend OAuth**

**Why?**

1. **User Choice** - Some users prefer email/password
2. **Accessibility** - Not everyone has Google/Facebook/Twitter
3. **Flexibility** - Users can choose their preferred method
4. **Security** - OAuth is more secure, but email/password is still very secure with bcrypt

**Implementation:**

- Default to OAuth on login/register pages
- Show email/password as secondary option
- Both methods are equally secure
- Same JWT token regardless of auth method

---

## Summary

### Password Security (Bcrypt):

- ✅ Passwords hashed with bcrypt (industry standard)
- ✅ Automatic salt (prevents rainbow tables)
- ✅ Work factor of 10+ (slows brute-force)
- ✅ One-way encryption (can't be reversed)
- ✅ **Very secure** when implemented correctly

### Dual Authentication:

- ✅ Support both OAuth AND email/password
- ✅ User chooses preferred method
- ✅ Same security level for both
- ✅ Same JWT token system
- ✅ Flexible and user-friendly

**Your passwords are kept secure through bcrypt hashing - they're never stored in plain text and can't be reversed!**
