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
    
    # 5. 기존 데이터 조회 및 상태 동기화 로직
    # A. 기존 DB 데이터 조회 (article_no, price_value)
    get_url = f"{SUPABASE_URL}/rest/v1/urgent_sales?select=article_no,price_value"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    existing_map = {}
    try:
        resp = requests.get(get_url, headers=headers)
        if resp.status_code == 200:
            existing_map = {item['article_no']: item['price_value'] for item in resp.json()}
            print(f">> 기존 DB에서 {len(existing_map)}건의 매물 정보를 불러왔습니다.")
    except Exception as e:
        print(f"[경고] 기존 데이터 조회 실패 (무시하고 진행): {e}")

    # B. 신규/변경 데이터 준비
    upload_data = []
    history_data = []
    current_time = datetime.now().isoformat()
    current_articles = set()

    # 단지 메타데이터 로드 (구/동 정보 매핑용)
    complex_meta = {}
    complexes_path = os.path.join(BASE_DIR, "data", "crawlers", "seoul_complexes.json")
    if os.path.exists(complexes_path):
        try:
            with open(complexes_path, 'r', encoding='utf-8') as f:
                c_data = json.load(f)
                # complexNo를 키로 하는 맵 생성
                complex_meta = {str(c['complexNo']): c for c in c_data.get('complexes', [])}
        except Exception as e:
            print(f"[경고] 단지 메타데이터 로드 실패: {e}")

    # 단지명 기반 메타데이터 맵 생성 (O(1) 조회를 위함)
    name_to_meta = {m['complexName']: m for m in complex_meta.values()}

    for _, row in ranked_df.iterrows():
        art_no = str(row['고유번호'])
        new_price = int(row['매매가_수치'])
        current_articles.add(art_no)
        
        # 단지 정보에서 구/동 추출 (크롤러가 저장한 원본 데이터 또는 메타데이터 활용)
        # naver_crawler.py가 articleName(단지명)은 주지만 complexNo는 직접 안 줄 수 있으니 
        # 단지명으로 매핑하거나, 크롤러 정보를 더 활용해야 함.
        # 여기서는 단지명 기반 매핑 (동명이인 단지 주의)
        sgg_nm = "서울"
        emd_nm = ""
        
        # 단지명으로 메타데이터 찾기 (O(1) lookup)
        meta = name_to_meta.get(row['단지명'])
        if meta:
            sgg_nm = meta['guName']
            emd_nm = meta['dongName']

        # 가격 변동 감지
        if art_no in existing_map and existing_map[art_no] != new_price:
            print(f"  [변동] {row['단지명']} ({art_no}): {existing_map[art_no]} -> {new_price}")
            history_data.append({
                "article_no": art_no,
                "price_value": new_price,
                "recorded_at": current_time
            })
        elif art_no not in existing_map:
            # 신규 매물도 초기 가격 이력 기록
            history_data.append({
                "article_no": art_no,
                "price_value": new_price,
                "recorded_at": current_time
            })

        upload_data.append({
            "article_no": art_no,
            "complex_name": row['단지명'],
            "sgg_nm": sgg_nm,
            "emd_nm": emd_nm,
            "price_display": row['매물가격'],
            "trade_type": row['거래유형'],
            "area_supply": float(row['공급면적(m2)']),
            "area_exclusive": float(row['전용면적(m2)']),
            "floor_info": row['층수'],
            "features": row['특징'],
            "url": row['URL'],
            "price_value": new_price,
            "urgent_index": float(row['급매지수']),
            "final_score": float(row['최종점수']),
            "latitude": float(row['latitude']) if pd.notnull(row.get('latitude')) else None,
            "longitude": float(row['longitude']) if pd.notnull(row.get('longitude')) else None,
            "updated_at": current_time,
            "last_seen_at": current_time,
            "is_active": True
        })
    
    # Helper: Batch Sync
    def sync_batches(url, headers, data, batch_size=500):
        total = len(data)
        if total == 0: return
        for i in range(0, total, batch_size):
            batch = data[i:i + batch_size]
            try:
                resp = requests.post(url, headers=headers, data=json.dumps(batch))
                resp.raise_for_status()
                print(f"  -> [{min(i + batch_size, total)} / {total}] 항목 동기화 완료...")
            except Exception as e:
                error_msg = str(e)
                if hasattr(resp, 'text'):
                    error_msg += f" | Detail: {resp.text}"
                print(f"  [오류] 배치 {i//batch_size + 1} 실패: {error_msg}")

    # 6. 최종 메인 데이터 업로드 (UPSERT)
    api_url = f"{SUPABASE_URL}/rest/v1/urgent_sales?on_conflict=article_no"
    main_headers = headers.copy()
    main_headers["Prefer"] = "resolution=merge-duplicates" # Upsert 모드
    main_headers["Content-Type"] = "application/json"
    
    import math
    def clean_float(val):
        if val is None: return None
        try:
            f_val = float(val)
            if not math.isfinite(f_val): return None
            return f_val
        except: return None

    # 데이터 정제 (NaN/Inf 처리)
    for item in upload_data:
        for k, v in item.items():
            if isinstance(v, float):
                item[k] = clean_float(v)

    print(f">> Supabase API로 {len(upload_data)}건의 메인 데이터를 동기화 중...")
    sync_batches(api_url, main_headers, upload_data, batch_size=100) # 배치 사이즈 축소

    # C. 상세 페이지/차트용 히스토리 업로드
    if history_data:
        print(f">> {len(history_data)}건의 가격 변동 이력을 기록 중...")
        for item in history_data:
            item["price_value"] = clean_float(item["price_value"]) # 히스토리 데이터도 정제
            
        history_url = f"{SUPABASE_URL}/rest/v1/price_history"
        sync_batches(history_url, headers, history_data, batch_size=100)

    # D. 사라진 매물 비활성화 (Batch Update)
    disappeared_articles = [art for art in existing_map if art not in current_articles]
    if disappeared_articles:
        print(f">> {len(disappeared_articles)}건의 매물이 사라졌습니다. 비활성 처리 중...")
        for i in range(0, len(disappeared_articles), 100):
            batch_slice = disappeared_articles[i:i+100]
            patch_url = f"{SUPABASE_URL}/rest/v1/urgent_sales?article_no=in.({','.join(batch_slice)})"
            patch_headers = headers.copy()
            patch_headers["Prefer"] = "return=minimal"
            try:
                requests.patch(patch_url, headers=patch_headers, data=json.dumps({"is_active": False}))
            except Exception: pass

    print(f"[{datetime.now()}] Supabase 최종 동기화 프로세스 완료!")

if __name__ == "__main__":
    analyze_urgent_sales()
