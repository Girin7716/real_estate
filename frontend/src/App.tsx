import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// API 응답 데이터 타입
interface RealEstateData {
    "고유번호": string
    "거래유형": string
    "단지명": string
    "매물가격": number
    "월세가격": number
    "공급면적(m2)": number
    "전용면적(m2)": number
    "층수": string
    "방향": string
    "특징": string
    "URL": string
}

function App() {
    const [data, setData] = useState<RealEstateData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 상태: 필터링 (최대 자본금 한도)
    const [maxPrice, setMaxPrice] = useState<number>(200000) // 기본 20억(단위: 만원) 설정

    useEffect(() => {
        // 로컬 FastAPI 서버(기본 포트 8000) 호출
        axios.get('http://127.0.0.1:8000/api/real-estate')
            .then(response => {
                if (response.data.status === 'success') {
                    setData(response.data.data)
                } else {
                    setError(response.data.message)
                }
            })
            .catch(err => {
                console.error("API 연동 에러:", err)
                setError('FastAPI 서버와 통신할 수 없습니다. 서버가 켜져 있는지 확인하세요.')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    // 가격 필터링 로직: 매매가 또는 전세가가 maxPrice 이하인 데이터만
    const filteredData = data.filter(item => {
        // CSV 수집 시 "매물가격"이 int 형태이길 기대하나 구조에 따라 문자열일 수 있어 안전하게 파싱
        const priceStr = String(item['매물가격'] || '0').replace(/,/g, '')
        const price = parseInt(priceStr, 10)
        return price <= maxPrice
    })

    // 화면 렌더링
    return (
        <div className="container">
            <header className="header">
                <h1>🏙️ Seoul Real Estate Local Dashboard</h1>
                <p>네이버 부동산 데이터 기반 내 자본 맞춤형 시각화 도구</p>
            </header>

            {error && <div className="error-box">{error}</div>}

            {!loading && !error && (
                <main className="main-content">
                    <div className="sidebar">
                        <div className="filter-section">
                            <h3>💰 자본금 필터링 제한</h3>
                            <p className="filter-desc">
                                현재 자본금: <strong>{(maxPrice / 10000).toFixed(1)}억 원</strong>
                            </p>
                            <input
                                type="range"
                                min="10000"
                                max="300000"
                                step="5000"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="price-slider"
                            />
                        </div>

                        <div className="stats-section">
                            <h3>전체 수집 데이터: {data.length} 건</h3>
                            <h3>필터링된 매물: {filteredData.length} 건</h3>
                        </div>
                    </div>

                    <div className="data-grid-section">
                        <h2>필터링된 매물 리스트 (샘플)</h2>
                        <div className="card-grid">
                            {filteredData.length === 0 ? (
                                <p>해당 자본금으로 접근 가능한 매물이 수집된 데이터에 없습니다.</p>
                            ) : (
                                filteredData.slice(0, 12).map((item, idx) => (
                                    <div key={idx} className="property-card">
                                        <span className="badge type">{item['거래유형']}</span>
                                        <h4>{item['단지명']}</h4>
                                        <p className="price">가격: {item['매물가격']} 만원</p>
                                        <p className="details">
                                            면적: {item['전용면적(m2)']}㎡ | 층수: {item['층수']}
                                        </p>
                                        <p className="desc">{item['특징']}</p>
                                        {item['URL'] && (
                                            <a href={item['URL']} target="_blank" rel="noreferrer" className="link-btn">
                                                매물 보러가기 ↗
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            )}

            {loading && <div className="loading">데이터 세팅 중... FastAPI 서버 응답을 대기합니다.</div>}
        </div>
    )
}

export default App
