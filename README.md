# Device Information Dashboard

Android 디바이스의 하드웨어 정보와 센서 데이터를 수집하고 실시간으로 모니터링할 수 있는 시스템입니다.

## 아키텍처

- **Android 앱**: Kotlin + Jetpack Compose로 디바이스 정보 수집
- **데이터베이스**: Supabase (PostgreSQL)
- **웹 대시보드**: Next.js + TypeScript + Tailwind CSS
- **배포**: Vercel (웹), Google Play Store (앱)

## 기능

### Android 앱
- 기본 디바이스 정보 (모델, 제조사, OS 버전 등)
- 하드웨어 정보 (CPU, 메모리, 저장공간)
- 통신사 정보
- 센서 정보 (가속도계, 자이로스코프 등)
- 서버 업로드 기능

### 웹 대시보드
- 실시간 디바이스 목록
- 디바이스 상세 정보 조회
- 통계 및 분석 페이지
- 반응형 디자인

## 설정 및 배포

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 테이블 생성 스크립트 실행:

```sql
-- devices 테이블 생성
CREATE TABLE devices (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    model TEXT,
    manufacturer TEXT,
    brand TEXT,
    android_version TEXT,
    sdk_version INTEGER,
    carrier_name TEXT,
    operator_name TEXT,
    cpu_abis TEXT[],
    cpu_cores INTEGER,
    total_memory_gb DECIMAL,
    available_memory_gb DECIMAL,
    total_storage_gb DECIMAL,
    available_storage_gb DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sensors 테이블 생성
CREATE TABLE sensors (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type INTEGER,
    type_name TEXT,
    vendor TEXT,
    version INTEGER,
    maximum_range DECIMAL,
    resolution DECIMAL,
    power DECIMAL,
    min_delay INTEGER,
    max_delay INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Enable read access for all users" ON devices FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON sensors FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users only" ON sensors FOR INSERT WITH CHECK (true);
```

3. API Keys 복사 (Project Settings > API)

### 2. Android 앱 설정

1. `network/SupabaseClient.kt`에서 Supabase URL과 API Key 업데이트:

```kotlin
private val supabase = createSupabaseClient(
    supabaseUrl = "YOUR_SUPABASE_URL",
    supabaseKey = "YOUR_SUPABASE_ANON_KEY"
) {
    install(Postgrest)
    install(Realtime)
}
```

2. 권한 설정 확인 (`AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 3. 웹 대시보드 설정

1. 프로젝트 생성:

```bash
npx create-next-app@latest device-dashboard --typescript --tailwind --eslint --app
cd device-dashboard
npm install @supabase/supabase-js
```

2. 환경변수 설정 (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. 로컬 개발 서버 실행:

```bash
npm run dev
```

### 4. Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 계정으로 로그인
2. 새 프로젝트 생성하고 GitHub 저장소 연결
3. 환경변수 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 배포 완료

## 개발 환경

### Android
- Kotlin 1.9+
- Android Studio
- Jetpack Compose
- Hilt (의존성 주입)
- Supabase Kotlin SDK

### 웹
- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase JavaScript SDK

## 무료 제한사항

### Supabase 무료 플랜
- 데이터베이스: 500MB
- API 요청: 50,000회/월
- 실시간 연결: 200개 동시

### Vercel 무료 플랜
- 대역폭: 100GB/월
- 함수 실행 시간: 10초
- 빌드: 6,000분/월

## 확장 가능성

1. **사용자 인증**: Supabase Auth로 사용자 관리
2. **알림 시스템**: 특정 조건 시 알림 발송
3. **데이터 분석**: 머신러닝을 통한 패턴 분석
4. **실시간 모니터링**: WebSocket을 통한 실시간 업데이트
5. **API 확장**: RESTful API로 외부 시스템 연동

## 라이선스

MIT License

## 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request