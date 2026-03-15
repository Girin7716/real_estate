# Seoul Urgent Sale Finder (서울 급매물 탐지기)

네이버 부동산 데이터를 로컬에서 자동 수집하고, 통계적 분석을 통해 동일 단지/평형 평균가 대비 가장 저렴한 **'급매물'**을 찾아 우선순위를 매겨주는 1인 전용 부동산 대시보드입니다.

## 핵심 특징
1. **제로 비용**: 외부 DB나 유료 서버 없이 로컬 CSV/JSON 데이터만 사용합니다.
2. **데이터 기반 랭킹**: 제목만 급매가 아닌, 가격 데이터 분석을 통해 도출된 진짜 급매물을 상위에 노출합니다.
3. **가용 자산 필터링**: 사용자의 예산과 평형 선호도에 따른 즉각적인 필터링을 지원합니다.

## 설치 및 실행 가이드

### 1) 통합 데이터 동기화 (수집 및 분석)
매물 데이터를 새로 가져오고 분석하려면 다음 명령어를 사용하세요.

**방법 A: 직접 명령어 실행 (권장)**
```powershell
python scripts\sync_all.py
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
