import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting seed data creation...');

    // Create stores
    const store1 = await prisma.store.create({
      data: {
        name: 'Fresh Market Jakarta',
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        address: 'Jl. Sudirman No. 123',
        lat: -6.2088,
        lng: 106.8456,
        radiusKm: 10.0
      }
    });

    const store2 = await prisma.store.create({
      data: {
        name: 'Green Grocer Bandung',
        province: 'Jawa Barat',
        city: 'Bandung',
        address: 'Jl. Asia Afrika No. 456',
        lat: -6.9175,
        lng: 107.6191,
        radiusKm: 8.0
      }
    });

    console.log('✅ Stores created');

    // Create super admin
    const superAdminPassword = await hashPassword('superadmin123');
    const superAdmin = await prisma.admin.create({
      data: {
        name: 'Super Administrator',
        email: 'superadmin@groceryapp.com',
        password: superAdminPassword,
        isSuper: true
      }
    });

    console.log('✅ Super admin created');

    // Create store admins
    const storeAdmin1Password = await hashPassword('storeadmin123');
    const storeAdmin1 = await prisma.admin.create({
      data: {
        name: 'Jakarta Store Manager',
        email: 'jakarta@groceryapp.com',
        password: storeAdmin1Password,
        isSuper: false,
        storeId: store1.id
      }
    });

    const storeAdmin2Password = await hashPassword('storeadmin456');
    const storeAdmin2 = await prisma.admin.create({
      data: {
        name: 'Bandung Store Manager',
        email: 'bandung@groceryapp.com',
        password: storeAdmin2Password,
        isSuper: false,
        storeId: store2.id
      }
    });

    console.log('✅ Store admins created');

    // Create sample users
    const user1 = await prisma.users.create({
      data: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phoneNumber: '081234567890',
        profilePicture: 'https://example.com/default-avatar.jpg',
        password: await hashPassword('userpassword123'),
        isVerified: true,
        refferalCode: 'JOHN123'
      }
    });

    const user2 = await prisma.users.create({
      data: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '081987654321',
        profilePicture: 'https://example.com/default-avatar.jpg',
        password: await hashPassword('userpassword456'),
        isVerified: true,
        refferalCode: 'JANE456'
      }
    });

    console.log('✅ Sample users created');

    // Create user addresses
    await prisma.userAddress.create({
      data: {
        userId: user1.id,
        phoneNumber: 81234567890,
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        address: 'Jl. Kemang Raya No. 45',
        lat: -6.2615,
        lng: 106.8106,
        isDefault: true
      }
    });

    await prisma.userAddress.create({
      data: {
        userId: user2.id,
        phoneNumber: 81987654321,
        province: 'Jawa Barat',
        city: 'Bandung',
        address: 'Jl. Dago No. 78',
        lat: -6.8951,
        lng: 107.6089,
        isDefault: true
      }
    });

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
