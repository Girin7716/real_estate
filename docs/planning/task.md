# 프로젝트 태스크 관리 (Shrimp Task Manager) - 1인 로컬 전용

- [x] 1. 기획 단계 (Planning)
  - [x] 1.1 데이터 수집 계획서 수정 (crawling_plan.md) - CSV 형식 저장
  - [x] 1.2 서비스 아이디어 기획서 수정 (project_idea.md) - 로컬 대시보드 목적
  - [x] 1.3 폴더 구조 수정 (folder_structure.md) - 인프라/DB 배제
  - [x] 1.4 프로젝트 공통 규칙 추가 (project_rules.md) - 로컬 & CSV 저장 규칙 추가
  - [/] 1.5 1차 수정 전체 리뷰 및 사용자 피드백 대기
- [ ] 2. 데이터 수집 단계 (Data Collection)
  - [ ] 2.1 크롤러 기본 환경 세팅 (Python, Requests, Pandas)
  - [ ] 2.2 네이버 부동산 통신 구조 및 파라미터 분석 (Network 탭)
  - [ ] 2.3 서울 지역 아파트/오피스텔 크롤링 스크립트 작성
  - [ ] 2.4 데이터 전처리 로직 및 CSV 파일(.csv) 형식 저장 로직 작성
- [ ] 3. 로컬 뷰어 구현 단계 (Frontend & Local API)
  - [ ] 3.1 수집된 CSV 파일을 읽어 프론트엔드에 전달할 간단한 로컬 API (Python FastAPI/Flask 등) 세팅
  - [ ] 3.2 로컬 서빙용 프론트엔드 UI 대시보드 (Vite 등) 초기 세팅
  - [ ] 3.3 전달된 부동산 데이터를 지도 API(카카오/네이버)에 마커로 표시
  - [ ] 3.4 자본금 필터링, 평당가 히트맵 UI 및 차트 기능 구현
