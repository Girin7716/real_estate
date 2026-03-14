import json
import os

# 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
INPUT_PATH = os.path.join(BASE_DIR, "data", "crawlers", "seoul_complexes.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "frontend", "public", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "complexes.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def process_complexes():
    print(f"Reading {INPUT_PATH}...")
    if not os.path.exists(INPUT_PATH):
        print("Error: Input file not found.")
        return

    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    raw_complexes = data.get('complexes', [])
    processed = []

    for c in raw_complexes:
        processed.append({
            "id": c.get("complexNo"),
            "n": c.get("complexName"),
            "g": c.get("guName"),
            "d": c.get("dongName"),
            "lat": c.get("lat"),
            "lng": c.get("lon")
        })

    print(f"Processed {len(processed)} complexes.")
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(processed, f, ensure_ascii=False)
    
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    process_complexes()
