import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/bcrypt";

const prisma = new PrismaClient();

async function main() {
	try {
		console.log("🌱 Starting seed data creation...");

		// Create stores
		let store1 = await prisma.store.findFirst({
			where: { name: "Fresh Market Jakarta" },
		});

		if (!store1) {
			store1 = await prisma.store.create({
				data: {
					name: "Fresh Market Jakarta",
					provinceId: 10,
					province: "DKI JAKARTA",
					cityId: 136,
					city: "JAKARTA SELATAN",
					address: "Jl. Sudirman No. 123",
					lat: -6.2088,
					lng: 106.8456,
					radiusKm: 10.0,
				},
			});
		}

		let store2 = await prisma.store.findFirst({
			where: { name: "Green Grocer Bandung" },
		});

		if (!store2) {
			store2 = await prisma.store.create({
				data: {
					name: "Green Grocer Bandung",
					provinceId: 5,
					province: "Jawa Barat",
					cityId: 55,
					city: "Bandung",
					address: "Jl. Asia Afrika No. 456",
					lat: -6.9175,
					lng: 107.6191,
					radiusKm: 8.0,
				},
			});
		}

		console.log("✅ Stores created");

		// Create super admin
		const superAdminPassword = await hashPassword("superadmin123");
		const superAdmin = await prisma.admin.upsert({
			where: { email: "superadmin@groceryapp.com" },
			update: {},
			create: {
				name: "Super Administrator",
				email: "superadmin@groceryapp.com",
				password: superAdminPassword,
				isSuper: true,
			},
		});

		console.log("✅ Super admin created");

		// Create store admins
		const storeAdmin1Password = await hashPassword("storeadmin123");
		const storeAdmin1 = await prisma.admin.upsert({
			where: { email: "jakarta@groceryapp.com" },
			update: {},
			create: {
				name: "Jakarta Store Manager",
				email: "jakarta@groceryapp.com",
				password: storeAdmin1Password,
				isSuper: false,
				storeId: store1.id,
			},
		});

		const storeAdmin2Password = await hashPassword("storeadmin456");
		const storeAdmin2 = await prisma.admin.upsert({
			where: { email: "bandung@groceryapp.com" },
			update: {},
			create: {
				name: "Bandung Store Manager",
				email: "bandung@groceryapp.com",
				password: storeAdmin2Password,
				isSuper: false,
				storeId: store2.id,
			},
		});

		console.log("✅ Store admins created");

		// Create sample users
		const user1 = await prisma.users.upsert({
			where: { email: "john.doe@example.com" },
			update: {},
			create: {
				name: "John Doe",
				email: "john.doe@example.com",
				phoneNumber: "081234567890",
				password: await hashPassword("userpassword123"),
				isVerified: true,
			},
		});

		const user2 = await prisma.users.upsert({
			where: { email: "jane.smith@example.com" },
			update: {},
			create: {
				name: "Jane Smith",
				email: "jane.smith@example.com",
				phoneNumber: "081987654321",
				password: await hashPassword("userpassword456"),
				isVerified: true,
			},
		});

		console.log("✅ Sample users created");

		// Create user addresses
		const existingAddress1 = await prisma.userAddress.findFirst({
			where: { userId: user1.id },
		});

		if (!existingAddress1) {
			await prisma.userAddress.create({
				data: {
					userId: user1.id,
					phoneNumber: "081234567890",
					provinceId: 10,
					province: "DKI JAKARTA",
					cityId: 136,
					city: "JAKARTA SELATAN",
					address: "Jl. Kemang Raya No. 45",
					lat: -6.2615,
					lng: 106.8106,
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
					phoneNumber: "081987654321",
					provinceId: 5,
					province: "Jawa Barat",
					cityId: 55,
					city: "Bandung",
					address: "Jl. Dago No. 78",
					lat: -6.8951,
					lng: 107.6089,
					isDefault: true,
				},
			});
		}

		console.log("✅ User addresses created");

		// Create product categories
		const categories = [
			{
				name: "Fresh Fruits",
				description: "Fresh and seasonal fruits from local farms",
			},
			{
				name: "Vegetables",
				description: "Fresh vegetables and leafy greens",
			},
			{
				name: "Dairy & Eggs",
				description: "Milk, cheese, yogurt, and fresh eggs",
			},
			{
				name: "Meat & Seafood",
				description: "Fresh meat, poultry, and seafood",
			},
			{
				name: "Beverages",
				description: "Juices, soft drinks, and healthy beverages",
			},
			{
				name: "Snacks",
				description: "Healthy snacks and treats",
			},
		];

		const createdCategories: any[] = [];
		for (const category of categories) {
			const existingCategory = await prisma.productCategory.findFirst({
				where: { name: category.name },
			});

			if (!existingCategory) {
				const newCategory = await prisma.productCategory.create({
					data: category,
				});
				createdCategories.push(newCategory);
			} else {
				createdCategories.push(existingCategory);
			}
		}

		console.log("✅ Product categories created");

		// Create sample products
		const products = [
			{
				name: "Fresh Apples",
				description: "Sweet and crispy red apples, perfect for snacking",
				categoryId: createdCategories.find((c) => c.name === "Fresh Fruits")!
					.id,
				price: 25000,
				weight: 1000,
				picture1:
					"https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=500",
			},
			{
				name: "Organic Bananas",
				description: "Ripe organic bananas, rich in potassium",
				categoryId: createdCategories.find((c) => c.name === "Fresh Fruits")!
					.id,
				price: 15000,
				weight: 1000,
				picture1:
					"https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500",
			},
			{
				name: "Fresh Carrots",
				description: "Crunchy orange carrots, perfect for cooking",
				categoryId: createdCategories.find((c) => c.name === "Vegetables")!.id,
				price: 12000,
				weight: 500,
				picture1:
					"https://images.unsplash.com/photo-1445282768818-728615cc910a?w=500",
			},
			{
				name: "Spinach Leaves",
				description: "Fresh green spinach leaves, rich in iron",
				categoryId: createdCategories.find((c) => c.name === "Vegetables")!.id,
				price: 8000,
				weight: 250,
				picture1:
					"https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500",
			},
			{
				name: "Fresh Milk",
				description: "Pure whole milk from local dairy farms",
				categoryId: createdCategories.find((c) => c.name === "Dairy & Eggs")!
					.id,
				price: 18000,
				weight: 1000,
				picture1:
					"https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500",
			},
			{
				name: "Free Range Eggs",
				description: "Fresh eggs from free-range chickens",
				categoryId: createdCategories.find((c) => c.name === "Dairy & Eggs")!
					.id,
				price: 35000,
				weight: 600,
				picture1:
					"https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=500",
			},
			{
				name: "Chicken Breast",
				description: "Fresh boneless chicken breast",
				categoryId: createdCategories.find((c) => c.name === "Meat & Seafood")!
					.id,
				price: 45000,
				weight: 500,
				picture1:
					"https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500",
			},
			{
				name: "Orange Juice",
				description: "Fresh squeezed orange juice, no added sugar",
				categoryId: createdCategories.find((c) => c.name === "Beverages")!.id,
				price: 22000,
				weight: 1000,
				picture1:
					"https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500",
			},
		];

		const createdProducts: any[] = [];
		for (const product of products) {
			const slug = product.name
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();

			const existingProduct = await prisma.product.findFirst({
				where: { name: product.name },
			});

			if (!existingProduct) {
				const newProduct = await prisma.product.create({
					data: {
						...product,
						slug,
					},
				});
				createdProducts.push(newProduct);
			} else {
				createdProducts.push(existingProduct);
			}
		}

		console.log("✅ Sample products created");

		// Create store stock for products
		// For Jakarta store - all products
		for (const product of createdProducts) {
			const existingStock = await prisma.storeProduct.findFirst({
				where: {
					productId: product.id,
				},
			});

			if (!existingStock) {
				await prisma.storeProduct.create({
					data: {
						productId: product.id,
						storeId: store1.id,
						stock: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
					},
				});
			}
		}

		// Create additional products specifically for Bandung store
		const bandungProducts = [
			{
				name: "Fresh Mangoes (Bandung)",
				description: "Sweet tropical mangoes from West Java",
				categoryId: createdCategories.find((c) => c.name === "Fresh Fruits")!
					.id,
				price: 35000,
				weight: 1000,
				picture1:
					"https://images.unsplash.com/photo-1553279768-865429fa0078?w=500",
			},
			{
				name: "Local Tomatoes (Bandung)",
				description: "Fresh red tomatoes from highland farms",
				categoryId: createdCategories.find((c) => c.name === "Vegetables")!.id,
				price: 14000,
				weight: 500,
				picture1:
					"https://images.unsplash.com/photo-1546470427-e4ff4b17b454?w=500",
			},
		];

		for (const product of bandungProducts) {
			const slug = product.name
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.replace(/-+/g, "-")
				.trim();

			const existingProduct = await prisma.product.findFirst({
				where: { name: product.name },
			});

			if (!existingProduct) {
				const newProduct = await prisma.product.create({
					data: {
						...product,
						slug,
					},
				});

				// Add stock for this product in Bandung store
				await prisma.storeProduct.create({
					data: {
						productId: newProduct.id,
						storeId: store2.id,
						stock: Math.floor(Math.random() * 40) + 15,
					},
				});
			}
		}

		console.log("✅ Product stock created");

		console.log("\n🎉 Seed data created successfully!");
		console.log("\n📋 Test Credentials:");
		console.log("Super Admin:");
		console.log("  Email: superadmin@groceryapp.com");
		console.log("  Password: superadmin123");
		console.log("\nStore Admin (Jakarta):");
		console.log("  Email: jakarta@groceryapp.com");
		console.log("  Password: storeadmin123");
		console.log("\nStore Admin (Bandung):");
		console.log("  Email: bandung@groceryapp.com");
		console.log("  Password: storeadmin456");
	} catch (error) {
		console.error("❌ Error creating seed data:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
