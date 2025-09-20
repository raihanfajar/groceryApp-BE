import midtransClient from "midtrans-client";

// Inisialisasi Snap API
export const snap = new midtransClient.Snap({
    isProduction: false, // Set 'true' jika sudah live
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.MIDTRANS_CLIENT_KEY!
});

// Objek untuk interaksi server-to-server (back-end)
export const coreApi = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.MIDTRANS_CLIENT_KEY!
});