import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from './models/Property';
import User from './models/User';

dotenv.config();

// 클러스터 포인트: 건물/단지 단위로 밀집
// count = 해당 포인트에 생성할 매물 수, spread = 건물 내 흩어짐 정도
const CLUSTERS = [
  // === 강남 밀집 (줌 아웃하면 하나로 뭉침) ===
  { name: '강남역 타워', lat: 37.4979, lng: 127.0276, count: 12, spread: 0.0003 },
  { name: '강남역 오피스텔A', lat: 37.4985, lng: 127.0282, count: 8, spread: 0.0002 },
  { name: '역삼 아이파크', lat: 37.5007, lng: 127.0365, count: 6, spread: 0.0002 },
  { name: '서초 래미안', lat: 37.4837, lng: 127.0146, count: 5, spread: 0.0003 },

  // === 잠실 밀집 ===
  { name: '잠실 엘스', lat: 37.5133, lng: 127.1001, count: 10, spread: 0.0004 },
  { name: '잠실 리센츠', lat: 37.5120, lng: 127.0980, count: 7, spread: 0.0003 },
  { name: '송파 헬리오시티', lat: 37.5048, lng: 127.1127, count: 8, spread: 0.0005 },

  // === 홍대/마포 ===
  { name: '홍대 빌라촌', lat: 37.5563, lng: 126.9236, count: 6, spread: 0.0003 },
  { name: '마포 래미안', lat: 37.5537, lng: 126.9467, count: 5, spread: 0.0003 },

  // === 여의도 ===
  { name: '여의도 시범아파트', lat: 37.5219, lng: 126.9245, count: 7, spread: 0.0004 },
  { name: '여의도 자이', lat: 37.5235, lng: 126.9270, count: 5, spread: 0.0002 },

  // === 성수 ===
  { name: '성수 트리마제', lat: 37.5445, lng: 127.0557, count: 6, spread: 0.0002 },

  // === 용산 ===
  { name: '용산 파크타워', lat: 37.5311, lng: 126.9810, count: 5, spread: 0.0003 },
  { name: '이촌 한가람', lat: 37.5215, lng: 126.9720, count: 4, spread: 0.0003 },

  // === 광화문/종로 (소수 산재) ===
  { name: '광화문 오피스텔', lat: 37.5760, lng: 126.9769, count: 3, spread: 0.0002 },
  { name: '종로 원룸', lat: 37.5700, lng: 126.9920, count: 3, spread: 0.0004 },
];

const TYPES: ('open' | 'general')[] = ['open', 'general'];
const BUILDING_TYPES = ['아파트', '오피스텔', '빌라', '원룸', '투룸', '상가', '사무실'];
const DEAL_TYPES = ['매매', '전세', '월세'];
const FLOORS = ['1층', '2층', '3층', '4층', '5층', '저층', '중층', '고층'];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProperty(
  userId: mongoose.Types.ObjectId,
  cluster: (typeof CLUSTERS)[number],
  index: number,
) {
  // 클러스터 중심에서 spread 범위 내 미세 분산 (같은 건물/단지)
  const lat = cluster.lat + rand(-cluster.spread, cluster.spread);
  const lng = cluster.lng + rand(-cluster.spread, cluster.spread);
  const building = pick(BUILDING_TYPES);
  const deal = pick(DEAL_TYPES);

  const price =
    deal === '매매'
      ? `${randInt(1, 30)}억 ${randInt(0, 9) * 1000}만`
      : deal === '전세'
        ? `${randInt(1, 10)}억`
        : `${randInt(500, 5000)}만`;

  const deposit = deal === '월세' ? `${randInt(500, 5000)}만` : undefined;
  const monthlyRent = deal === '월세' ? `${randInt(30, 300)}만` : undefined;

  return {
    userId,
    type: pick(TYPES),
    title: `${cluster.name} ${building} ${deal} ${index + 1}호`,
    address: `서울시 ${cluster.name} ${randInt(100, 999)}동 ${randInt(100, 2000)}호`,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    price,
    deposit,
    monthlyRent,
    area: randInt(10, 120),
    floor: pick(FLOORS),
    rooms: randInt(1, 5),
    description: `[시드 데이터] ${cluster.name} ${building} ${deal} 매물입니다.`,
    images: [],
    status: 'active',
  };
}

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realestate';
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  // 테스트 유저 생성 (없으면)
  let testUser = await User.findOne({ phone: '01000000000' });
  if (!testUser) {
    testUser = await User.create({
      phone: '01000000000',
      name: '테스트 공인중개사',
      agencyName: '시드부동산',
      isApproved: true,
    });
    console.log('테스트 유저 생성 완료');
  }

  // 기존 시드 데이터 삭제
  const deleted = await Property.deleteMany({ description: { $regex: /^\[시드 데이터\]/ } });
  console.log(`기존 시드 데이터 ${deleted.deletedCount}건 삭제`);

  // 클러스터별 매물 생성
  const properties = CLUSTERS.flatMap((cluster) =>
    Array.from({ length: cluster.count }, (_, i) =>
      generateProperty(testUser!._id as mongoose.Types.ObjectId, cluster, i)
    )
  );

  await Property.insertMany(properties);
  console.log(`시드 매물 ${properties.length}건 등록 완료`);

  // 클러스터별 분포 출력
  console.log('\n클러스터별 분포:');
  for (const cluster of CLUSTERS) {
    console.log(`  ${cluster.name}: ${cluster.count}건 (spread: ${cluster.spread})`);
  }

  await mongoose.disconnect();
  console.log('\n완료!');
}

seed().catch((err) => {
  console.error('시드 실패:', err);
  process.exit(1);
});
