import requests
import pandas as pd
import time
import random
import os
from datetime import datetime

# ---------------------------------------------------------
# CONSTANTS & CONFIGURATION
# ---------------------------------------------------------
# 타겟 서버 보호를 위한 무차별 스크래핑 제한용 딜레이 규칙 (Rule 5)
MIN_DELAY_SEC = 2.0
MAX_DELAY_SEC = 5.0

# 네이버 모바일 웹 우회를 위한 User-Agent 설정
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://m.land.naver.com/"
}

# CSV 파일 저장 경로 설정 (폴더가 없으면 생성)
CSV_EXPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "csv_exports")
os.makedirs(CSV_EXPORT_DIR, exist_ok=True)

# ---------------------------------------------------------
# TARGET HSCP_NO (단지 번호 샘플 - 서울 마포구/강남구 임의 샘플 2개)
# 전체 구역 확대 전 기능 테스트를 위한 하드코딩 리스트 (헬리오시티: 108364, 마포래미안푸르지오: 100918)
# ---------------------------------------------------------
TARGET_HSCP_LIST = ["108364", "100918"]


def fetch_article_list(session: requests.Session, hscp_no: str) -> list:
    """
    특정 단지 번호(hscpNo)의 아파트 매물 리스트를 네이버를 통해 수집합니다.
    (1페이지 분량만 샘플로 수집)
    """
    url = "https://m.land.naver.com/cluster/ajax/articleList"
    
    # 쿼리 파라미터 (매매, 전세, 월세 타겟팅 - APT)
    params = {
        "rletTpCd": "APT", # 아파트
        "tradTpCd": "A1:B1:B2", # 매매, 전세, 월세
        "z": "12", # 줌 레벨
        "lat": "37.5665", # 중심 위도(가변이나 API상 필요)
        "lon": "126.9780", # 중심 경도
        "hscpNo": hscp_no,
        "page": 1 # 1페이지 (총 매물을 다 가져오려면 pagination 필요)
    }

    print(f"[알림] 단지번호 [{hscp_no}] 데이터 수집 요청 중...")
    
    try:
        response = session.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status() # HTTP 4xx, 5xx 에러 검출
        
        data = response.json()
        article_list = data.get('body', [])
        
        # 무작위 Delay 적용(서버 차단 방어)
        sleep_time = random.uniform(MIN_DELAY_SEC, MAX_DELAY_SEC)
        print(f"[완료] {len(article_list)}개 매물 확보. 봇 탐지 방어를 위해 {sleep_time:.2f}초 대기합니다.")
        time.sleep(sleep_time)
        
        return article_list

    except Exception as e:
        print(f"[에러] 단지번호 {hscp_no} 수집 실패: {e}")
        return []


def parse_to_dataframe(raw_data_list: list) -> pd.DataFrame:
    """
    JSON 원본 형태의 리스트를 분석에 필요한 컬럼만 추출하여 DataFrame으로 변환합니다.
    """
    parsed_data = []
    for item in raw_data_list:
        parsed_data.append({
            "고유번호": item.get("atclNo"),
            "거래유형": item.get("tradTpNm"), # 매매, 전세, 월세
            "단지명": item.get("atclNm"),
            "매물가격": item.get("prc"),
            "월세가격": item.get("rentPrc", 0),
            "공급면적(m2)": item.get("spc1"),
            "전용면적(m2)": item.get("spc2"),
            "층수": item.get("flrInfo"),
            "방향": item.get("direction"),
            "특징": item.get("atclFetrDesc", ""),
            "URL": f"https://new.land.naver.com?articleNo={item.get('atclNo')}"
        })
        
    df = pd.DataFrame(parsed_data)
    
    if not df.empty:
        # P.K 기반 중복 매물 제거
        df = df.drop_duplicates(subset=['고유번호'])
        
    return df


def run_crawler_job():
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 크롤러 수집 배치 시작...")
    
    all_articles = []
    # 세션 유지를 통해 지속적인 연결 및 쿠키 핸들링
    with requests.Session() as session:
        for hscp in TARGET_HSCP_LIST:
            articles = fetch_article_list(session, hscp)
            all_articles.extend(articles)
            
    if not all_articles:
        print("[오류] 이번 주기에는 수집된 데이터가 없습니다. (봇 탐지 또는 매물 없음)")
        return
        
    # DataFrame 변환 및 전처리 (중복 제거)
    df = parse_to_dataframe(all_articles)
    
    # CSV로 내보내기 (오늘 날짜 기록)
    today_str = datetime.now().strftime("%Y%m%d")
    csv_filename = f"{today_str}_seoul_sample_real_estate.csv"
    csv_path = os.path.join(CSV_EXPORT_DIR, csv_filename)
    
    # utf-8-sig 인코딩으로 한글 깨짐 방지 
    df.to_csv(csv_path, index=False, encoding='utf-8-sig')
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 성공적으로 {len(df)}개의 매물이 반영되었습니다.")
    print(f"-> 저장 경로: {csv_path}")

def main():
    print("=== [Naver Real Estate Local Crawler Started (Continuous Mode)] ===")
    
    # 주기 설정 (예: 1시간 = 3600초)
    # 네이버 차단을 방지하기 위해 최소 1시간 이상의 여유로운 텀을 주는 것이 좋습니다.
    INTERVAL_SECONDS = 3600
    
    while True:
        try:
            run_crawler_job()
            print(f"\n[대기] 다음 수집까지 {INTERVAL_SECONDS // 60}분 대기합니다...")
            time.sleep(INTERVAL_SECONDS)
        except KeyboardInterrupt:
            print("\n[종료] 사용자에 의해 크롤러 루프가 기동 중지되었습니다.")
            break
        except Exception as e:
            print(f"\n[크리티컬 에러] 알 수 없는 오류 발생: {e}")
            print("1분 후 다시 재시도합니다...")
            time.sleep(60)

if __name__ == "__main__":
    main()
