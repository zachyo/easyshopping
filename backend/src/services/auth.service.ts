import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Customer from "../models/Customer";
import Vendor from "../models/Vendor";

interface RegisterCustomerParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  bvn: string;
}

interface RegisterVendorParams {
  email: string;
  password: string;
  businessName: string;
  businessCategory: string;
  settlementAccountNumber: string;
  settlementBankCode: string;
}

interface LoginParams {
  email: string;
  password: string;
}

class AuthService {
  /**
   * Generate JWT token
   */
  private generateToken(userId: string, role: string): string {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_here";
    const expiresIn: number = 7 * 24 * 60 * 60; // 7 days

    return jwt.sign({ userId, role }, secret, { expiresIn });
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register customer
   */
  async registerCustomer(
    params: RegisterCustomerParams,
  ): Promise<{ user: any; customer: any; token: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: params.email } });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Validate BVN length
    if (params.bvn.length !== 11) {
      throw new Error("BVN must be 11 digits");
    }

    // Hash password
    const passwordHash = await this.hashPassword(params.password);

    // Create user
    const user = await User.create({
      email: params.email,
      password_hash: passwordHash,
      role: "customer",
    });

    // Create customer profile
    const customer = await Customer.create({
      user_id: user.id,
      first_name: params.firstName,
      last_name: params.lastName,
      phone: params.phone,
      bvn: params.bvn, // TODO: Encrypt BVN in production
    });

    // Generate token
    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: {
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
      },
      token,
    };
  }

  /**
   * Register vendor
   */
  async registerVendor(
    params: RegisterVendorParams,
  ): Promise<{ user: any; vendor: any; token: string }> {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: params.email } });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const passwordHash = await this.hashPassword(params.password);

    // Create user
    const user = await User.create({
      email: params.email,
      password_hash: passwordHash,
      role: "vendor",
    });

    // Create vendor profile
    const vendor = await Vendor.create({
      user_id: user.id,
      business_name: params.businessName,
      business_category: params.businessCategory,
      settlement_account_number: params.settlementAccountNumber,
      settlement_bank_code: params.settlementBankCode,
      approval_status: "pending",
    });

    // Generate token
    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      vendor: {
        id: vendor.id,
        businessName: vendor.business_name,
        approvalStatus: vendor.approval_status,
      },
      token,
    };
  }

  /**
   * Login user
   */
  async login(
    params: LoginParams,
  ): Promise<{ user: any; profile: any; token: string }> {
    // Find user
    const user = await User.findOne({ where: { email: params.email } });
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await this.verifyPassword(
      params.password,
      user.password_hash,
    );
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Get profile based on role
    let profile: any = null;
    if (user.role === "customer") {
      profile = await Customer.findOne({ where: { user_id: user.id } });
    } else if (user.role === "vendor") {
      profile = await Vendor.findOne({ where: { user_id: user.id } });
    }

    // Generate token
    const token = this.generateToken(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile: profile
        ? {
            id: profile.id,
            ...(user.role === "customer"
              ? {
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  phone: profile.phone,
                }
              : {
                  businessName: profile.business_name,
                  approvalStatus: profile.approval_status,
                }),
          }
        : null,
      token,
    };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; role: string } {
    try {
      const secret = process.env.JWT_SECRET || "your_jwt_secret_here";
      const decoded = jwt.verify(token, secret) as {
        userId: string;
        role: string;
      };
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<{ user: any; profile: any }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    let profile: any = null;
    if (user.role === "customer") {
      profile = await Customer.findOne({ where: { user_id: user.id } });
    } else if (user.role === "vendor") {
      profile = await Vendor.findOne({ where: { user_id: user.id } });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile: profile
        ? {
            id: profile.id,
            ...(user.role === "customer"
              ? {
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  phone: profile.phone,
                }
              : {
                  businessName: profile.business_name,
                  approvalStatus: profile.approval_status,
                }),
          }
        : null,
    };
  }
}

export default new AuthService();
