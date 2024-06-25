import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';//client를 불러오는 코드 
import { assert } from 'superstruct';
import { 
  CreateUser,
  PatchUser,
  CreateProduct,
  PatchProduct,
  CreateOrder,
  PatchOrder,
  PostSavedProduct,
} from './struct.js';
import cors from 'cors';


const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors())


function asyncHandler(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (e) {
      if (
        e.name === 'StructError'||
        e instanceof Prisma.PrismaClientValidationError//프리즈마 자체에서 발생한 오류
      ) {//유효성 검사 오류 
        res.status(400).send({ message: e.message });
      } else if (e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code==='P2025'
      ) { //요청한 리소스를 찾을 수 없는 경우 
        res.sendStatus(404);
      } else {
        res.status(500).send({ message: e.message });
      }
    }
  };
}

/*********** users ***********/

app.get('/users', asyncHandler(async (req, res) => {
    const {offset =0, limit=10, order ='newest'}=req.query;//디폴트 값을 할당
    let orderBy;
    switch (order) {
      case 'oldest':
        orderBy={createdAt:'asc'};
        break;
      case 'newest':
      default:
        orderBy={createdAt:'desc'}
        
    }
    
    const users = await prisma.user.findMany({
      //orderBy: {createdAt:'asc'},//오름차순 정렬 
      orderBy,
      skip: parseInt(offset), //skip 프로퍼티로 설정, 숫자로 할당
      take: parseInt(limit), // take 프로퍼티로 설정, 숫자로 할당 
      include:{
        userPreference: {
          select:{//select는 include 안이 아니더라도 조회할 필드를 선택하는 데 사용된다
            receiveEmail: true, //관계필드 조회 
        },
        },
      },
    
}); //어떤 모델과 상호작용하려면 prisma.모델이름
    ////모델이름은 schema.prisma 파일에 정의된 모델의 이름을 참조
    res.send(users);
}));

app.get('/users/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUniqueOrThrow({//고유필드로 데이터하나를 찾을 때 findUnique 사용
        where: { id },//where로 결과를 필터
        include:{
          userPreference: true, 
        },
    });//id에 해당하는 유저 조회
    res.send(user);
}));

app.post('/users', asyncHandler(async (req, res) => {
  assert(req.body,CreateUser); // 확인하고자하는 데이터 객체와 수퍼스트럭트 객체를 전달하면 된다 (유효성 검사)
  // 리퀘스트 바디 내용으로 유저 생성-> create 메소드 사용
  const{userPreference, ...userFiedls}=req.body;
  const user = await prisma.user.create({
    data:{
      ...userFiedls,
      userPreference:{
        create:userPreference,//관련된 객체는 create 프로퍼티를 사용해야함
      },
    },
    include:{
      userPreference:true,//생성된 데이터를 돌려줄때 userPreference도 같이 돌려준다 
    },
  });
  res.status(201).send(user);
}));

app.patch('/users/:id', asyncHandler(async (req, res) => {
  assert(req.body,PatchUser); 
  const { id } = req.params;
  // 리퀘스트 바디 내용으로 id에 해당하는 유저 수정 ->update메소드 사용
  const user = await prisma.user.update({
    where:{ id },
    data:{
      ...userFiedls,
      userPreference:{
        create:userPreference,//관련된 객체는 create 프로퍼티를 사용해야함
      },
    },
    include:{
      userPreference:true,//생성된 데이터를 돌려줄때 userPreference도 같이 돌려준다 
    },
  });
  res.send(user);
}));

app.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  // id에 해당하는 유저 삭제
  await prisma.user.delete({
    where: {id},
  });

  res.sendStatus(204);
}));


app.get('/users/:id/saved-products', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {savedProducts} = await prisma.user.findUniqueOrThrow({
      where: { id },
      include:{
        savedProducts: true, 
      },
  });
  res.send(savedProducts);
}));


