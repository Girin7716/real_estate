---
description: Vercel 배포 후 흰색 화면이 나타날 때 해결하는 절차
---

# /fix-white-screen 워크플로우

Vercel에서 배포된 사이트가 흰색 화면으로만 보일 때 다음 단계를 순서대로 수행합니다.

1. **Vite 설정 확인**: `frontend/vite.config.ts` 파일을 열어 `base` 설정이 있는지 확인합니다. Vercel 루트 배포라면 `base`가 없거나 `'/'`여야 합니다.
2. **콘솔 로그 확인**: 브라우저 도구를 사용하여 JS 에러 유무를 확인합니다. `404 Not Found` 에러가 에셋 파일에서 발생한다면 경로 문제입니다.
3. **환경 변수 검증**: Vercel 대시보드에서 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`가 올바른지 확인합니다.
4. **빌드 명령 확인**: `vercel.json`에서 `buildCommand`가 `cd frontend && npm install && npm run build`와 같이 올바른 경로에서 실행되는지 확인합니다.
5. **Vercel 재배포**: 수정 사항을 Push한 후 Vercel 대시보드에서 새로운 배포가 완료될 때까지 대기합니다.
