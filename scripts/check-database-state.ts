/**
 * Quick database check script
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function checkDatabaseState() {
	try {
		console.log('🔍 Checking database state...');

		// Check stores
		const stores = await prisma.store.findMany({
			select: {
				id: true,
				name: true,
				city: true,
				deletedAt: true,
			},
		});

		console.log(`📍 Total stores: ${stores.length}`);
		stores.forEach((store) => {
			console.log(
				`   - ${store.name} (${store.city}) - Deleted: ${store.deletedAt ? 'Yes' : 'No'}`
			);
		});

		// Check admins
		const admins = await prisma.admin.findMany({
			select: {
				id: true,
				name: true,
				email: true,
				isSuper: true,
				storeId: true,
				deletedAt: true,
			},
		});

		console.log(`\n👤 Total admins: ${admins.length}`);
		admins.forEach((admin) => {
			console.log(`   - ${admin.name} (${admin.email})`);
			console.log(
				`     Super: ${admin.isSuper}, StoreId: ${admin.storeId || 'NULL'}, Deleted: ${admin.deletedAt ? 'Yes' : 'No'}`
			);
		});

		// Check unassigned store admins
		const unassignedStoreAdmins = await prisma.admin.findMany({
			where: {
				isSuper: false,
				storeId: null,
				deletedAt: null,
			},
		});

		console.log(
			`\n⚠️  Unassigned store admins: ${unassignedStoreAdmins.length}`
		);
		unassignedStoreAdmins.forEach((admin) => {
			console.log(`   - ${admin.name} (${admin.email})`);
		});
	} catch (error) {
		console.error('❌ Error checking database:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

checkDatabaseState().catch((error) => {
	console.error('Check failed:', error);
	process.exit(1);
});
