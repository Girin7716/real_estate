import asyncio
import subprocess
import sys
import os

def run_command(command):
    print(f"Executing: {command}")
    process = subprocess.Popen(command, shell=True)
    process.wait()
    if process.returncode != 0:
        print(f"Error executing: {command}")
        return False
    return True

async def main():
    print("=== [Real Estate Data Pipeline: Sync All] ===")
    
    # 1. Run Crawler
    print("\n[Step 1/2] Data Collection (Crawling)...")
    # Using sys.executable to ensure we use the same environment
    if not run_command(f'"{sys.executable}" data\\crawlers\\naver_crawler.py --once'):
        print("Crawler failed. Aborting.")
        return

    # 2. Run Analysis & Upload
    print("\n[Step 2/2] Data Analysis & Supabase Upload...")
    if not run_command(f'"{sys.executable}" scripts\\analyze_urgent_sales.py'):
        print("Analysis & Upload failed.")
        return

    print("\n✅ All processes completed successfully!")
    print("Check your dashboard at: https://frontend-seven-psi-94.vercel.app/")

if __name__ == "__main__":
    asyncio.run(main())
