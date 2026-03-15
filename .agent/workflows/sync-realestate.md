---
description: 서울 부동산 데이터 수집 및 급매물 랭킹 분석 동기화 워크플로우
---

이 워크플로우는 네이버 부동산 데이터를 수집하고, 분석 엔진을 통해 '급매 지수'를 도출한 뒤 **Supabase Cloud DB**에 자동으로 동기화하여 대시보드(Vercel)에 즉시 반영하는 전 과정을 수행합니다.

1. 가상환경 활성화 및 의존성 확인
// turbo
2. 네이버 부동산 데이터 수집 실행 (로컬)
   ```powershell
   .\.venv\Scripts\python.exe data\crawlers\naver_crawler.py --once
   ```

3. 급매물 분석 및 Supabase 동기화 (Cloud)
   ```powershell
   .\.venv\Scripts\python.exe scripts\analyze_urgent_sales.py
   ```
   *(분석 결과는 Supabase `urgent_sales` 테이블에 실시간으로 Upsert 됩니다)*

4. 동기화 결과 확인 및 Vercel 대시보드 새로고침
