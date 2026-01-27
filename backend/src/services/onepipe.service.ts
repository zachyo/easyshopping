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
  accountNumber: string;
  bankCode: string;
  amount: number;
  installments: number;
  orderId: string;
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
  async verifyBVN(params: BVNVerificationParams): Promise<any> {
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
      return response.data;
    } catch (error: any) {
      console.error(
        "BVN Verification Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `BVN verification failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create payment mandate (send_invoice)
   * This creates a recurring payment mandate for installments
   */
  async sendInvoice(params: SendInvoiceParams): Promise<any> {
    const requestRef = `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const signature = this.generateSignature(requestRef);

    const amountPerInstallment = params.amount / params.installments;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + params.installments);

    const payload = {
      request_ref: requestRef,
      request_type: "send_invoice",
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
        transaction_desc: `Order ${params.orderId} - ${params.installments} month installment`,
        transaction_ref_parent: null,
        amount: amountPerInstallment,
        customer: {
          customer_ref: params.customerId,
          firstname: params.customerName.split(" ")[0],
          surname: params.customerName.split(" ").slice(1).join(" "),
          email: params.customerEmail,
          mobile: "",
        },
        meta: {
          a_bank_code: params.bankCode,
          a_account_number: params.accountNumber,
          mandate_type: "recurring",
          mandate_frequency: "monthly",
          mandate_duration: params.installments,
          mandate_start_date: startDate.toISOString().split("T")[0],
          mandate_end_date: endDate.toISOString().split("T")[0],
          order_id: params.orderId,
        },
        details: {
          description: `BNPL Payment - ${params.installments} installments of ₦${amountPerInstallment.toFixed(2)}`,
          total_amount: params.amount,
          installments: params.installments,
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

      console.log("Send Invoice Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Send Invoice Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Failed to create mandate: ${error.response?.data?.message || error.message}`,
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