app.post(
  '/users/:id/saved-products',
  asyncHandler(async (req, res) => {
    assert(req.body, PostSavedProduct);
    const { id: userId } = req.params;
    const { productId } = req.body;
    const { savedProducts } = await prisma.user.update({
      where: { id: userId },
      data: {
        savedProducts: {
          connect: { //연결해제는 disconnect 
            id: productId,
          },
        },
      },
      include: {
        savedProducts: true,
      },
    });
    res.send(savedProducts);
  })
);


app.get(
  '/users/:id/orders',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orders } = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        orders: true,
      },
    });
    res.send(orders);
  })
);

/*********** products ***********/

app.get('/products', asyncHandler(async (req, res) => {
  const { offset = 0, limit = 10, order = 'newest', category } = req.query;
  let orderBy;
  switch (order) {
    case 'priceLowest':
      orderBy = { price: 'asc' };
      break;
    case 'priceHighest':
      orderBy = { price: 'desc' };
      break;
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
  }
  const where = category ? { category } : {};
  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: parseInt(offset),
    take: parseInt(limit),
  });
  res.send(products);
}));

app.get('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({
    where: { id },
  });
  res.send(product);
}));

app.post('/products', asyncHandler(async (req, res) => {
  assert(req.body, CreateProduct);
  const product = await prisma.product.create({
    data: req.body,
  });
  res.status(201).send(product);
}));

app.patch('/products/:id', asyncHandler(async (req, res) => {
  assert(req.body, PatchProduct);
  const { id } = req.params;
  const product = await prisma.product.update({
    where: { id },
    data: req.body,
  });
  res.send(product);
}));

app.delete('/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({
    where: { id },
  });
  res.sendStatus(204);
}));

/*********** orders ***********/

app.get('/orders', asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany();
  res.send(orders);
}));

app.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    let total = 0;  
    order.orderItems.forEach((orderItem) => {
      total += orderItem.unitPrice * orderItem.quantity; // Computed 필드
    });
    order.total = total;//order 객체의 total 프로퍼티에 total를 넣는다

    res.send(order);
  })
);

app.post(
  '/orders',
  asyncHandler(async (req, res) => {
    assert(req.body, CreateOrder);
    const { userId, orderItems } = req.body;

    const productIds = orderItems.map((orderItem) => orderItem.productId);//orderItem에 있는 productId를 모두 가져온다 
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });//상품아이디들에 해당하는 상품들을 모두 가져온다 

    function getQuantity(productId) {//주문수량을 가져온다 
      const orderItem = orderItems.find(
        (orderItem) => orderItem.productId === productId
      );
      return orderItem.quantity;
    }

    // 재고 확인
    const isSufficientStock = products.every((product) => {//모든 상품에 대해 재고가 있어야 true가 된다 
      const { id, stock } = product;
      return stock >= getQuantity(id);//상품의 주문수량과 비교한다 
    });

    if (!isSufficientStock) {//재고가 충분하지않다면 오류를 리턴 
      throw new Error('Insufficient Stock');
    }

    // Order 생성하고 재고 감소
    const queries = productIds.map((productId) =>
      prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: getQuantity(productId) } },
      })
    );

    const [order] = await prisma.$transaction([//생성된 order를 리스폰스로 돌려주기위해 첫번째 요소만 리턴한다
      prisma.order.create({
        data: {
          userId,
          orderItems: {
            create: orderItems,
          },
        },
        include: {
          orderItems: true,
        },
      }),
      ...queries,//쿼리 배열 요소를 하나씩 꺼내는 스프레드 문법
    ])
    res.status(201).send(order);
  })
);

app.patch('/orders/:id', asyncHandler(async (req, res) => {
  assert(req.body, PatchOrder);
  const { id } = req.params;
  const order = await prisma.order.update({
    where: { id },
    data: req.body,
  });
  res.send(order);
}));

app.delete('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.order.delete({ where: { id } });
  res.sendStatus(204);
}));





app.listen(process.env.PORT || 3000, () => console.log('Server Started'));