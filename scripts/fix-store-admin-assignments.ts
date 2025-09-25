/**
 * Data migration script to fix store admin assignments
 * This script will ensure all non-super admin users have a storeId assigned
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function fixStoreAdminAssignments() {
	try {
		console.log(
			'🔍 Checking for store admin users without store assignments...'
		);

		// Find all store admins (non-super admins) without a storeId
		const unassignedStoreAdmins = await prisma.admin.findMany({
			where: {
				isSuper: false,
				storeId: null,
			},
		});

		if (unassignedStoreAdmins.length === 0) {
			console.log('✅ All store admins are properly assigned to stores');
			return;
		}

		console.log(
			`⚠️  Found ${unassignedStoreAdmins.length} store admin(s) without store assignments:`
		);
		unassignedStoreAdmins.forEach((admin) => {
			console.log(`   - ${admin.name} (${admin.email})`);
		});

		// Get all available stores
		const stores = await prisma.store.findMany({
			where: {
				deletedAt: null,
			},
			orderBy: {
				createdAt: 'asc',
			},
		});

		if (stores.length === 0) {
			console.log('❌ No stores found! Cannot assign admins to stores.');
			return;
		}

		console.log(`📍 Available stores:`);
		stores.forEach((store) => {
			console.log(`   - ${store.name} (${store.city})`);
		});

		// Strategy for assignment:
		// 1. Try to match admin email with store location (e.g., jakarta@... -> Jakarta store)
		// 2. For unmatched admins, assign to stores that don't have an admin yet
		// 3. If all stores have admins, assign round-robin style

		const assignments: { adminId: string; storeId: string; reason: string }[] =
			[];

		for (const admin of unassignedStoreAdmins) {
			let assignedStore: (typeof stores)[0] | null = null;
			let assignmentReason = '';

			// Strategy 1: Match by email pattern
			const emailPrefix = admin.email.split('@')[0].toLowerCase();

			// Look for city names in email
			const cityMatches = stores.filter(
				(store) =>
					emailPrefix.includes(store.city.toLowerCase()) ||
					emailPrefix.includes(store.name.toLowerCase().split(' ')[0])
			);

			if (cityMatches.length > 0) {
				assignedStore = cityMatches[0];
				assignmentReason = `Email pattern match (${emailPrefix} -> ${assignedStore.city})`;
			} else {
				// Strategy 2: Find stores without admins
				const storesWithoutAdmins = [];
				for (const store of stores) {
					const existingAdmin = await prisma.admin.findFirst({
						where: {
							storeId: store.id,
							isSuper: false,
							deletedAt: null,
						},
					});
					if (!existingAdmin) {
						storesWithoutAdmins.push(store);
					}
				}

				if (storesWithoutAdmins.length > 0) {
					assignedStore = storesWithoutAdmins[0];
					assignmentReason = `Assigned to store without admin`;
				} else {
					// Strategy 3: Round-robin assignment
					const assignmentIndex = assignments.length % stores.length;
					assignedStore = stores[assignmentIndex];
					assignmentReason = `Round-robin assignment`;
				}
			}

			if (assignedStore) {
				assignments.push({
					adminId: admin.id,
					storeId: assignedStore.id,
					reason: assignmentReason,
				});

				console.log(
					`📌 Will assign ${admin.name} to ${assignedStore.name} (${assignmentReason})`
				);
			}
		}

		// Confirm assignments
		console.log(
			'\n❓ Proceed with these assignments? (This will update the database)'
		);
		console.log(
			'   If running in production, please review these assignments carefully.'
		);

		// In a real migration, you might want to add a confirmation prompt
		// For now, we'll proceed automatically in development

		console.log('\n🔄 Applying store admin assignments...');

		let successCount = 0;
		for (const assignment of assignments) {
			try {
				await prisma.admin.update({
					where: { id: assignment.adminId },
					data: { storeId: assignment.storeId },
				});
				successCount++;
			} catch (error) {
				console.error(
					`❌ Failed to assign admin ${assignment.adminId}:`,
					error
				);
			}
		}

		console.log(
			`✅ Successfully assigned ${successCount}/${assignments.length} store admins`
		);

		// Verify all assignments
		const remainingUnassigned = await prisma.admin.findMany({
			where: {
				isSuper: false,
				storeId: null,
			},
		});

		if (remainingUnassigned.length === 0) {
			console.log('🎉 All store admins now have store assignments!');
		} else {
			console.log(
				`⚠️  ${remainingUnassigned.length} store admin(s) still unassigned`
			);
		}
	} catch (error) {
		console.error('❌ Error fixing store admin assignments:', error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Check if script is being run directly
if (require.main === module) {
	fixStoreAdminAssignments().catch((error) => {
		console.error('Migration failed:', error);
		process.exit(1);
	});
}

export { fixStoreAdminAssignments };
