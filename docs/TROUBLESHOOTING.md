# 🛠️ Troubleshooting Guide (문제 해결 가이드)

이 문서는 개발 및 운영 과정에서 발생한 주요 문제들과 그 해결 방법을 기록합니다.

## 1. Vercel 배포 후 흰색 화면 (White Screen)
**현상**: 사이트 접속 시 배경은 어둡지만 아무런 콘텐츠가 나타나지 않음.

### 원인 1: Vite Base 경로 설정 오류
- **설명**: `vite.config.ts`의 `base` 속성이 `/`가 아닌 다른 경로(예: `/real_estate/`)로 설정되어 있어 에셋(JS, CSS)을 로드하지 못함.
- **해결**: `vite.config.ts`에서 `base` 설정을 삭제하거나 `'/'`로 수정하여 루트 경로에서 에셋을 찾도록 함.

### 원인 2: 환경 변수 미등록
- **설명**: `VITE_SUPABASE_URL` 또는 `VITE_SUPABASE_ANON_KEY`가 Vercel 프로젝트 설정에 등록되지 않아 런타임 에러 발생.
- **해결**: Vercel Dashboard -> Settings -> Environment Variables에서 해당 키를 등록하고 재배포.

## 2. 레이아웃 뒤틀림 (Layout Distortions)
**현상**: 사이드바가 메인 콘텐츠를 가리거나, 텍스트가 겹침.

### 원인: Tailwind CSS와 Vanilla CSS의 혼용
- **설명**: 프로젝트 초기 설정에 남아있던 Tailwind 클래스들이 `App.css`의 커스텀 스타일과 충돌함.
- **해결**: 모든 스타일링을 Vanilla CSS로 통합하고, Tailwind 관련 패키지 및 설정을 제거함.

## 3. 모바일 반응형 이슈
**현상**: 모바일에서 가로 스크롤이 발생하거나 요소가 너무 작게 보임.

### 해결 방법
- `App.css` 하단에 `@media (max-width: 768px)` 미디어 쿼리를 추가하여 세로 스태킹 레이아웃 적용.
- 뷰포트 메타 태그(`index.html`) 확인.
