# 부동산 매물 공유 플랫폼 - Server

Express + TypeScript 기반 REST API 서버

## 기술 스택

- Express 5 / TypeScript
- MongoDB (Mongoose)
- Socket.IO (실시간 알림)
- AWS S3 (이미지 업로드)
- Firebase Admin (푸시 알림)
- CoolSMS (문자 인증)
- Swagger (API 문서)

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 루트에 생성합니다.

```env
MONGO_URI=mongodb://localhost:27017/realestate
JWT_SECRET=your-jwt-secret
PORT=3000

# CoolSMS
COOLSMS_API_KEY=your-coolsms-api-key
COOLSMS_API_SECRET=your-coolsms-api-secret
COOLSMS_FROM_PHONE=01012345678

# Kakao
KAKAO_REST_API_KEY=your-kakao-rest-api-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-northeast-2

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project-id.iam.gserviceaccount.com
```

### 3. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 4. 빌드 & 프로덕션 실행

```bash
npm run build
npm start
```

### 5. 시드 데이터

```bash
npm run seed
```

## API 문서

서버 실행 후 `http://localhost:3000/api-docs`에서 Swagger UI를 확인할 수 있습니다.
