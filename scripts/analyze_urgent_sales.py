import pandas as pd
import json
import os
import glob
import requests
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드 (Supabase 연동 정보)
load_dotenv()

# 설정: 파일 경로 및 Supabase 정보
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_DIR = os.path.join(BASE_DIR, "data", "csv_exports")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def analyze_urgent_sales():
    print(f"[{datetime.now()}] 급매물 분석 엔진 가동 시작...")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[오류] Supabase URL 또는 Key가 설정되지 않았습니다. .env 파일을 확인하세요.")
        return
    
    # 1. 최신 CSV 파일 로드
    csv_files = glob.glob(os.path.join(CSV_DIR, "*.csv"))
    if not csv_files:
        print("[오류] 분석할 CSV 데이터가 없습니다.")
        return
    
    latest_csv = max(csv_files, key=os.path.getctime)
    print(f">> 분석 대상 파일: {os.path.basename(latest_csv)}")
    
    try:
        df = pd.read_csv(latest_csv, encoding='utf-8-sig')
    except Exception as e:
        print(f"[오류] CSV 로드 실패: {e}")
        return

    if df.empty:
        print("[경고] 데이터가 비어있습니다.")
        return

    # 2. 데이터 전처리 (가격 수치화)
    def parse_price(price_str):
        if not isinstance(price_str, str): return 0
        price_str = price_str.replace(",", "")
        parts = price_str.split("억")
        total = 0
        if len(parts) == 2:
            total += int(parts[0].strip() or 0) * 10000
            rest = parts[1].replace(" ", "").strip()
            if rest: total += int(rest)
        else:
            rest = parts[0].replace(" ", "").strip()
            if rest: total += int(rest)
        return total

    df['매매가_수치'] = df['매물가격'].apply(parse_price)
    
    # 3. 급매 지수 산출 로직
    df['면적_그룹'] = df['전용면적(m2)'].apply(lambda x: round(x))
    stats = df.groupby(['단지명', '면적_그룹'])['매매가_수치'].agg(['mean']).reset_index()
    df = df.merge(stats, on=['단지명', '면적_그룹'], how='left')
    
    # 급매 지수 (Ranking Score)
    df['급매지수'] = ((df['mean'] - df['매매가_수치']) / df['mean'] * 100).round(2)
    
    # 키워드 가점
    def calculate_bonus(feature):
        score = 0
        if '급매' in str(feature): score += 5
        if '올수리' in str(feature): score += 3
        if '가격조정' in str(feature): score += 2
        return score
    
    df['가점'] = df['특징'].apply(calculate_bonus)
    df['최종점수'] = df['급매지수'] + df['가점']
    
    # 4. 결과 정렬 및 Supabase 업로드
    ranked_df = df.sort_values(by='최종점수', ascending=False)
    
    upload_data = []
    for _, row in ranked_df.iterrows():
        upload_data.append({
            "article_no": str(row['고유번호']),
            "complex_name": row['단지명'],
            "price_display": row['매물가격'],
            "trade_type": row['거래유형'],
            "area_supply": float(row['공급면적(m2)']),
            "area_exclusive": float(row['전용면적(m2)']),
            "floor_info": row['층수'],
            "features": row['특징'],
            "url": row['URL'],
            "price_value": int(row['매매가_수치']),
            "urgent_index": float(row['급매지수']),
            "final_score": float(row['최종점수']),
            "updated_at": datetime.now().isoformat()
        })
    
    # Supabase REST API 호출 설정 (UPSERT를 위해 on_conflict 파라미터 추가)
    api_url = f"{SUPABASE_URL}/rest/v1/urgent_sales?on_conflict=article_no"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" # Upsert 모드
    }
    
    print(f">> Supabase API로 {len(upload_data)}건의 데이터를 동기화 중...")
    try:
        # UPSERT 수행 (POST 요청)
        response = requests.post(api_url, headers=headers, data=json.dumps(upload_data))
        response.raise_for_status()
        print(f"[{datetime.now()}] Supabase 동기화 완료! (Status: {response.status_code})")
    except Exception as e:
        print(f"[오류] Supabase 업로드 실패: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"상세 에러: {e.response.text}")

if __name__ == "__main__":
    analyze_urgent_sales()
