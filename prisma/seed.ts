import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

// Declare process for Node.js environment (for excluded files)
declare const process: any;

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
	return await bcrypt.hash(password, 10);
}

async function main() {
	try {
		console.log('🌱 Starting seed data creation...');

		// Create stores
		let store1 = await prisma.store.findFirst({
			where: { name: 'Fresh Market Jakarta' },
		});

		if (!store1) {
			store1 = await prisma.store.create({
				data: {
					name: 'Fresh Market Jakarta',
					provinceId: 10,
					province: 'DKI JAKARTA',
					cityId: 136,
					city: 'JAKARTA SELATAN',
					district: 'Kebayoran Baru',
					districtId: 1361,
					address: 'Jl. Sudirman No. 123',
					lat: -6.2088,
					lng: 106.8456,
					radiusKm: 10.0,
				},
			});
		}

		let store2 = await prisma.store.findFirst({
			where: { name: 'Green Grocer Bandung' },
		});

		if (!store2) {
			store2 = await prisma.store.create({
				data: {
					name: 'Green Grocer Bandung',
					provinceId: 5,
					province: 'Jawa Barat',
					cityId: 55,
					city: 'Bandung',
					district: 'Dago',
					districtId: 551,
					address: 'Jl. Asia Afrika No. 456',
					lat: -6.9175,
					lng: 107.6191,
					radiusKm: 8.0,
				},
			});
		}

		console.log('✅ Stores created');

		// Create super admin
		const superAdminPassword = await hashPassword('superadmin123');
		const superAdmin = await prisma.admin.upsert({
			where: { email: 'superadmin@groceryapp.com' },
			update: {},
			create: {
				name: 'Super Administrator',
				email: 'superadmin@groceryapp.com',
				password: superAdminPassword,
				isSuper: true,
			},
		});

		console.log('✅ Super admin created');

		// Create store admins
		const storeAdmin1Password = await hashPassword('storeadmin123');
		const storeAdmin1 = await prisma.admin.upsert({
			where: { email: 'jakarta@groceryapp.com' },
			update: {
				// Ensure store assignment if it's missing
				storeId: store1.id,
			},
			create: {
				name: 'Jakarta Store Manager',
				email: 'jakarta@groceryapp.com',
				password: storeAdmin1Password,
				isSuper: false,
				storeId: store1.id,
			},
		});

		const storeAdmin2Password = await hashPassword('storeadmin456');
		const storeAdmin2 = await prisma.admin.upsert({
			where: { email: 'bandung@groceryapp.com' },
			update: {
				// Ensure store assignment if it's missing
				storeId: store2.id,
			},
			create: {
				name: 'Bandung Store Manager',
				email: 'bandung@groceryapp.com',
				password: storeAdmin2Password,
				isSuper: false,
				storeId: store2.id,
			},
		});

		console.log('✅ Store admins created');

		// Create sample users
		const user1 = await prisma.users.upsert({
			where: { email: 'john.doe@example.com' },
			update: {},
			create: {
				name: 'John Doe',
				email: 'john.doe@example.com',
				phoneNumber: '081234567890',
				password: await hashPassword('userpassword123'),
				isVerified: true,
			},
		});

		const user2 = await prisma.users.upsert({
			where: { email: 'jane.smith@example.com' },
			update: {},
			create: {
				name: 'Jane Smith',
				email: 'jane.smith@example.com',
				phoneNumber: '081987654321',
				password: await hashPassword('userpassword456'),
				isVerified: true,
			},
		});

		console.log('✅ Sample users created');

		// Create user addresses
		const existingAddress1 = await prisma.userAddress.findFirst({
			where: { userId: user1.id },
		});

		if (!existingAddress1) {
			await prisma.userAddress.create({
				data: {
					userId: user1.id,
					addressLabel: 'Home',
					receiverName: 'John Doe',
					receiverPhoneNumber: '081234567890',
					addressDisplayName: 'Jakarta Selatan',
					addressDetails: 'Jl. Kemang Raya No. 45',
					lat: -6.2615,
					lon: 106.8106,
					provinceId: 10,
					province: 'DKI JAKARTA',
					cityId: 136,
					city: 'JAKARTA SELATAN',
					district: 'Kemang',
					districtId: 1362,
					isDefault: true,
				},
			});
		}

		const existingAddress2 = await prisma.userAddress.findFirst({
			where: { userId: user2.id },
		});

		if (!existingAddress2) {
			await prisma.userAddress.create({
				data: {
					userId: user2.id,
					addressLabel: 'Home',
					receiverName: 'Jane Smith',
					receiverPhoneNumber: '081987654321',
					addressDisplayName: 'Bandung',
					addressDetails: 'Jl. Dago No. 78',
					lat: -6.8951,
					lon: 107.6089,
					provinceId: 5,
					province: 'Jawa Barat',
					cityId: 55,
					city: 'Bandung',
					district: 'Dago',
					districtId: 552,
					isDefault: true,
				},
			});
		}

		console.log('✅ User addresses created');

		console.log('\n🎉 Seed data created successfully!');
		console.log('\n📋 Test Credentials:');
		console.log('Super Admin:');
		console.log('  Email: superadmin@groceryapp.com');
		console.log('  Password: superadmin123');
		console.log('\nStore Admin (Jakarta):');
		console.log('  Email: jakarta@groceryapp.com');
		console.log('  Password: storeadmin123');
		console.log('\nStore Admin (Bandung):');
		console.log('  Email: bandung@groceryapp.com');
		console.log('  Password: storeadmin456');
		console.log('\n📝 Note: Categories and products removed from seed.');
		console.log('   Add them manually via the admin interface.');
	} catch (error) {
		console.error('❌ Error creating seed data:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
