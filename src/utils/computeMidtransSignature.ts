import crypto from "crypto";

export function computeMidtransSignature({
	orderId,
	statusCode,
	grossAmount,
	serverKey,
}: {
	orderId: string;
	statusCode: string;
	grossAmount: string;
	serverKey: string;
}) {
	const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
	return crypto.createHash("sha512").update(payload).digest("hex");
}
