# Backend OAuth Migration Guide

## Overview

This guide explains how to update your existing backend to support OAuth authentication while maintaining compatibility with your current OnePipe integration and database schema.

---

## Impact Assessment

### ✅ What Stays the Same

- **Database schema** - Only minor additions needed
- **OnePipe integration** - No changes required
- **Order/Product/Payment logic** - Unchanged
- **Webhook handling** - Unchanged
- **Bank account management** - Unchanged
- **All business logic** - Unchanged

### 🔄 What Changes

- **Authentication routes** - Replace email/password with OAuth
- **User/Customer/Vendor models** - Add OAuth fields
- **Registration flow** - Split into OAuth + profile completion
- **JWT generation** - Same mechanism, different trigger

---

## Database Schema Updates

### 1. Update `users` Table

```sql
-- Add OAuth fields to existing users table
ALTER TABLE users
ADD COLUMN oauth_provider VARCHAR(20),  -- 'google', 'facebook', 'twitter', or NULL for existing users
ADD COLUMN oauth_id VARCHAR(255),       -- Unique ID from OAuth provider
ADD COLUMN profile_picture TEXT,        -- URL to profile picture
ADD COLUMN profile_completed BOOLEAN DEFAULT false;

-- Make password nullable (for OAuth users)
ALTER TABLE users
ALTER COLUMN password DROP NOT NULL;

-- Add unique constraint for OAuth
CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX idx_users_oauth_id ON users(oauth_id);
```

### 2. Update `customers` Table

```sql
-- Add profile completion flag
ALTER TABLE customers
ADD COLUMN profile_completed BOOLEAN DEFAULT false;

-- Existing customers should be marked as completed
UPDATE customers SET profile_completed = true;
```

### 3. Update `vendors` Table

```sql
-- Add profile completion flag
ALTER TABLE vendors
ADD COLUMN profile_completed BOOLEAN DEFAULT false;

-- Existing vendors should be marked as completed
UPDATE vendors SET profile_completed = true;
```

---

## Backend Code Changes

### 1. Install OAuth Dependencies

```bash
cd backend
npm install passport passport-google-oauth20 passport-facebook passport-twitter
npm install @types/passport @types/passport-google-oauth20 @types/passport-facebook @types/passport-twitter --save-dev
```

### 2. Update User Model

**File:** `backend/src/models/User.ts`

```typescript
// Add new fields to User model
export interface UserAttributes {
  id: string;
  email: string;
  password?: string; // Now optional for OAuth users
  role: "customer" | "vendor" | "admin";

  // NEW: OAuth fields
  oauthProvider?: "google" | "facebook" | "twitter";
  oauthId?: string;
  profilePicture?: string;
  profileCompleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// Update Sequelize model definition
User.init(
  {
    // ... existing fields ...

    oauthProvider: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    oauthId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false
    },
  },
  {
    sequelize,
    tableName: "users",
    indexes: [
      {
        unique: true,
        fields: ["oauth_provider", "oauth_id"],
        where: {
          oauth_provider: { [Op.ne]: null },
        },
      },
    ],
  },
);
```

### 3. Update Customer Model

**File:** `backend/src/models/Customer.ts`

```typescript
export interface CustomerAttributes {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string; // Make optional until profile completion
  bvn?: string; // Make optional until profile completion
  profileCompleted: boolean; // NEW
  createdAt: Date;
  updatedAt: Date;
}

Customer.init(
  {
    // ... existing fields ...

    phone: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false
    },
    bvn: {
      type: DataTypes.STRING(11),
      allowNull: true, // Changed from false
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "customers",
  },
);
```

### 4. Update Vendor Model

**File:** `backend/src/models/Vendor.ts`

```typescript
export interface VendorAttributes {
  id: string;
  userId: string;
  businessName?: string; // Make optional until profile completion
  businessCategory?: string; // Make optional until profile completion
  settlementAccountNumber?: string; // Make optional until profile completion
  settlementBankCode?: string; // Make optional until profile completion
  phone?: string; // NEW - Make optional until profile completion
  verified: boolean;
  profileCompleted: boolean; // NEW
  createdAt: Date;
  updatedAt: Date;
}

Vendor.init(
  {
    // ... existing fields ...

    businessName: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false
    },
    businessCategory: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false
    },
    settlementAccountNumber: {
      type: DataTypes.STRING(10),
      allowNull: true, // Changed from false
    },
    settlementBankCode: {
      type: DataTypes.STRING(10),
      allowNull: true, // Changed from false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "vendors",
  },
);
```

