import { PrismaClient } from '@prisma/client';
import {
  USERS,
  USER_PREFERENCES,
  PRODUCTS,
  ORDERS,
  ORDER_ITEMS,
} from './mock.js';

const prisma = new PrismaClient();

async function main() {
  // 기존 데이터 삭제
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();

  // 목 데이터 삽입
  await prisma.product.createMany({
    data: PRODUCTS,
    skipDuplicates: true,// 유니크한 필드가 중복되는 데이터들은 스킵
  });

  await Promise.all(
    USERS.map(async (user) => {
      await prisma.user.create({ data: user });
    })
  );

  await prisma.userPreference.createMany({
    data: USER_PREFERENCES,
    skipDuplicates: true,
  });
  
  await prisma.order.createMany({
    data: ORDERS,
    skipDuplicates: true,
  });
  
  await prisma.orderItem.createMany({
    data: ORDER_ITEMS,
    skipDuplicates: true,
  });
}

main()//main함수를 안전하게 실행하는 코드-> 코드가 실행 된 후 데이터베이스와의 연결을 종료
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
