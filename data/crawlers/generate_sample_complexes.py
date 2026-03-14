import json
import os
from datetime import datetime

# 네이버 API 차단으로 인해 동/단지 자동 수집이 막힌 경우를 대비한
# 주요 서울 아파트 단지 샘플 데이터 생성 스크립트.
# 실제 운영 환경에서는 별도의 브라우저 자동화(Selenium 등)를 통해 
# 단지 고유번호(hscpNo) 리스트를 주기적으로 갱신하여 이 파일 포맷에 맞춰 저장해야 합니다.

DATA = {
    "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "total_complexes": 10,
    "description": "API 차단으로 인한 샘플 단지 리스트 (송파, 강남, 마포, 용산 등 주요 단지)",
    "complexes": [
        {"guName": "송파구", "dongName": "가락동", "complexNo": "108364", "complexName": "헬리오시티"},
        {"guName": "마포구", "dongName": "아현동", "complexNo": "100918", "complexName": "마포래미안푸르지오(4단지)"},
        {"guName": "강남구", "dongName": "도곡동", "complexNo": "203", "complexName": "타워팰리스1차"},
        {"guName": "서초구", "dongName": "반포동", "complexNo": "26032", "complexName": "반포자이"},
        {"guName": "서초구", "dongName": "반포동", "complexNo": "111515", "complexName": "아크로리버파크"},
        {"guName": "용산구", "dongName": "이촌동", "complexNo": "372", "complexName": "한강대우"},
        {"guName": "강동구", "dongName": "고덕동", "complexNo": "103554", "complexName": "고덕그라시움"},
        {"guName": "노원구", "dongName": "중계동", "complexNo": "136", "complexName": "건영3차"},
        {"guName": "양천구", "dongName": "목동", "complexNo": "394", "complexName": "목동신시가지7단지"},
        {"guName": "성동구", "dongName": "성수동1가", "complexNo": "106206", "complexName": "트리마제"}
    ]
}

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "seoul_complexes.json")

def generate_sample_data():
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(DATA, f, ensure_ascii=False, indent=4)
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {len(DATA['complexes'])}개의 샘플 단지 목록이 생성되었습니다.")
    print(f"-> 저장 경로: {OUTPUT_FILE}")
    print("\n*참고: 실제 환경에서는 discover_complexes.py를 보완하거나 Selenium 기반 수집기로 이 JSON 파일을 채워야 합니다.")

if __name__ == "__main__":
    generate_sample_data()
