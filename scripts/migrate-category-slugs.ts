import { PrismaClient } from '../src/generated/prisma';
import { generateSlug } from '../src/utils/slug';

// Declare process for Node.js environment (for excluded files)
declare const process: any;

const prisma = new PrismaClient();

async function migrateCategorySlugs() {
	console.log('🔄 Starting category slug migration...');
	console.log(
		'ℹ️  Note: This script is prepared for future use when slug field is added to ProductCategory model'
	);

	try {
		// Get all categories
		const categories = await prisma.productCategory.findMany({
			where: {
				deletedAt: null,
			},
		});

		console.log(`📋 Found ${categories.length} categories to migrate`);

		// Display what the slugs would be (without updating database)
		for (const category of categories) {
			const slug = generateSlug(category.name);
			console.log(`📝 Category "${category.name}" would have slug "${slug}"`);
		}

		console.log('\n⚠️  To actually migrate slugs:');
		console.log('1. Add slug field to ProductCategory model in schema.prisma');
		console.log('2. Run: prisma migrate dev --name add_slug_to_category');
		console.log('3. Uncomment the update logic in this script');
		console.log('\n🎉 Category slug preview completed!');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the migration
migrateCategorySlugs();
