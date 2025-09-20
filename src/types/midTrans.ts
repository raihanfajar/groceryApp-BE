// --- Tipe untuk status transaksi dari Midtrans ---
export type MidtransTransactionStatus =
  | "authorize"
  | "capture"
  | "settlement"
  | "deny"
  | "pending"
  | "cancel"
  | "expire"
  | "failure"
  | "refund"
  | "partial_refund"
  | "chargeback"
  | "partial_chargeback";

// --- Tipe untuk status fraud dari Midtrans ---
export type MidtransFraudStatus = "accept" | "challenge" | "deny";

// --- Interface utama untuk payload notifikasi dari Midtrans ---
export interface MidtransNotificationPayload {
  transaction_time: string;
  transaction_status: MidtransTransactionStatus;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: MidtransFraudStatus;

  // Untuk properti dinamis lain (misal: bca_va_number, dll.)
  [key: string]: unknown;
}

export interface MidtransStatusResponse {
  order_id: string;
  transaction_status: MidtransTransactionStatus | string;
  fraud_status?: MidtransFraudStatus | string;
  gross_amount: string;
  transaction_id?: string;
  status_message?: string;
  status_code?: string;
  [key: string]: unknown;
}

export interface MidtransCoreApi {
  transaction: {
    notification(payload: unknown): Promise<MidtransStatusResponse>;
    // tambahkan method lain bila perlu
  };
}
