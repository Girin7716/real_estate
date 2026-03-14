---
description: Git 커밋 워크플로우 - 작업 완료 시 자동으로 git에 변경 사항을 반영하는 절차
---

# Git 커밋 워크플로우

작업이 완료되거나 의미 있는 단위의 변경이 이루어졌을 때, 아래 절차에 따라 git에 반영합니다.

## 커밋 시점 (언제 커밋하는가?)
- **기능 구현 완료**: 새로운 기능이나 스크립트가 작동 확인된 후
- **리팩토링 완료**: 코드 구조 변경이 검증된 후
- **버그 수정 완료**: 버그가 수정되고 테스트된 후
- **설정/문서 변경**: `project_rules.md`, `crawling_plan.md` 등 규칙 문서가 변경된 후

> **주의**: CSV 데이터 파일, 디버그 스크린샷, 테스트 스크립트는 `.gitignore`에 의해 제외됩니다.

## 커밋 절차

// turbo-all

1. 변경 사항 확인
```
git status --porcelain
git diff --stat
```

2. 변경 파일 스테이징 (관련 파일만 선택적으로 add)
```
git add <변경된 파일들>
```

3. 커밋 메시지 작성 (Conventional Commits 형식)
```
git commit -m "<type>: <한줄 요약>"
```

### 커밋 메시지 규칙
- **feat**: 새 기능 추가 (예: `feat: add Playwright stealth crawler`)
- **fix**: 버그 수정 (예: `fix: resolve async event loop hang on Python 3.13`)
- **refactor**: 코드 리팩토링 (예: `refactor: migrate from requests to Playwright`)
- **docs**: 문서 변경 (예: `docs: update crawling_plan with Playwright strategy`)
- **chore**: 기타 (빌드, 설정 등) (예: `chore: update .gitignore for debug artifacts`)
- 커밋 메시지는 **영어**로 작성합니다.
- 한 줄로 간결하게 작성합니다 (PowerShell 호환성을 위해 멀티라인 메시지 사용 지양).

4. (선택) 원격 저장소에 Push
```
git push origin main
```
> Push는 사용자 확인 후에만 실행합니다.
