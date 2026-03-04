# 직군/기능별 프로젝트 폴더링 구조 (Directory Structure)

1인 로컬 전용 개발 환경에 맞게, 굳이 필요 없는 클라우드 인프라(K8s, CI/CD) 및 DB(PostgreSQL/ORM) 관련 폴더를 제거하고 직관적으로 개편했습니다.

```text
seoul-real-estate-project/
│
├── data/                      # 📊 데이터 수집 영역 (Python 크롤러 & CSV 저장)
│   ├── crawlers/              # 네이버 부동산 크롤러 스크립트 작성 (비동기, Requests 등)
│   ├── csv_exports/           # 수집이 완료된 최종 부동산 가격 CSV 파일들이 보관되는 곳
│   └── notebooks/             # 수집 결과를 테스트하고 임시 가공해 볼 분석용 Jupyter Notebooks
│
├── frontend/                  # 🎨 데이터 시각화 웹 화면 영역 (사용자 확인 전용 뷰어)
│   ├── api/                   # (선택) 로컬 CSV를 파싱해 프론트엔드로 전달하는 경량형 로컬 라우터 (Vite 서버 등 활용)
│   ├── public/                # 정적 에셋 (아이콘, 지도 핀 마커 이미지)
│   ├── src/
│   │   ├── components/        # 차트, 지도, 필터 컴포넌트
│   │   ├── pages/             # 대시보드 화면 및 메인 맵 페이지
│   │   ├── services/          # 로컬 디렉토리의 데이터를 패치하는 함수
│   │   └── styles/            # UI 스타일링 (CSS)
│   └── package.json           # 프론트 패키지 매니저
│
└── docs/                      # 📝 기획 및 문서 보관
    └── planning/              # 요구사항(단일 대시보드), 룰셋, 크롤링 계획서 보관용
```
