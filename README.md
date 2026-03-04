# Seoul Real Estate Local Dashboard

네이버 부동산 매물 데이터를 백그라운드 파이썬 스크립트로 자동 크롤링하고, 가벼운 로컬 환경(FastAPI + Vite/React)에서 맞춤형 자본금 필터링을 통해 시세 시각화를 지원하는 **1인 전용 부동산 대시보드**입니다. 

## 프로젝트 특징
1. **서버리스/인프라리스 지향**: 데이터베이스(DB) 대신 `.csv` 파일 입출력을 사용하여 세팅 허들과 유지보수 관리 비용을 없앴습니다.
2. **크롤러 연속 스케줄링**: `naver_crawler.py` 스크립트 실행 한 번으로 백그라운드에서 매 1시간마다 설정해 둔 단지의 매물 리스트를 자동으로 갱신합니다.
3. **사용자 맞춤형 UI**: 다크모드 기반의 미려한 카드 UI 렌더링, 자산 슬라이더 기반의 필터링 기능 그리고 즉각적인 네이버 호가 상세페이지 매물 URL 연결이 가능합니다.

## 폴더 구조 (Tree)
```text
seoul-real-estate-project/
│
├── data/                      
│   ├── crawlers/              # 네이버 부동산 수집 파이썬 스크립트 및 요구사항 
│   └── csv_exports/           # 수집 완료 후 지속적으로 갱신되는 서울 부동산 시세 CSV 파일
│
├── frontend/                  
│   ├── api/                   # CSV를 파싱해 UI 개발 서버로 서빙해주는 초경량 FastAPI 로컬 라우터
│   └── src/                   # Vite React 기반 UI / UX 화면 (컴포넌트 및 로직)
│
└── docs/                      # 프로젝트 요구사항 설계, Task 내역, 기타 기획 문서 통합본
```

## 설치 및 실행 가이드 (Getting Started)

이 프로젝트는 총 3가지의 컴포넌트(크롤러, 백엔드 API, 프론트엔드)로 구성되어 있으므로 각각 실행시켜 주어야 합니다. 

> 모든 작업의 기본 경로는 루트 디렉토리(`c:\Users\nun25\Desktop\Development\dev\real_estate`)로 가정합니다.

### 1) 가상환경 세팅 및 백그라운드 크롤러 실행
```powershell
# 가상 환경 생성 및 활성화
python -m venv .venv
.\.venv\Scripts\activate

# 의존성 설치 및 백그라운드 크롤러 구동
pip install -r data\crawlers\requirements.txt
python data\crawlers\naver_crawler.py
```
*(기본 1시간마다 데이터 수집)*

### 2) FastAPI 로컬 데이터 제공 서버 (`port 8000`)
```powershell
# 별도의 터미널 탭을 열고 가상환경 활성화 후 실행
.\.venv\Scripts\activate
pip install -r frontend\api\requirements.txt
python -m uvicorn frontend.api.main:app --host 127.0.0.1 --port 8000
```
*(서버가 켜지면 파싱 완료를 위해 대기합니다)*

### 3) 뷰어용 프론트엔드 대시보드 서버 (`port 5173`)
```powershell
# 다시 별도의 터미널 탭을 열고 실행
cd frontend
npm install
npm run dev
```

이후 브라우저에서 `http://localhost:5173` 으로 접속하시면 UI를 확인할 수 있습니다!

## 활용된 룰셋 (Core Rules)
*   **Rule Set 3 & 4.** (Shrimp Manager): 모든 작업은 순차적 컴포넌트로 분리 관리하여 작성되었습니다. 
*   **Local Only.** 외부 배포 목적이 아니므로 개발 효율성에 집중합니다. 
*   **무단 크롤링 자제.** 봇 차단을 우회하기 위한 지연 시간 세팅(`time.sleep()`)이 필수로 동반됩니다. 
