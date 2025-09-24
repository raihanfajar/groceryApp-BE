import { prisma } from '../src/lib/prisma';

async function checkDeletedCategories() {
	console.log('🔍 Checking for soft-deleted categories...\n');

	// Find all soft-deleted categories
	const deletedCategories = await prisma.productCategory.findMany({
		where: {
			deletedAt: {
				not: null,
			},
		},
		include: {
			_count: {
				select: {
					products: {
						where: {
							deletedAt: null, // Active products
						},
					},
				},
			},
		},
	});

	console.log(`Found ${deletedCategories.length} soft-deleted categories:`);

	if (deletedCategories.length === 0) {
		console.log('✅ No soft-deleted categories found.');
		return;
	}

	console.log('\n📋 Deleted Categories Details:');
	console.log('----------------------------------------');

	for (const category of deletedCategories) {
		console.log(`📦 ${category.name} (ID: ${category.id})`);
		console.log(`   - Deleted At: ${category.deletedAt}`);
		console.log(`   - Active Products: ${category._count.products}`);
		console.log(`   - Status: ${category.isActive ? 'Active' : 'Inactive'}`);
		console.log('');
	}

	// Categories that can be safely hard-deleted (no active products)
	const safeDeletions = deletedCategories.filter(
		(cat) => cat._count.products === 0
	);
	const unsafeDeletions = deletedCategories.filter(
		(cat) => cat._count.products > 0
	);

	console.log(
		`✅ Safe to permanently delete: ${safeDeletions.length} categories`
	);
	console.log(
		`⚠️  Cannot delete (has products): ${unsafeDeletions.length} categories`
	);

	if (unsafeDeletions.length > 0) {
		console.log('\n⚠️  Categories with active products:');
		unsafeDeletions.forEach((cat) => {
			console.log(`   - ${cat.name}: ${cat._count.products} products`);
		});
	}
}

async function cleanupDeletedCategories(confirmDelete = false) {
	console.log('\n🧹 Starting cleanup of deleted categories...\n');

	if (!confirmDelete) {
		console.log('❌ This is a DRY RUN. No categories will be deleted.');
		console.log('   To actually delete, run with confirmDelete = true\n');
	}

	// Find categories safe to delete
	const categoriesToDelete = await prisma.productCategory.findMany({
		where: {
			deletedAt: {
				not: null,
			},
		},
		include: {
			_count: {
				select: {
					products: {
						where: {
							deletedAt: null,
						},
					},
				},
			},
		},
	});

	const safeToDelete = categoriesToDelete.filter(
		(cat) => cat._count.products === 0
	);
	const unsafeToDelete = categoriesToDelete.filter(
		(cat) => cat._count.products > 0
	);

	console.log(`Categories safe to permanently delete: ${safeToDelete.length}`);
	console.log(
		`Categories with products (cannot delete): ${unsafeToDelete.length}\n`
	);

	if (safeToDelete.length === 0) {
		console.log('✅ No categories to cleanup.');
		return;
	}

	if (confirmDelete) {
		console.log('🗑️  Permanently deleting categories...');

		for (const category of safeToDelete) {
			try {
				await prisma.productCategory.delete({
					where: { id: category.id },
				});
				console.log(`   ✅ Deleted: ${category.name}`);
			} catch (error) {
				console.log(`   ❌ Failed to delete ${category.name}: ${error}`);
			}
		}

		console.log(
			`\n✅ Cleanup complete! Deleted ${safeToDelete.length} categories.`
		);
	} else {
		console.log('📋 Would delete these categories:');
		safeToDelete.forEach((cat) => {
			console.log(`   - ${cat.name} (deleted on ${cat.deletedAt})`);
		});
	}

	if (unsafeToDelete.length > 0) {
		console.log(
			'\n⚠️  These categories cannot be deleted (have active products):'
		);
		unsafeToDelete.forEach((cat) => {
			console.log(`   - ${cat.name}: ${cat._count.products} products`);
		});
	}
}

async function main() {
	try {
		await checkDeletedCategories();
		await cleanupDeletedCategories(false); // Set to false for dry run

		console.log('\n🎉 Analysis complete!');
		console.log(
			'\nTo permanently delete the safe categories, change confirmDelete to true in the script.'
		);
	} catch (error) {
		console.error('❌ Error during cleanup:', error);
	} finally {
		await prisma.$disconnect();
	}
}

main();
