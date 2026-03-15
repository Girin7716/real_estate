# 급매물 탐지 시스템 개발 (Urgent Sale Detection System)

- [x] 1. 프로젝트 재편 및 초기화
  - [x] 1.1 불필요한 테스트 파일 및 초기 세팅 파일 정리
  - [x] 1.2 `project_idea.md` 및 `crawling_plan.md` 급매물 중심 업데이트
  - [x] 1.3 데이터 분석 스크립트 폴더 (`scripts/`) 생성

- [x] 2. 데이터 수집 고도화 (Collection)
  - [x] 2.1 `naver_crawler.py` 서울 전역 지원 및 에러 핸들링 보완
  - [x] 2.2 대량 수집 시 차단 방지를 위한 Smart Sleep 로직 강화

- [x] 3. 급매물 랭킹 분석 및 DB 연동 (Analysis & DB)
  - [x] 3.1 평형별/단지별 통계 데이터(평균, 중위값) 산출 로직 구현
  - [x] 3.2 '급매 지수' 산정 알고리즘 적용 (가격 하락폭, 평당가 등)
  - [x] 3.3 Supabase 프로젝트 생성 및 테이블 스키마 설정
  - [x] 3.4 분석 결과를 Supabase로 업로드하는 로직 구현

- [x] 4. 프론트엔드 UI/UX 강화 (Dashboard)
  - [x] 4.1 랭킹 보드 페이지 및 필터링 사이드바 구현
  - [x] 4.2 자본금/평형/매매가 조건별 즉시 필터링 기능 추가
  - [x] 4.3 지도 마커와 랭킹 리스트 연동 (필요 시)

- [x] 5. 시스템 자동화 및 클라우드 배포 (Automation & Deployment)
  - [x] 5.1 Vercel을 통한 프론트엔드 배포 및 환경 변수 설정
  - [x] 5.2 `.agent/workflows/sync-realestate.md`에 DB 동기화 단계 추가
  - [x] 5.3 README.md 최종 사용 가이드 업데이트
