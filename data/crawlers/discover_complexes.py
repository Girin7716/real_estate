"""
네이버 부동산 서울 아파트 단지 목록 수집기 (Playwright Stealth + Async 기반)
- Playwright + playwright-stealth를 사용합니다.
- 지도 검색 및 네이게이션을 통해 자연스럽게 API 호출을 유도하고 응답을 인터셉트합니다.
- 봇 탐지 및 429 에러를 방지하기 위해 실제 사용자 흐름을 모방합니다.
"""
import asyncio
import json
import random
import os
from datetime import datetime
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
MIN_DELAY_SEC = 2.0
MAX_DELAY_SEC = 4.0
SEOUL_CORTAR_NO = '1100000000'

# 디버그 모드: 특정 구만 수집 (예: "강남구")
DEBUG_GU_NAME = "강남구" 

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")


class NaverComplexDiscoverer:
    def __init__(self, page):
        self.page = page
        self.all_complexes = []
        self.current_dong_complexes = []
        self.seen_complex_nos = set()

    async def handle_response(self, response):
        """네트웍 응답을 감시하여 단지 마커 정보를 추출합니다."""
        # 디버그용: 모든 마커 관련 요청 출력
        if "single-markers" in response.url:
            print(f"    [DEBUG] Marker API: {response.url} (Status: {response.status})")

        if "single-markers/2.0" in response.url and response.status == 200:
            try:
                data = await response.json()
                if isinstance(data, list):
                    for comp in data:
                        marker_id = comp.get('markerId')
                        if marker_id and marker_id not in self.seen_complex_nos:
                            self.current_dong_complexes.append(comp)
                            self.seen_complex_nos.add(marker_id)
            except Exception as e:
                print(f"    [DEBUG] JSON 파싱 에러: {e}")

    async def get_regions(self, cortar_no):
        """지역 목록 API를 호출합니다."""
        url = f"https://new.land.naver.com/api/regions/list?cortarNo={cortar_no}"
        try:
            res_text = await self.page.evaluate(f"""
                async () => {{
                    const res = await fetch('{url}');
                    return await res.text();
                }}
            """)
            data = json.loads(res_text)
            return data.get('regionList', [])
        except:
            return []

    async def search_and_discover(self, gu_name, dong_name):
        """검색창에 지역명을 입력하여 지도를 이동시키고 마커를 수집합니다."""
        self.current_dong_complexes = []
        search_query = f"{gu_name} {dong_name}"
        
        print(f"  - {dong_name} 검색 중...", flush=True)
        
        try:
            # 1. 검색창 활성화 (캡슐 버튼 클릭)
            if await self.page.is_visible("button.button_capsule"):
                await self.page.click("button.button_capsule")
                await self.page.wait_for_timeout(500)

            # 2. 검색어 입력 (ID land_search 또는 클래스 search_input)
            search_selector = "input#land_search"
            if not await self.page.is_visible(search_selector):
                search_selector = "input.search_input"
            
            await self.page.wait_for_selector(search_selector, timeout=5000)
            
            await self.page.click(search_selector)
            await self.page.keyboard.press("Control+A")
            await self.page.keyboard.press("Backspace")
            
            await self.page.type(search_selector, search_query, delay=100)
            await self.page.keyboard.press("Enter")
            
            # 3. 지도 이동 및 마커 로드 대기
            await self.page.wait_for_timeout(4000)
            
            added_count = 0
            for comp in self.current_dong_complexes:
                self.all_complexes.append({
                    "guName": gu_name,
                    "dongName": dong_name,
                    "complexNo": comp.get('markerId'),
                    "complexName": comp.get('markerName'),
                    "lat": comp.get('latitude'),
                    "lon": comp.get('longitude')
                })
                added_count += 1
            
            if added_count > 0:
                 print(f"    -> {added_count}개 신규 단지 발견 (누적: {len(self.all_complexes)})")
            
            return added_count
        except Exception as e:
            print(f"    [경고] {dong_name} 검색 실패: {e}")
            return 0


async def main():
    print("=== [SEOUL REAL ESTATE COMPLEX DISCOVERER (Navigation Intercept)] ===")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            # 가로 폭을 늘려서 더 많은 마커가 한 번에 보이게 함
            viewport={"width": 1600, "height": 900},
            locale="ko-KR"
        )
        page = await context.new_page()

        stealth = Stealth()
        await stealth.apply_stealth_async(page)

        discoverer = NaverComplexDiscoverer(page)
        page.on("response", discoverer.handle_response)

        # 초기 접속
        print("[초기화] 네이버 부동산 접속...", flush=True)
        await page.goto("https://new.land.naver.com/complexes")
        # 캡슐 버튼이 나타날 때까지 대기
        await page.wait_for_selector("button.button_capsule", timeout=30000)
        await page.wait_for_timeout(2000)

        # 1. 구 목록 가져오기
        gu_list = await discoverer.get_regions(SEOUL_CORTAR_NO)
        if not gu_list:
            print("[에러] 구 목록을 가져오지 못했습니다.")
            await browser.close()
            return

        if DEBUG_GU_NAME:
            gu_list = [g for g in gu_list if g.get('cortarName') == DEBUG_GU_NAME]

        print(f">> 탐색 시작 (대상: {len(gu_list)}개 구)\n", flush=True)

        for gu in gu_list:
            gu_name = gu.get('cortarName')
            gu_no = gu.get('cortarNo')
            
            # 2. 동 목록 가져오기
            dong_list = await discoverer.get_regions(gu_no)
            print(f">> {gu_name} ({len(dong_list)}개 동) 탐색 시작...")
            
            for dong in dong_list:
                dong_name = dong.get('cortarName')
                # 3. 검색 및 인터셉트
                await discoverer.search_and_discover(gu_name, dong_name)
                # 안정적인 수집을 위한 지연
                await page.wait_for_timeout(int(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC) * 1000))

            # 중간 저장
            result_data = {
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_complexes": len(discoverer.all_complexes),
                "complexes": discoverer.all_complexes
            }
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(result_data, f, ensure_ascii=False, indent=2)

        await browser.close()
        
    print(f"\n[완료] 총 {len(discoverer.all_complexes)}개 단지 정보 저장됨: {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
