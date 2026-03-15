# Seoul Urgent Sale Finder (서울 급매물 탐지기)

네이버 부동산 데이터를 로컬에서 자동 수집하고, 통계적 분석을 통해 동일 단지/평형 평균가 대비 가장 저렴한 **'급매물'**을 찾아 우선순위를 매겨주는 1인 전용 부동산 대시보드입니다.

## ✨ Key Features (주요 기능)

- **Premium Analytics**: 단순히 가격만 보여주는 것이 아니라, 최고가 대비 하락액, 급매 지수, 유지 기간 등을 입체적으로 분석합니다.
- **Price Trend Visualizer**: 자체 구현한 SVG 차트를 통해 매물의 가격 변동 이력을 시각적으로 한눈에 파악할 수 있습니다.
- **Investor-Centric Filters**: 자본금 규모, 거래 유형(매매/전세/월세), 평형별 맞춤형 필터를 실시간으로 적용합니다.
- **Interactive Map Support**: 상세 보기에서 카카오맵과 즉시 연동되어 매물의 위치를 별도 검색 없이 즉시 확인 가능합니다.
- **Mobile Responsive**: 모든 기기에서 최적화된 UX를 제공하는 글래스모피즘(Glassmorphism) 기반 디자인.

## 🛠 Tech Stack (기술 스택)

- **Frontend**: React, TypeScript, Vite, Vanilla CSS
- **Backend/Storage**: Supabase (PostgreSQL), Python (Crawl & Analysis)
- **Deployment**: Vercel (CI/CD)
- **APIs**: Naver Land API, Kakao Map API

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/Girin7716/real_estate.git

# Install frontend dependencies
cd frontend
npm install
npm run dev

# Run data pipeline (requires .env setup)
python scripts/sync_all.py
```

**방법 B: AI 워크플로우 사용**
```powershell
# Antigravity 워크플로우 실행
/sync-realestate
```

### 2) 대시보드 실행 (Vite React)
분석된 랭킹 데이터를 시각적으로 확인하려면 프론트엔드 서버를 실행하세요.
```powershell
cd frontend
npm install
npm run dev
```
이후 브라우저에서 `http://localhost:5173` 을 엽니다.

## 라이브 대시보드
- **URL**: [https://frontend-seven-psi-94.vercel.app/](https://frontend-seven-psi-94.vercel.app/)
- **배포 방식**: GitHub Push 시 Vercel CI/CD 자동 배포

## 주요 파일 구조
- `data/crawlers/`: 네이버 부동산 수집 스크립트
- `scripts/analyze_urgent_sales.py`: 급매물 물리 분석 엔진
- `frontend/public/data/ranked_sales.json`: 분석된 최종 랭킹 데이터
- `task.md`: 현재 프로젝트 진행 상황 관리
