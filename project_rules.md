# 프로젝트 공통 가이드라인 및 Antigravity(AI) 프롬프트 룰셋

이 문서는 이 프로젝트에 참여하는 모든 개발 주체(사용자와 AI 안티그래비티 모두)가 일관성을 위해 지켜야 할 핵심 원칙과 규칙들을 정의합니다. 본 문서는 다음 세션에서도 복사하여 그대로 프롬프트로 주입할 수 있도록 작성되었습니다.

## 1. Antigravity AI 작동 룰셋 (System Execution Rules)

- **Rule 1. Korean Language First (한국어 사용 원칙)** 
  - 사용자의 설정인 `always response korean`을 절대 준수합니다. 설명, 주석, 결과물 통보, 커밋 메시지 등 예외적인 툴 호출 파라미터를 제외한 모든 언어 소통은 한국어로 진행합니다.
- **Rule 2. No-Code First (코드 작성 지양 밑 설계 우선)**
  - 명시적으로 코드를 구체적으로 작성해달라는 요청이 오기 전까지는 파이썬/JS 코드를 직접 출력하지 않습니다. 오직 기능 명세, 데이터 스키마, 기획 의도를 `.md` 기반 기획 문서로 먼저 정리하여 사용자와 합의해야 합니다.
- **Rule 3. Sequential Thinking & Shrimp Task Manager** 
  - 큰 요청 사항을 마주할 경우 복잡성을 줄이기 위해 새우(Shrimp)의 크기만큼 작고 관리 가능한 단위의 태스크로 쪼갭니다.
  - 이 잘게 다져진 작업들은 `task.md` 에 기록되며, 순차적(Sequential)으로 하나씩 집중하여 해결하고, 항상 `task_boundary` 도구를 사용해 변경된 태스크의 현 상황을 사용자에게 투명하게 알립니다.
- **Rule 4. Auto-Reporting on Errors (에러 시 무한 루프 방지)**
  - 작업 진행 중 알 수 없는 에러가 발생한 경우 무작정 코드 교체를 시도하지 않습니다. 대신 발생한 에러의 원인과 추정되는 해결 플랜을 유저에게 먼저 요약 보고(`notify_user`)하여 피드백을 수용합니다.

## 2. 개발 및 프로젝트 작동 룰셋 (Development Rules)

- **Rule 5. Local-Only & CSV Architecture (1인 로컬 전용 아키텍처)**
  - 서버 호스팅, 복잡한 인프라, 상용 RDBMS 배포 및 구축을 완전히 배제합니다.
  - 무거운 DB 대신, 수집 데이터는 직관적으로 열람 가능한 **CSV 형식(`data/csv_exports/`)** 으로 바로 내보내고 동기화합니다.
  - **급매물 분석 원칙**: 수집된 원본 데이터를 바탕으로 `scripts/analyze_urgent_sales.py`를 실행하여 단지/평형별 평균가 대비 하락 폭이 큰 매물을 추출합니다.
  - 프론트엔드는 본인만 사용하는 뷰어 용도이므로 보안/성능 최적화보다 **직관적인 매물 시각화(급매물 랭킹, 지도 마커, 자본 필터)**에만 집중하여 가볍게 구성합니다.
- **Commit Convention (커밋 컨벤션)**
  - 변경 사항 커밋 시 반드시 `type: subject` 형태를 유지합니다.  
    (예시: `feat: 네이버 부동산 가격 데이터 크롤링 구조 반영`, `docs: API 데이터 명세서 추가`)
- **Structure Segregation (역할에 따른 분리)**
  - 간소화된 1인 로컬 전용 폴더링 규칙(`folder_structure.md` 참고)을 따릅니다.
- **Data Safety (수집 방어 및 안전성)**
  - 데이터 수집 시 타겟 서버 비용을 유발하는 무차별적인 스크래핑 시도를 금지합니다. Delay, Batch Size Limit, Retry Logic 을 반드시 스크립트에 포함합니다.
- **Anti-Bot & Automation Framework (크롤링 기술 스택)**
  - 봇 차단이 엄격한 사이트(예: 네이버 부동산)의 데이터 수집 시, 안정성과 비동기 처리 렌더링을 위해 **Playwright**를 우선적으로 사용합니다.
  - DOM 파싱보다는 화면 렌더링 시 발생하는 **Network Intercept(네트워크 통신 가로채기)** 기법을 사용하여, 빠르고 정확하게 JSON 데이터를 추출하는 방식을 지향합니다.
- **Git Auto-Commit (작업 완료 시 자동 커밋)**
  - 하나의 의미 있는 작업 단위(기능 구현, 리팩토링, 버그 수정, 문서 변경)가 검증까지 완료되면, `/git-commit` 워크플로우를 실행하여 변경 사항을 git에 반영합니다.
  - 커밋 메시지는 **Conventional Commits** 형식(`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)을 따르며, 영어 한 줄로 간결하게 작성합니다.
  - `git push`는 사용자 확인 후에만 실행합니다.
