"""
네이버 부동산 서울 지역 크롤러 (Optimized: Direct API + Parallelism)
- Playwright Stealth + page.evaluate(fetch) 를 사용하여 속도를 극대화합니다.
- 복잡한 전체 페이지 로딩(page.goto) 대신 서버 API를 직접 호출하여 부하를 줄입니다.
- Semaphore를 활용한 병렬 처리를 통해 수집 시간을 단축합니다.
"""
import asyncio
import pandas as pd
import random
import os
import json
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
CONCURRENCY_LIMIT = 5  # 동시에 처리할 단지 수 (너무 높으면 차단 위험)
DELAY_BETWEEN_BATCHES = 0.5  # 단지 간 최소 대기 시간

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_EXPORT_DIR = os.path.join(BASE_DIR, "csv_exports")
os.makedirs(CSV_EXPORT_DIR, exist_ok=True)

COMPLEXES_JSON_PATH = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")


class NaverArticleCrawler:
    def __init__(self, page, semaphore):
        self.page = page
        self.semaphore = semaphore
        self.auth_token = None
        self.total_articles = []

    async def initialize_session(self):
        """인증 토큰 및 세션을 확보합니다."""
        print("[세션] 네이버 부동산 초기 세션 확보 중...", flush=True)
        
        token_found = asyncio.Event()

        async def request_handler(request):
            auth = request.headers.get("authorization")
            if auth and "Bearer" in auth:
                self.auth_token = auth
                token_found.set()

        self.page.on("request", request_handler)

        try:
            # 메인 페이지 접속하여 토큰 발생 유도
            await self.page.goto("https://new.land.naver.com/complexes", timeout=30000)
            await self.page.wait_for_timeout(2000)
            
            # API 호출이 일어날 때까지 잠시 대기
            for _ in range(5):
                if token_found.is_set(): break
                await asyncio.sleep(1)
            
            if self.auth_token:
                print(f"[세션] 인증 토큰 확보 성공: {self.auth_token[:15]}...")
                return True
            else:
                print("[경고] 명시적 Bearer 토큰을 찾지 못했습니다. 쿠키 기반 인증을 시도합니다.")
                return True # 쿠키만으로도 작동할 수 있으므로 진행
        finally:
            self.page.remove_listener("request", request_handler)

    async def fetch_complex_articles(self, complex_info):
        """특정 단지의 매물 목록을 API로 직접 가져옵니다."""
        hscp = complex_info.get('complexNo')
        name = complex_info.get('complexName')
        
        async with self.semaphore:
            # API URL 구성 (기본 매매/전세/월세 전체, APT:PRE 타입)
            url = (
                f"https://new.land.naver.com/api/articles/complex/{hscp}?"
                "realEstateType=APT:PRE&tradeType=&tag=::::::::&rentPriceMin=0&rentPriceMax=900000000&"
                "priceMin=0&priceMax=900000000&areaMin=0&areaMax=900000000&oldBuildYears=&"
                "recentlyBuildYears=&minHouseHoldCount=&maxHouseHoldCount=&showArticles=false&"
                "sameAddressGroup=false&minMaintenanceCost=&maxMaintenanceCost=&direction=&"
                "mainCategory=&subCategory=&view=&sort=rank&page=1"
            )

            try:
                # 브라우저 컨텍스트 내에서 fetch 실행 (쿠키/세션 자동 포함)
                res_data = await self.page.evaluate(
                    """
                    async ({url, auth_token}) => {
                        const headers = {
                            'Referer': 'https://new.land.naver.com/',
                            'User-Agent': navigator.userAgent
                        };
                        if (auth_token) {
                            headers['Authorization'] = auth_token;
                        }
                        const res = await fetch(url, { headers });
                        if (!res.ok) return null;
                        return await res.json();
                    }
                    """,
                    {"url": url, "auth_token": self.auth_token}
                )
                
                if res_data and 'articleList' in res_data:
                    articles = res_data['articleList']
                    print(f"  [성공] {name} ({hscp}): {len(articles)}개 매물 수집", flush=True)
                    return articles
                else:
                    print(f"  [실패] {name} ({hscp}): 데이터 없음 또는 접근 거부", flush=True)
                    return []
            except Exception as e:
                print(f"  [에러] {name} ({hscp}) 수집 중 오류: {e}", flush=True)
                return []
            finally:
                # 짧은 랜덤 딜레이로 차단 방지
                await asyncio.sleep(random.uniform(DELAY_BETWEEN_BATCHES, DELAY_BETWEEN_BATCHES * 2))

def parse_to_dataframe(raw_data_list: list) -> pd.DataFrame:
    """JSON 리스트를 DataFrame으로 변환"""
    parsed_data = []
    for item in raw_data_list:
        parsed_data.append({
            "고유번호": item.get("articleNo"),
            "거래유형": item.get("tradeTypeName"),
            "단지명": item.get("articleName"),
            "매물가격": item.get("dealOrWarrantPrc"),
            "월세가격": item.get("rentPrc", 0),
            "공급면적(m2)": item.get("area1"),
            "전용면적(m2)": item.get("area2"),
            "층수": item.get("floorInfo"),
            "방향": item.get("direction"),
            "특징": item.get("articleFeatureDesc", ""),
            "URL": f"https://new.land.naver.com?articleNo={item.get('articleNo')}",
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude")
        })

    df = pd.DataFrame(parsed_data)
    if not df.empty:
        df = df.drop_duplicates(subset=['고유번호'])
    return df

def load_target_complexes(json_path: str) -> list:
    if not os.path.exists(json_path):
        return []
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data.get('complexes', [])

async def run_crawler_job(json_path: str = COMPLEXES_JSON_PATH):
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 최적화된 API 수집 엔진 가동 시작...", flush=True)

    target_complexes = load_target_complexes(json_path)
    if not target_complexes:
        print("[오류] 수집할 단지 목록이 없습니다.")
        return

    print(f">> 수집 대상: 총 {len(target_complexes)}개 단지 (병렬도: {CONCURRENCY_LIMIT})", flush=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="ko-KR"
        )
        page = await context.new_page()
        
        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        
        semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
        crawler = NaverArticleCrawler(page, semaphore)
        
        if not await crawler.initialize_session():
            print("[오류] 세션 초기화 실패.")
            await browser.close()
            return

        # 병렬 작업 생성
        tasks = [crawler.fetch_complex_articles(comp) for comp in target_complexes]
        results = await asyncio.gather(*tasks)
        
        # 결과 합치기
        all_articles = []
        for res in results:
            if res:
                all_articles.extend(res)
        
        await browser.close()

    if not all_articles:
        print("[!] 수집된 데이터가 없습니다.")
        return

    df = parse_to_dataframe(all_articles)
    today_str = datetime.now().strftime("%Y%m%d")
    csv_path = os.path.join(CSV_EXPORT_DIR, f"{today_str}_seoul_sample_real_estate.csv")
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 수집 완료: 총 {len(df)}개 고유 매물 확보.")
    print(f"-> 저장 경로: {csv_path}", flush=True)

async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()

    if args.once:
        await run_crawler_job()
    else:
        while True:
            await run_crawler_job()
            print("\n[대기] 1시간 후 재실행합니다...")
            await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
