"""
네이버 부동산 서울 아파트 단지 목록 수집기 (Direct API v10)
- Playwright를 사용하여 초기 Bearer Token을 가로챕니다.
- page.evaluate를 사용하여 브라우저 컨텍스트 내에서 API를 직접 호출합니다. (쿠키 자동 포함)
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
MIN_DELAY_SEC = 1.0
MAX_DELAY_SEC = 2.5
SEOUL_CORTAR_NO = '1100000000'

# 디버그 모드: 특정 구만 수집 (예: "강남구"), None이면 전체 수집
DEBUG_GU_NAME = None 

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")


class NaverComplexDiscoverer:
    def __init__(self, page):
        self.page = page
        self.all_complexes = []
        self.auth_token = None
        self.seen_complex_nos = set()

    async def capture_auth_token(self):
        """인증에 필요한 Bearer 토큰을 가로챕니다."""
        print("[토큰] 인증 토큰 확보 시도 중...", flush=True)
        
        token_found = asyncio.Event()

        async def request_handler(request):
            auth = request.headers.get("authorization")
            if auth and "Bearer" in auth:
                self.auth_token = auth
                token_found.set()

        self.page.on("request", request_handler)

        try:
            await self.page.goto("https://new.land.naver.com/complexes")
            await self.page.wait_for_selector("button.button_capsule", timeout=20000)
            
            # API 호출 유도
            for _ in range(5):
                if token_found.is_set(): break
                await self.page.click("button.button_capsule")
                await asyncio.sleep(2)
            
            if token_found.is_set():
                print(f"[토큰] 가로채기 완료: {self.auth_token[:20]}...")
                return True
            return False
        finally:
            self.page.remove_listener("request", request_handler)

    async def fetch_api(self, url):
        """브라우저 내에서 fetch를 실행하여 인증 정보를 포함한 데이터를 가져옵니다."""
        try:
            # evaluate 내에서 fetch 실행 (쿠키 자동 포함 + 커스텀 헤더)
            res_json = await self.page.evaluate(f"""
                async () => {{
                    const res = await fetch('{url}', {{
                        headers: {{
                            'Authorization': '{self.auth_token}',
                            'Referer': 'https://new.land.naver.com/'
                        }}
                    }});
                    return await res.json();
                }}
            """)
            return res_json
        except Exception as e:
            # print(f"    [DEBUG] API 호출 실패: {e}")
            return None

    async def get_regions(self, cortar_no):
        """지역 목록 API를 호출합니다."""
        url = f"https://new.land.naver.com/api/regions/list?cortarNo={cortar_no}"
        data = await self.fetch_api(url)
        return data.get('regionList', []) if data else []

    async def fetch_complexes_for_dong(self, gu_name, dong_name, dong_no):
        """특정 동의 단지 목록을 API로 직접 가져옵니다."""
        url = f"https://new.land.naver.com/api/regions/complexes?cortarNo={dong_no}&realEstateType=APT:PRE&order="
        
        try:
            data = await self.fetch_api(url)
            if not data: return 0
            
            comp_list = data.get('complexList', [])
            added_count = 0
            for comp in comp_list:
                c_no = str(comp.get('complexNo'))
                if c_no not in self.seen_complex_nos:
                    self.all_complexes.append({
                        "guName": gu_name, "dongName": dong_name,
                        "complexNo": c_no, "complexName": comp.get('complexName'),
                        "lat": comp.get('latitude'), "lon": comp.get('longitude')
                    })
                    self.seen_complex_nos.add(c_no)
                    added_count += 1
            
            if added_count > 0:
                 print(f"  - {dong_name}: {added_count}개 발견 (누적: {len(self.all_complexes)})")
            return added_count
        except:
            return 0


async def main():
    print("=== [SEOUL REAL ESTATE COMPLEX DISCOVERER (Direct API v10)] ===")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="ko-KR"
        )
        page = await context.new_page()

        stealth = Stealth()
        await stealth.apply_stealth_async(page)
        discoverer = NaverComplexDiscoverer(page)

        if not await discoverer.capture_auth_token():
            print("[에러] 인증 토큰 확보 실패.")
            await browser.close()
            return

        gu_list = await discoverer.get_regions(SEOUL_CORTAR_NO)
        if not gu_list:
             # 토큰 없이 재시도 (regions/list는 토큰이 필요 없을 수 있음)
             url = f"https://new.land.naver.com/api/regions/list?cortarNo={SEOUL_CORTAR_NO}"
             try:
                 res_text = await page.evaluate(f"async () => fetch('{url}').then(r => r.json())")
                 gu_list = res_text.get('regionList', [])
             except: pass

        if not gu_list:
            print("[에러] 구 목록 수집 실패.")
            await browser.close()
            return

        if DEBUG_GU_NAME:
            gu_list = [g for g in gu_list if g.get('cortarName') == DEBUG_GU_NAME]

        print(f">> 탐색 시작 (대상: {len(gu_list)}개 구)\n", flush=True)

        for gu in gu_list:
            gu_name = gu.get('cortarName')
            gu_no = gu.get('cortarNo')
            dong_list = await discoverer.get_regions(gu_no)
            print(f">> {gu_name} ({len(dong_list)}개 동) 수집 중...")
            
            for dong in dong_list:
                dong_name = dong.get('cortarName')
                dong_no = dong.get('cortarNo')
                await discoverer.fetch_complexes_for_dong(gu_name, dong_name, dong_no)
                await asyncio.sleep(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC))

            # 중간 저장
            result_stats = {
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_complexes": len(discoverer.all_complexes),
                "target_gu": gu_name,
                "complexes": discoverer.all_complexes
            }
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(result_stats, f, ensure_ascii=False, indent=2)

        await browser.close()
        
    print(f"\n[완료] 총 {len(discoverer.all_complexes)}개 단지 정보 저장됨: {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