---

## New OAuth Routes

### 5. Create OAuth Service

**File:** `backend/src/services/oauth.service.ts`

```typescript
import axios from "axios";

export class OAuthService {
  // Google OAuth
  async verifyGoogleToken(code: string, redirectUri: string) {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    return {
      provider: "google",
      oauthId: userResponse.data.id,
      email: userResponse.data.email,
      firstName: userResponse.data.given_name,
      lastName: userResponse.data.family_name,
      profilePicture: userResponse.data.picture,
    };
  }

  // Facebook OAuth
  async verifyFacebookToken(code: string, redirectUri: string) {
    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v12.0/oauth/access_token",
      {
        params: {
          code,
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
        },
      },
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,email,first_name,last_name,picture",
        access_token,
      },
    });

    return {
      provider: "facebook",
      oauthId: userResponse.data.id,
      email: userResponse.data.email,
      firstName: userResponse.data.first_name,
      lastName: userResponse.data.last_name,
      profilePicture: userResponse.data.picture?.data?.url,
    };
  }

  // Twitter OAuth (similar pattern)
  async verifyTwitterToken(code: string, redirectUri: string) {
    // Implementation for Twitter OAuth 2.0
    // Similar to Google/Facebook
  }
}
```

### 6. Create OAuth Routes

**File:** `backend/src/routes/oauth.routes.ts`

```typescript
import express from "express";
import { OAuthService } from "../services/oauth.service";
import { User, Customer, Vendor } from "../models";
import jwt from "jsonwebtoken";

const router = express.Router();
const oauthService = new OAuthService();

// Google OAuth
router.post("/oauth/google", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    // Verify token and get user info
    const oauthData = await oauthService.verifyGoogleToken(code, redirectUri);

    // Find or create user
    let user = await User.findOne({
      where: {
        oauthProvider: "google",
        oauthId: oauthData.oauthId,
      },
    });

    if (!user) {
      // New user - create with OAuth data
      user = await User.create({
        email: oauthData.email,
        oauthProvider: "google",
        oauthId: oauthData.oauthId,
        profilePicture: oauthData.profilePicture,
        profileCompleted: false,
        role: "customer", // Default, will be updated in profile completion
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    // Get profile data
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
    console.error("Google OAuth error:", error);
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

### 7. Create Profile Completion Routes

**File:** `backend/src/routes/profile.routes.ts`

```typescript
import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { User, Customer, Vendor } from "../models";
import { validateBody } from "../middleware/validation.middleware";

const router = express.Router();

// Complete customer profile
router.post(
  "/complete-profile/customer",
  authenticate,
  validateBody(["phone", "bvn"]),
  async (req, res) => {
    try {
      const { phone, bvn } = req.body;
      const userId = req.user!.userId;

      // Update user role
      await User.update(
        { role: "customer", profileCompleted: true },
        { where: { id: userId } },
      );

      // Create or update customer profile
      const [customer] = await Customer.upsert({
        userId,
        firstName: req.user!.firstName || "",
        lastName: req.user!.lastName || "",
        phone,
        bvn,
        profileCompleted: true,
      });

      return res.json({
        message: "Profile completed successfully",
        customer,
      });
    } catch (error) {
      console.error("Profile completion error:", error);
      return res.status(500).json({ error: "Failed to complete profile" });
    }
  },
);

// Complete vendor profile
router.post(
  "/complete-profile/vendor",
  authenticate,
  validateBody([
    "businessName",
    "businessCategory",
    "settlementAccountNumber",
    "settlementBankCode",
    "phone",
  ]),
  async (req, res) => {
    try {
      const {
        businessName,
        businessCategory,
        settlementAccountNumber,
        settlementBankCode,
        phone,
      } = req.body;
      const userId = req.user!.userId;

      // Update user role
      await User.update(
        { role: "vendor", profileCompleted: true },
        { where: { id: userId } },
      );

      // Create or update vendor profile
      const [vendor] = await Vendor.upsert({
        userId,
        businessName,
        businessCategory,
        settlementAccountNumber,
        settlementBankCode,
        phone,
        verified: true, // Auto-verify
        profileCompleted: true,
      });

      return res.json({
        message: "Profile completed successfully",
        vendor,
      });
    } catch (error) {
      console.error("Profile completion error:", error);
      return res.status(500).json({ error: "Failed to complete profile" });
    }
  },
);

