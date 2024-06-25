import * as s from 'superstruct';
import isEmail from 'is-email';
import isUuid from 'is-uuid';


//유효성 검사는 수퍼스트럭트로 예상하는 데이터 형식을 정의하고
// 실제 받은 데이터가 형식과 일치하는지 확인 


const CATEGORIES = [
  'FASHION',
  'BEAUTY',
  'SPORTS',
  'ELECTRONICS',
  'HOME_INTERIOR',
  'HOUSEHOLD_SUPPLIES',
  'KITCHENWARE',
];

const STATUSES = ['PENDING', 'COMPLETE'];

const Uuid = s.define('Uuid', (value) => isUuid.v4(value));

export const CreateUser = s.object({
  email: s.define('Email', isEmail),//email타입은 isEmail형식을 통과해야한다
  firstName: s.size(s.string(), 1, 30),//size 함수는 string 타입의 길이를 제한 
  lastName: s.size(s.string(), 1, 30),
  address: s.string(),
  userPreference:s.object({
    receiveEmail:s.boolean(),
  })
});

export const PatchUser = s.partial(CreateUser);// CreateUser의 일부면 ok

export const CreateProduct = s.object({
  name: s.size(s.string(), 1, 60),
  description: s.string(),
  category: s.enums(CATEGORIES),
  price: s.min(s.number(), 0),
  stock: s.min(s.integer(), 0),
});

export const PatchProduct = s.partial(CreateProduct);

export const CreateOrder = s.object({
  userId: Uuid,
});

export const PatchOrder = s.object({
  status: s.enums(STATUSES),
});


export const PostSavedProduct = s.object({
  productId: Uuid,
});