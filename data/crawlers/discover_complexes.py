import requests
import json
import time
import random
import os
from datetime import datetime

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
MIN_DELAY_SEC = 2.0
MAX_DELAY_SEC = 5.0
SEOUL_CORTAR_NO = '1100000000'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://new.land.naver.com/'
}

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")


def fetch_regions(cortar_no, max_retries=3):
    """특정 법정동 코드의 하위 지역 목록(구 또는 동)을 가져옵니다."""
    url = f"https://new.land.naver.com/api/regions/list?cortarNo={cortar_no}"
    for attempt in range(max_retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            res.raise_for_status()
            time.sleep(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC))
            return res.json().get('regionList', [])
        except Exception as e:
            print(f"[오류] 지역 정보({cortar_no}) 수집 실패 (시도 {attempt+1}/{max_retries}): {e}")
            time.sleep(5)
    return []


def fetch_complexes_in_dong(dong_no, max_retries=3):
    """특정 동(dong_no)에 속한 아파트 단지 목록을 가져옵니다."""
    url = f"https://new.land.naver.com/api/complexes/single-markers/2.0?cortarNo={dong_no}&zoom=14&priceType=RETAIL&markerType=COMPLEX&realEstateType=APT"
    for attempt in range(max_retries):
        try:
            res = requests.get(url, headers=HEADERS, timeout=10)
            res.raise_for_status()
            time.sleep(random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC))
            return res.json()
        except Exception as e:
            print(f"[오류] 단지 정보({dong_no}) 수집 실패 (시도 {attempt+1}/{max_retries}): {e}")
            time.sleep(5)
    return []


def main():
    print("=== [SEOUL REAL ESTATE COMPLEX DISCOVERER] ===")
    print("서울시 전체 지역(구->동)을 순회하며 아파트 단지 목록을 수집합니다.")
    print("봇 차단을 막기 위해 의도적으로 느리게 동작합니다. (예상 소요 시간: 수 분~수십 분)")
    
    all_complexes = []
    total_dongs = 0
    error_dongs = []

    # 1. 서울시(1100000000) 내의 '구' 목록 가져오기
    gu_list = fetch_regions(SEOUL_CORTAR_NO)
    if not gu_list:
        print("[크리티컬 에러] 서울시 구 목록을 가져오지 못했습니다. 스크립트를 종료합니다.")
        return

    print(f">> 서울시 내 {len(gu_list)}개 '구'를 발견했습니다.\n")

    # 기존 진행 상태 로드 (이어하기) - 시간 관계상 이번 버전에선 덮어쓰기로 진행
    
    for i, gu in enumerate(gu_list, 1):
        gu_no = gu.get('cortarNo')
        gu_name = gu.get('cortarName')
        print(f"[{i}/{len(gu_list)}] {gu_name} 탐색 시작...")
        
        # 2. 특정 '구' 내의 '동' 목록 가져오기
        dong_list = fetch_regions(gu_no)
        print(f"  -> {gu_name} 내 {len(dong_list)}개 '동' 발견.")
        
        for j, dong in enumerate(dong_list, 1):
            dong_no = dong.get('cortarNo')
            dong_name = dong.get('cortarName')
            total_dongs += 1
            
            # 3. 특정 '동' 내의 '단지' 목록 가져오기
            complex_list = fetch_complexes_in_dong(dong_no)
            
            if complex_list:
                for comp in complex_list:
                    # 단지 번호(markerId)와 이름(markerName) 저장
                    all_complexes.append({
                        "guName": gu_name,
                        "dongName": dong_name,
                        "complexNo": comp.get('markerId'),
                        "complexName": comp.get('markerName'),
                        "lat": comp.get('latitude'),
                        "lon": comp.get('longitude')
                    })
                print(f"    - {dong_name} ({j}/{len(dong_list)}): {len(complex_list)}개 단지 추가됨.")
            else:
                print(f"    - {dong_name} ({j}/{len(dong_list)}): 단지 없음 또는 조회 실패.")
                error_dongs.append(dong_name)
    
    # 4. JSON 파일로 결과 저장
    result_data = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_complexes": len(all_complexes),
        "complexes": all_complexes
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
        
    print("\n" + "="*50)
    print(f"탐색 완료! 총 {len(gu_list)}개 구, {total_dongs}개 동 순회.")
    print(f"최종 수집된 서울 아파트 단지 수: {len(all_complexes)}개")
    print(f"결과 파일 저장 완료: {OUTPUT_FILE}")
    if error_dongs:
        print(f"* 주의: 다음 동에서 데이터를 가져오지 못했습니다: {', '.join(error_dongs)}")
    print("="*50)

if __name__ == "__main__":
    main()
