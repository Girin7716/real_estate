from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import glob
import math

app = FastAPI()

# 프론트엔드(Vite 로컬 서버)에서 API를 호출할 수 있도록 CORS 정책 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터가 저장된 CSV_EXPORTS 절대 경로 추출
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CSV_DIR = os.path.join(BASE_DIR, "data", "csv_exports")

@app.get("/api/real-estate")
def get_real_estate_data():
    """
    가장 최근에 수집된(가장 최신 날짜의) 부동산 CSV 데이터를 읽어서
    프론트엔드 대시보드로 JSON 형태로 파싱해 내려줍니다.
    """
    if not os.path.exists(CSV_DIR):
        return {"status": "error", "message": "CSV 디렉토리가 존재하지 않습니다."}

    # csv_exports 안의 모든 csv 파일 목록 가져오기
    list_of_files = glob.glob(os.path.join(CSV_DIR, "*.csv"))
    if not list_of_files:
        return {"status": "error", "message": "수집된 데이터(CSV)가 없습니다."}
    
    # 생성 시간 순으로 정렬하여 가장 최근 파일 선택
    latest_file = max(list_of_files, key=os.path.getctime)
    
    try:
        # 인코딩 맞춰서 데이터 로딩
        df = pd.read_csv(latest_file, encoding='utf-8-sig')
        
        # NaN 등 JSON으로 직렬화할 수 없는 결측치들을 빈 문자열로 안전하게 변환
        df = df.fillna("")
        
        # 목록을 리스트 딕셔너리로 변환
        data = df.to_dict(orient="records")
        
        return {
            "status": "success", 
            "filename": os.path.basename(latest_file), 
            "total_count": len(data),
            "data": data
        }
    except Exception as e:
        return {"status": "error", "message": f"CSV 로딩 실패: {str(e)}"}
