import nodemailer from "nodemailer";
import fs from "fs";
import Handlebars from "handlebars";
import { Transaction, Users } from "../generated/prisma";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.GOOGLE_APP_USER,
		pass: process.env.GOOGLE_APP_PASSWORD,
	},
	tls: {
		rejectUnauthorized: false,
	},
});

const getOrderConfirmationTemplate = (
	user: Users,
	transaction: Transaction
) => {
	const templateHtml = fs.readFileSync(
		"src/templates/orderConfirmation.html",
		"utf-8"
	);
	const compiledTemplate = Handlebars.compile(templateHtml);
	const resultHtml = compiledTemplate({
		name: user.name,
		orderId: transaction.id,
		totalPrice: transaction.totalPrice.toLocaleString("id-ID"),
		expiryDate: transaction.expiryAt?.toLocaleString("id-ID", {
			dateStyle: "full",
			timeStyle: "short",
		}),
		linkUrl: `${process.env.FRONTEND_TRANSACTION_URL}/${transaction.id}`,
	});
	return resultHtml;
};

export const sendOrderConfirmationEmail = async (
	user: Users,
	transaction: Transaction
) => {
	const emailHtml = getOrderConfirmationTemplate(user, transaction);
	await transporter.sendMail({
		from: "FreshNear <no-reply@freshnear.com>",
		to: user.email,
		subject: `Pesanan #${transaction.id} Dikonfirmasi`,
		html: emailHtml,
	});
};

const getPaymentConfirmedTemplate = (user: Users, transaction: Transaction) => {
	const templateHtml = fs.readFileSync(
		"src/templates/paymentConfirmed.html",
		"utf-8"
	);
	const compiledTemplate = Handlebars.compile(templateHtml);
	const resultHtml = compiledTemplate({
		name: user.name,
		orderId: transaction.id,
		linkUrl: `${process.env.FRONTEND_TRANSACTION_URL}/${transaction.id}`,
	});
	return resultHtml;
};

export const sendPaymentConfirmedEmail = async (
	user: Users,
	transaction: Transaction
) => {
	const emailHtml = getPaymentConfirmedTemplate(user, transaction);
	await transporter.sendMail({
		from: "FreshNear <no-reply@freshnear.com>",
		to: user.email,
		subject: `Pembayaran untuk Pesanan #${transaction.id} Berhasil`,
		html: emailHtml,
	});
};

const getOrderShippedTemplate = (user: Users, transaction: Transaction) => {
	const templateHtml = fs.readFileSync(
		"src/templates/orderShipped.html",
		"utf-8"
	);
	const compiledTemplate = Handlebars.compile(templateHtml);
	const resultHtml = compiledTemplate({
		name: user.name,
		orderId: transaction.id,
		linkUrl: `${process.env.FRONTEND_TRANSACTION_URL}/${transaction.id}`,
	});
	return resultHtml;
};

export const sendOrderShippedEmail = async (
	user: Users,
	transaction: Transaction
) => {
	const emailHtml = getOrderShippedTemplate(user, transaction);
	await transporter.sendMail({
		from: "FreshNear <no-reply@freshnear.com>",
		to: user.email,
		subject: `Pesanan #${transaction.id} Telah Dikirim`,
		html: emailHtml,
	});
	console.log(`[Mailer] Order shipped confirmation sent to ${user.email}`);
};
