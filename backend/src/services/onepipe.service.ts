import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import CryptoJS from "crypto-js";

interface OnePipeConfig {
  apiUrl: string;
  apiKey: string;
  clientSecret: string;
  mockMode: boolean;
}

interface BVNVerificationParams {
  bvn: string;
  accountNumber: string;
  bankCode: string;
}

interface SendInvoiceParams {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerMobile?: string;
  accountNumber?: string;
  bankCode?: string;
  amount: number;
  installments: number;
  orderId: string;
  paymentType?: "recurring" | "single_payment";
}

class OnePipeService {
  private client: AxiosInstance;
  private config: OnePipeConfig;

  constructor() {
    this.config = {
      apiUrl:
        process.env.ONEPIPE_API_URL || "https://api.dev.onepipe.io/v2/transact",
      apiKey: process.env.ONEPIPE_API_KEY || "",
      clientSecret: process.env.ONEPIPE_CLIENT_SECRET || "",
      mockMode: process.env.ONEPIPE_MOCK_MODE === "true",
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Generate MD5 signature for request authentication
   */
  private generateSignature(requestRef: string): string {
    const data = `${requestRef};${this.config.clientSecret}`;
    return crypto.createHash("md5").update(data).digest("hex");
  }

  /**
   * Encrypt account details using TripleDES
   */
  private encryptAccountDetails(
    accountNumber: string,
    bankCode: string,
  ): string {
    const data = `${accountNumber};${bankCode}`;
    const key = CryptoJS.enc.Utf16LE.parse(this.config.clientSecret);
    const keyHash = CryptoJS.MD5(key);

    // Extend key to 24 bytes for TripleDES
    const keyBytes = CryptoJS.lib.WordArray.create();
    keyBytes.concat(keyHash);
    keyBytes.concat(CryptoJS.lib.WordArray.create(keyHash.words.slice(0, 2)));

    const encrypted = CryptoJS.TripleDES.encrypt(
      CryptoJS.enc.Utf16LE.parse(data),
      keyBytes,
      {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
        iv: CryptoJS.lib.WordArray.create([0, 0]),
      },
    );

    return encrypted.toString();
  }

  /**
   * Verify BVN matches account holder
   * OnePipe API: lookup_bvn_min
   */
  /**
   * Verify BVN matches account holder
   * OnePipe API: lookup_bvn_min
   */
  async lookupBvnMin(params: BVNVerificationParams): Promise<any> {
    const requestRef = `BVN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signature = this.generateSignature(requestRef);

    const payload = {
      request_ref: requestRef,
      request_type: "lookup_bvn_min",
      auth: {
        type: "bank.account",
        secure: this.encryptAccountDetails(
          params.accountNumber,
          params.bankCode,
        ),
        auth_provider: "paywithaccount",
      },
      transaction: {
        mock_mode: this.config.mockMode ? "live" : "inspect",
        transaction_ref: requestRef,
        transaction_desc: "BVN Verification",
        transaction_ref_parent: null,
        amount: 0,
        customer: {
          customer_ref: requestRef,
          firstname: "",
          surname: "",
          email: "",
          mobile: "",
        },
        meta: {
          a_bank_code: params.bankCode,
          a_account_number: params.accountNumber,
          a_bvn: params.bvn,
        },
        details: null,
      },
    };

    try {
      const response = await this.client.post("/", payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Signature: signature,
        },
      });

      console.log("BVN Verification Response:", response.data);

      // Map OnePipe response to simplified format
      // Note: Adjust mapping based on actual API response structure
      if (response.data.status === "Successful") {
        return {
          bvn_linked: true,
          account_name: response.data.data?.account_name || "Verified Customer",
          raw: response.data,
        };
      }

      return {
        bvn_linked: false,
        raw: response.data,
      };
    } catch (error: any) {
      console.error(
        "BVN Verification Error:",
        error.response?.data || error.message,
      );
      // If mock mode, simulate success if needed, or rethrow
      if (this.config.mockMode) {
        return {
          bvn_linked: true,
          account_name: "Mock User",
          raw: {},
        };
      }

      throw new Error(
        `BVN verification failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create payment mandate (send_invoice)
   * This creates a recurring payment mandate for installments or single payment invoice
   */
  async sendInvoice(params: SendInvoiceParams): Promise<any> {
    const requestRef = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signature = this.generateSignature(requestRef);

    // Default to recurring if not specified, or if installments > 1
    const paymentType =
      params.paymentType ||
      (params.installments > 1 ? "recurring" : "single_payment");
    const isRecurring = paymentType === "recurring";

    const amountPerInstallment = params.amount / (params.installments || 1);
    const startDate = new Date();
    const endDate = new Date();
    if (params.installments && params.installments > 0) {
      endDate.setMonth(endDate.getMonth() + params.installments);
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // Default for single
    }

    let auth = {};
    let meta = {};
    let transactionDetails = {};

    if (!isRecurring) {
      // Single payment configuration matching user sample
      auth = {
        type: null,
        secure: null,
        auth_provider: "PaywithAccount",
      };

      meta = {
        type: "single_payment",
        expires_in: 30, // minutes
        suppress_messaging: false,
        biller_code: "000729",
        order_id: params.orderId,
      };

      transactionDetails = {};
    } else {
      // Recurring payment configuration
      auth = {
        type: "bank.account",
        secure: this.encryptAccountDetails(
          params.accountNumber || "",
          params.bankCode || "",
        ),
        auth_provider: "paywithaccount",
      };

      meta = {
        a_bank_code: params.bankCode,
        a_account_number: params.accountNumber,
        mandate_type: "recurring",
        mandate_frequency: "monthly",
        mandate_duration: params.installments,
        mandate_start_date: startDate.toISOString().split("T")[0],
        mandate_end_date: endDate.toISOString().split("T")[0],
        order_id: params.orderId,
      };

      transactionDetails = {
        description: `BNPL Payment - ${params.installments} installments of ₦${amountPerInstallment.toFixed(2)}`,
        total_amount: params.amount,
        installments: params.installments,
      };
    }

    const payload = {
      request_ref: requestRef,
      request_type: "send invoice",
      auth: auth,
      transaction: {
        mock_mode: this.config.mockMode ? "Live" : "Inspect",
        transaction_ref: requestRef,
        transaction_desc: `Order ${params.orderId}`,
        transaction_ref_parent: null,
        amount: isRecurring ? amountPerInstallment : params.amount,
        customer: {
          customer_ref: params.customerId,
          firstname: params.customerName.split(" ")[0],
          surname: params.customerName.split(" ").slice(1).join(" "),
          email: params.customerEmail,
          mobile_no: params.customerMobile || params.customerId,
        },
        meta: meta,
        details: transactionDetails,
      },
    };

    try {
      const response = await this.client.post("/", payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Signature: signature,
        },
      });

      console.log("Send Invoice Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Send Invoice Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to create mandate/invoice: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Query mandate status
   */
  async getMandateStatus(mandateId: string): Promise<any> {
    const requestRef = `STATUS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signature = this.generateSignature(requestRef);

    const payload = {
      request_ref: requestRef,
      request_type: "get_mandate_status",
      auth: {
        type: null,
        secure: null,
        auth_provider: "paywithaccount",
      },
      transaction: {
        mock_mode: this.config.mockMode ? "live" : "inspect",
        transaction_ref: requestRef,
        meta: {
          mandate_id: mandateId,
        },
      },
    };

    try {
      const response = await this.client.post("/", payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Signature: signature,
        },
      });

      console.log("Mandate Status Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Mandate Status Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to get mandate status: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get list of Nigerian banks
   */
  async getBanks(): Promise<any> {
    const requestRef = `BANKS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signature = this.generateSignature(requestRef);

    const payload = {
      request_ref: requestRef,
      request_type: "get_banks",
      auth: {
        type: null,
        secure: null,
        auth_provider: "paywithaccount",
      },
      transaction: {
        mock_mode: this.config.mockMode ? "live" : "inspect",
        transaction_ref: requestRef,
      },
    };

    try {
      const response = await this.client.post("/", payload, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Signature: signature,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get Banks Error:", error.response?.data || error.message);
      throw new Error(
        `Failed to get banks: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}

export default new OnePipeService();
