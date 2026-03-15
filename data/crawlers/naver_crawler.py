"""
네이버 부동산 서울 지역 크롤러 (Playwright Stealth + Async 기반)
- Playwright + playwright-stealth 를 사용하여 네이버 봇 탐지를 우회합니다.
- 브라우저가 자동으로 호출하는 API 응답을 네트워크 인터셉트로 가로채 JSON 데이터를 추출합니다.
- Python 3.13의 asyncio 호환성을 위해 async_api 를 사용합니다.
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
MIN_DELAY_SEC = 2.0
MAX_DELAY_SEC = 5.0

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_EXPORT_DIR = os.path.join(BASE_DIR, "csv_exports")
os.makedirs(CSV_EXPORT_DIR, exist_ok=True)

COMPLEXES_JSON_PATH = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")


def parse_to_dataframe(raw_data_list: list) -> pd.DataFrame:
    """
    JSON 원본 형태의 리스트를 분석에 필요한 컬럼만 추출하여 DataFrame으로 변환합니다.
    (PC Web API 포맷 기준)
    """
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
    """단지 정보 JSON 파일에서 타겟 리스트를 읽어옵니다."""
    if not os.path.exists(json_path):
        print(f"[오류] 타겟 단지 파일이 없습니다. ({json_path})")
        print("  -> generate_sample_complexes.py 를 먼저 실행해주세요.")
        return []
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('complexes', [])
    except Exception as e:
        print(f"[오류] 단지 파일 읽기 실패: {e}")
        return []


async def run_crawler_job(json_path: str = COMPLEXES_JSON_PATH):
    """Playwright Stealth + Network Intercept 기반 크롤링 배치 작업"""
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Playwright Stealth 크롤러 수집 배치 시작...", flush=True)

    target_complexes = load_target_complexes(json_path)
    if not target_complexes:
        print("[오류] 수집할 단지 목록이 비어있어 배치를 종료합니다.")
        return

    print(f">> 수집 대상: 총 {len(target_complexes)}개 아파트 단지", flush=True)
    all_articles = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="ko-KR"
        )
        page = await context.new_page()

        # Stealth 모드 적용 (봇 탐지 우회)
        stealth = Stealth()
        await stealth.apply_stealth_async(page)

        # 1. 메인 페이지 접속 → 초기 쿠키/세션 확보
        print("[초기화] 네이버 부동산 메인 페이지 접속 중...", flush=True)
        try:
            await page.goto("https://new.land.naver.com/", timeout=15000)
            await page.wait_for_timeout(2000)
            print(f"  페이지 제목: {await page.title()}", flush=True)
        except Exception as e:
            print(f"[경고] 메인 페이지 접속 지연 (무시하고 진행): {e}", flush=True)

        # 2. 각 단지별로 순회하며 데이터 수집
        for idx, comp in enumerate(target_complexes):
            hscp = comp.get('complexNo')
            name = comp.get('complexName')

            print(f"\n[{idx+1}/{len(target_complexes)}] [{name} (No.{hscp})] 수집 시작...", flush=True)

            # 해당 단지의 매물 데이터를 저장할 리스트
            fetched_articles = []

            # 네트워크 인터셉터 콜백 정의
            async def on_response(response):
                url = response.url
                if f"api/articles/complex/{hscp}" in url and response.status == 200:
                    try:
                        data = await response.json()
                        article_list = data.get('articleList', [])
                        if article_list:
                            fetched_articles.extend(article_list)
                            print(f"  -> 네트워크 인터셉트 성공: {len(article_list)}개 매물 가로채기 완료", flush=True)
                    except Exception:
                        pass

            # 이벤트 리스너 등록
            page.on("response", on_response)

            # 단지 페이지로 네비게이션 → 네이버 리액트 앱이 자동으로 API 호출
            complex_url = f"https://new.land.naver.com/complexes/{hscp}?ms=37.4975515,127.107054,16&a=APT:PRE&e=RETAIL"
            try:
                await page.goto(complex_url, timeout=15000)
                await page.wait_for_timeout(3000)
            except Exception as e:
                print(f"  [경고] 단지 페이지 접근 지연: {e}", flush=True)

            # 스크롤을 통한 추가 페이지 로딩 유도 (무한 스크롤 패턴)
            for scroll_attempt in range(3):
                try:
                    await page.evaluate("""
                        const box = document.querySelector('.item_list') ||
                                    document.querySelector('.list_contents') ||
                                    document.querySelector('[class*="article"]');
                        if (box) { box.scrollTop = box.scrollHeight; }
                    """)
                except Exception:
                    pass
                await page.wait_for_timeout(int(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC) * 1000))

            # 이벤트 리스너 해제
            page.remove_listener("response", on_response)

            # 중복 제거
            unique = {item['articleNo']: item for item in fetched_articles if 'articleNo' in item}
            fetched_articles = list(unique.values())

            print(f"  [완료] [{name}] 총 {len(fetched_articles)}개 고유 매물 확보.", flush=True)
            all_articles.extend(fetched_articles)

            # 단지 간 딜레이 (봇 탐지 방어)
            await page.wait_for_timeout(int(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC) * 1000))

        await browser.close()

    # CSV 저장
    if not all_articles:
        print("[오류] 이번 주기에는 수집된 데이터가 없습니다.", flush=True)
        return

    df = parse_to_dataframe(all_articles)

    today_str = datetime.now().strftime("%Y%m%d")
    csv_filename = f"{today_str}_seoul_sample_real_estate.csv"
    csv_path = os.path.join(CSV_EXPORT_DIR, csv_filename)
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')

    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 성공적으로 {len(df)}개의 매물이 반영되었습니다.", flush=True)
    print(f"-> 저장 경로: {csv_path}", flush=True)


import sys
import argparse

# ... (기존 임포트 및 함수 생략, main 부분 수정)

async def main():
    parser = argparse.ArgumentParser(description='Naver Real Estate Crawler')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    args = parser.parse_args()

    print("=== [Naver Real Estate Playwright Stealth Crawler (Async)] ===", flush=True)

    if args.once:
        try:
            await run_crawler_job()
        except Exception as e:
            print(f"\n[에러] 수집 중 오류 발생: {e}", flush=True)
    else:
        INTERVAL_SECONDS = 3600
        while True:
            try:
                await run_crawler_job()
                print(f"\n[대기] 다음 수집까지 {INTERVAL_SECONDS // 60}분 대기합니다...", flush=True)
                await asyncio.sleep(INTERVAL_SECONDS)
            except KeyboardInterrupt:
                print("\n[종료] 사용자에 의해 크롤러 루프가 중지되었습니다.", flush=True)
                break
            except Exception as e:
                print(f"\n[크리티컬 에러] 알 수 없는 오류 발생: {e}", flush=True)
                print("1분 후 다시 재시도합니다...", flush=True)
                await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
