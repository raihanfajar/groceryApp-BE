import { Resend } from "resend";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { Transaction, Users } from "../generated/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "FreshNear <no-reply@freshnear.store>";

const getOrderConfirmationTemplate = (
	user: Users,
	transaction: Transaction
): string => {
	const templatePath = path.join(
		__dirname,
		"..",
		"templates",
		"orderConfirmation.html"
	);
	const templateHtml = fs.readFileSync(templatePath, "utf-8");
	const compiledTemplate = Handlebars.compile(templateHtml);
	return compiledTemplate({
		name: user.name,
		orderId: transaction.id,
		totalPrice: transaction.totalPrice.toLocaleString("id-ID"),
		expiryDate: transaction.expiryAt?.toLocaleString("id-ID", {
			dateStyle: "full",
			timeStyle: "short",
		}),
	});
};

const getPaymentConfirmedTemplate = (
	user: Users,
	transaction: Transaction
): string => {
	const templatePath = path.join(
		__dirname,
		"..",
		"templates",
		"paymentConfirmed.html"
	);
	const templateHtml = fs.readFileSync(templatePath, "utf-8");
	const compiledTemplate = Handlebars.compile(templateHtml);
	return compiledTemplate({
		name: user.name,
		orderId: transaction.id,
	});
};

const getOrderShippedTemplate = (
	user: Users,
	transaction: Transaction
): string => {
	const templatePath = path.join(
		__dirname,
		"..",
		"templates",
		"orderShipped.html"
	);
	const templateHtml = fs.readFileSync(templatePath, "utf-8");
	const compiledTemplate = Handlebars.compile(templateHtml);
	return compiledTemplate({
		name: user.name,
		orderId: transaction.id,
	});
};

export const sendOrderConfirmationEmail = async (
	user: Users,
	transaction: Transaction
): Promise<void> => {
	const emailHtml = getOrderConfirmationTemplate(user, transaction);
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: user.email,
			subject: `Order #${transaction.id} Confirmed`,
			html: emailHtml,
		});
	} catch (error) {
		console.error("Gagal mengirim email konfirmasi pesanan:", error);
	}
};

export const sendPaymentConfirmedEmail = async (
	user: Users,
	transaction: Transaction
): Promise<void> => {
	const emailHtml = getPaymentConfirmedTemplate(user, transaction);
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: user.email,
			subject: `Payment for order #${transaction.id} Successful`,
			html: emailHtml,
		});
	} catch (error) {
		console.error("Gagal mengirim email konfirmasi pembayaran:", error);
	}
};

export const sendOrderShippedEmail = async (
	user: Users,
	transaction: Transaction
): Promise<void> => {
	const emailHtml = getOrderShippedTemplate(user, transaction);
	try {
		await resend.emails.send({
			from: FROM_EMAIL,
			to: user.email,
			subject: `Order #${transaction.id} Has Been Shipped`,
			html: emailHtml,
		});
	} catch (error) {
		console.error("Gagal mengirim email pesanan dikirim:", error);
	}
};