export default router;
```

### 8. Update Main Server File

**File:** `backend/src/index.ts`

```typescript
import express from "express";
import oauthRoutes from "./routes/oauth.routes";
import profileRoutes from "./routes/profile.routes";
// ... existing imports ...

const app = express();

// ... existing middleware ...

// OAuth routes
app.use("/api/auth", oauthRoutes);
app.use("/api/auth", profileRoutes);

// ... existing routes ...
```

---

## Environment Variables

### Update `.env` file

```env
# Existing variables
ONEPIPE_API_KEY=your_key
ONEPIPE_CLIENT_SECRET=your_secret
ONEPIPE_WEBHOOK_SECRET=your_webhook_secret
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret

# NEW: OAuth credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

---

## Migration Strategy

### Option 1: Gradual Migration (Recommended)

**Support both email/password AND OAuth simultaneously**

1. Keep existing auth routes working
2. Add new OAuth routes
3. Allow users to choose authentication method
4. Gradually deprecate email/password

**Pros:**

- No breaking changes
- Existing users unaffected
- Can test OAuth thoroughly

**Cons:**

- More code to maintain temporarily

### Option 2: Full Migration

**Replace email/password with OAuth only**

1. Run database migrations
2. Replace auth routes
3. All new users must use OAuth
4. Existing users need to link OAuth account

**Pros:**

- Cleaner codebase
- Single authentication method

**Cons:**

- Requires user migration
- Potential disruption

---

## Testing Checklist

### Database

- [ ] Run migration scripts
- [ ] Verify new columns added
- [ ] Test unique constraints
- [ ] Verify existing data intact

### OAuth Flow

- [ ] Google OAuth working
- [ ] Facebook OAuth working
- [ ] Twitter OAuth working
- [ ] Error handling for failed OAuth
- [ ] Token exchange working

### Profile Completion

- [ ] Customer profile completion
- [ ] Vendor profile completion
- [ ] Validation working
- [ ] Profile data saved correctly

### Existing Features

- [ ] OnePipe integration still works
- [ ] Order creation still works
- [ ] Product management still works
- [ ] Webhook handling still works
- [ ] Bank account linking still works

---

## Backward Compatibility

### For Existing Users (if using gradual migration)

```typescript
// Keep existing registration routes
router.post("/register/customer", async (req, res) => {
  // Existing email/password registration
  // Mark as profileCompleted: true
  // No OAuth fields
});

router.post("/login", async (req, res) => {
  // Existing email/password login
  // Check if password exists (not OAuth user)
});
```

### Migration Path for Existing Users

```typescript
// Allow existing users to link OAuth account
router.post("/link-oauth/google", authenticate, async (req, res) => {
  const { code, redirectUri } = req.body;
  const userId = req.user!.userId;

  const oauthData = await oauthService.verifyGoogleToken(code, redirectUri);

  await User.update(
    {
      oauthProvider: "google",
      oauthId: oauthData.oauthId,
      profilePicture: oauthData.profilePicture,
    },
    {
      where: { id: userId },
    },
  );

  return res.json({ message: "OAuth account linked successfully" });
});
```

---

## Deployment Steps

1. **Backup Database**

   ```bash
   pg_dump easy_shopping > backup_$(date +%Y%m%d).sql
   ```

2. **Run Migrations**

   ```bash
   psql -d easy_shopping -f migrations/add_oauth_fields.sql
   ```

3. **Update Environment Variables**
   - Add OAuth credentials to production `.env`

4. **Deploy Backend**

   ```bash
   git add .
   git commit -m "Add OAuth authentication support"
   git push origin main
   # Railway will auto-deploy
   ```

5. **Verify**
   - Test OAuth endpoints
   - Check database updates
   - Verify existing features still work

---

## Summary

### Required Changes:

1. ✅ Database schema updates (add OAuth columns)
2. ✅ Install OAuth dependencies
3. ✅ Update User/Customer/Vendor models
4. ✅ Create OAuth service
5. ✅ Add OAuth routes
6. ✅ Add profile completion routes
7. ✅ Update environment variables

### No Changes Needed:

- ❌ OnePipe integration
- ❌ Webhook handling
- ❌ Order/Product logic
- ❌ Payment reconciliation
- ❌ Bank account management

### Estimated Time:

- Database migration: 30 minutes
- Code changes: 3-4 hours
- Testing: 2 hours
- **Total: ~6 hours**

---

**The good news:** Your core business logic (OnePipe integration, payments, orders) remains completely unchanged. OAuth only affects the authentication layer!
