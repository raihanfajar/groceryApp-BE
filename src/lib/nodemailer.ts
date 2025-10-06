import nodemailer from "nodemailer";
import fs from "fs";
import Handlebars from "handlebars";

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

export const getVerifyUserEmailTemplate = (
	name: string,
	verifyUserEmailToken: string
) => {
	const templateHtml = fs.readFileSync(
		"src/templates/verifyUserEmail.html",
		"utf-8"
	);
	const compiledTemplateHtml = Handlebars.compile(templateHtml);
	const resultTemplateHtml = compiledTemplateHtml({
		name,
		linkUrl: `${process.env.NODE_ENV === 'production' 
			? 'https://freshnear.store/verify-email'
			: 'http://localhost:3000/verify-email'}/${verifyUserEmailToken}`,
	});

	return resultTemplateHtml;
};

export const getTemplateUser = (
	name: string,
	resetUserPasswordToken: string
) => {
	const templateHtml = fs.readFileSync(
		`src/templates/resetPassword.html`,
		"utf-8"
	);
	const compiledTemplateHtml = Handlebars.compile(templateHtml);
	const resultTemplateHtml = compiledTemplateHtml({
		name,
		linkUrl: `${process.env.NODE_ENV === 'production'
			? 'https://freshnear.store/reset-password'
			: 'http://localhost:3000/reset-password'}/${resetUserPasswordToken}`,
	});

	return resultTemplateHtml;
};

export const getTemplateOrganizer = (
	resetToken: string,
	templateFileName: string,
	userName: string
) => {
	const templateHtml = fs.readFileSync(
		`src/templates/${templateFileName}.html`,
		"utf-8"
	);
	const compiledTemplateHtml = Handlebars.compile(templateHtml);
	const resultTemplateHtml = compiledTemplateHtml({
		name: userName,
		linkUrl: `${process.env.NODE_ENV === 'production'
			? 'https://freshnear.store/organizer/reset-password'
			: 'http://localhost:3000/organizer/reset-password'}/${resetToken}`,
	});

	return resultTemplateHtml;
};

export const getTemplateTxNotification = (
	isApproved: boolean,
	name: string,
	transactionId: string,
	eventName: string,
	amount: number,
	createdAt: string
) => {
	const templateHtml = fs.readFileSync(
		`src/templates/txNotificationTemplate.html`,
		"utf-8"
	);
	const compiledTemplateHtml = Handlebars.compile(templateHtml);
	const resultTemplateHtml = compiledTemplateHtml({
		isApproved,
		name,
		transactionId,
		eventName,
		amount,
		createdAt,
	});

	return resultTemplateHtml;
};

