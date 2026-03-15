import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, TrendingDown, Filter, Navigation, ExternalLink, Map as MapIcon, MapPin } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@supabase/supabase-js';
import './App.css';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Supabase 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RankedListing {
  article_no: string;
  complex_name: string;
  price_display: string;
  trade_type: string;
  area_supply: number;
  area_exclusive: number;
  floor_info: string;
  features: string;
  url: string;
  price_value: number;
  urgent_index: number;
  final_score: number;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  updated_at: string;
}

interface PriceHistory {
  article_no: string;
  price_value: number;
  recorded_at: string;
}

function App() {
  const [listings, setListings] = useState<RankedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(250000); 
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedListing, setSelectedListing] = useState<RankedListing | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [tradeTypeFilter, setTradeTypeFilter] = useState<string>('매매'); // 기본값 매매
  
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('urgent_sales')
        .select('*')
        .order('is_active', { ascending: false })
        .order('final_score', { ascending: false });

      if (error) {
        console.error('Failed to load listings from Supabase:', error);
      } else {
        setListings(data || []);
        if (data && data.length > 0) {
          const latest = new Date(data[0].updated_at);
          setLastUpdated(latest.toLocaleString('ko-KR'));
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // 선택된 매물의 가격 이력 가져오기
  useEffect(() => {
    if (selectedListing) {
      async function fetchHistory() {
        const { data, error } = await supabase
          .from('price_history')
          .select('*')
          .eq('article_no', selectedListing?.article_no)
          .order('recorded_at', { ascending: false });
        
        if (!error) {
          setHistory(data || []);
        }
      }
      fetchHistory();
    }
  }, [selectedListing]);

  const areaList = useMemo(() => {
    const areas = new Set(listings.map(l => Math.floor(l.area_exclusive * 0.3025).toString() + "평형"));
    return ['All', ...Array.from(areas).sort((a,b) => parseInt(a) - parseInt(b))];
  }, [listings]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchesSearch = l.complex_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = l.price_value <= maxPrice;
      const currentArea = Math.floor(l.area_exclusive * 0.3025).toString() + "평형";
      const matchesArea = selectedArea === 'All' || currentArea === selectedArea;
      const matchesActive = !showOnlyActive || l.is_active;
      const matchesTradeType = tradeTypeFilter === 'All' || l.trade_type === tradeTypeFilter;
      return matchesSearch && matchesPrice && matchesArea && matchesActive && matchesTradeType;
    });
  }, [listings, searchTerm, maxPrice, selectedArea, showOnlyActive, tradeTypeFilter]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p className="glow-text animate-pulse">Supabase Cloud 데이터 동기화 중...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout antialiased">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="logo">
            <TrendingDown className="accent-glow" size={28} />
            <h2 className="glow-text">Seoul Urgent</h2>
          </div>
          <div className="sync-status">
            <span className="status-dot online"></span>
            <p className="text-secondary text-xs">Cloud DB Live Connection</p>
          </div>
        </header>

        <section className="search-section">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="아파트 단지명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filters-container">
            <div className="filter-group">
              <div className="flex justify-between items-center mb-2">
                <label className="flex items-center gap-1"><Filter size={12}/> 내 가용 자산</label>
                <span className="price-badge">최대 {(maxPrice/10000).toFixed(1)}억</span>
              </div>
              <input 
                type="range" 
                min="30000" 
                max="300000" 
                step="5000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="price-slider"
              />
            </div>
            
            <div className="filter-row gap-2">
              <select 
                className="gu-select flex-1"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                {areaList.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
              <div 
                className={cn("count-pill glass-pill shine-effect cursor-pointer whitespace-nowrap", showOnlyActive && "active")}
                onClick={() => setShowOnlyActive(!showOnlyActive)}
              >
                  {showOnlyActive ? '활성' : '전체'} | {filteredListings.length}건
              </div>
            </div>

            <div className="trade-type-filter flex gap-1 mt-2">
              {['All', '매매', '전세', '월세'].map(type => (
                <button
                  key={type}
                  onClick={() => setTradeTypeFilter(type)}
                  className={cn(
                    "filter-chip text-[10px] px-2 py-1 rounded-full transition-all border",
                    tradeTypeFilter === type 
                      ? "bg-accent text-white border-accent" 
                      : "bg-white/5 border-white/10 text-muted hover:bg-white/10"
                  )}
                >
                  {type === 'All' ? '전체' : type}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="results-list-wrapper custom-scrollbar" ref={listRef}>
          <div className="results-list">
            {filteredListings.length > 0 ? (
                filteredListings.map((l, idx) => (
                    <div 
                        key={l.article_no} 
                        className={cn(
                          "result-item ranked", 
                          selectedListing?.article_no === l.article_no && "active",
                          !l.is_active && "inactive"
                        )}
                        style={{animationDelay: `${idx * 0.05}s`}}
                        onClick={() => {
                            setSelectedListing(l);
                            if (window.innerWidth <= 768) {
                              const detailPanel = document.querySelector('.detail-panel');
                              detailPanel?.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                    >
                        <div className="rank-badge-v2">{l.final_score.toFixed(1)}</div>
                        <div className="result-info">
                            <span className="name truncate">{l.complex_name}</span>
                            <div className="price-info">
                              <span className="price">{l.price_display}</span>
                              <span className="area">/ {Math.floor(l.area_exclusive * 0.3025)}평</span>
                            </div>
                        </div>
                        <div className="score-tag-v2">
                           {l.urgent_index > 0 ? `-${l.urgent_index}%` : `BEST`}
                        </div>
                    </div>
                ))
            ) : (
                <div className="no-results py-10 opacity-50 text-center">조건에 맞는 급매물이 없습니다.</div>
            )}
          </div>
        </section>

        <section className="detail-panel">
          {selectedListing ? (
            <div className="selected-detail-card">
              <div className="detail-header mb-4">
                <h3 className="text-xl font-bold">{selectedListing.complex_name}</h3>
                <span className="text-xs opacity-50">Real-time Ranking Score: {selectedListing.final_score.toFixed(1)}</span>
              </div>
              <div className="feature-box p-3 rounded-lg border border-white/5 mb-4">
                <p className="feature-text italic text-sm text-secondary">"{selectedListing.features}"</p>
              </div>
              <div className="info-grid grid grid-cols-2 gap-2 text-xs mb-6">
                <div className="flex items-center gap-1">
                  <Navigation size={12} className="text-accent" />
                  <span>{selectedListing.floor_info}층</span>
                </div>
                <div className="text-right">{selectedListing.trade_type}</div>
              </div>

              {/* 가격 변동 분석 지표 */}
              {history.length > 1 && (
                <div className="analytics-metrics grid grid-cols-2 gap-3 mb-6">
                  <div className="metric-card bg-accent/10 border border-accent/20 p-3 rounded-lg">
                    <span className="text-[10px] uppercase opacity-60 block mb-1">최고가 대비 하락</span>
                    <span className="text-sm font-bold text-accent">
                      -{((Math.max(...history.map(h => h.price_value)) - selectedListing.price_value) / 10000).toFixed(1)}억
                    </span>
                  </div>
                  <div className="metric-card bg-white/5 border border-white/10 p-3 rounded-lg">
                    <span className="text-[10px] uppercase opacity-60 block mb-1">추적 기간</span>
                    <span className="text-sm font-bold">
                      {Math.ceil((new Date().getTime() - new Date(history[history.length-1].recorded_at).getTime()) / (1000 * 60 * 60 * 24))}일째
                    </span>
                  </div>
                </div>
              )}

              {/* 가격 변동 SVG 차트 */}
              <div className="chart-section mb-6">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <TrendingDown size={14} className="text-accent" />
                  가격 변동 트렌드
                </h4>
                <div className="chart-container bg-white/5 rounded-xl p-4 border border-white/5 h-32 relative flex items-end justify-between gap-1 overflow-hidden">
                  {history.length > 1 ? (
                    <>
                      {/* 간단한 SVG 라인 차트 구현 */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {(() => {
                          const prices = history.map(h => h.price_value);
                          const min = Math.min(...prices) * 0.98;
                          const max = Math.max(...prices) * 1.02;
                          const range = max - min;
                          const points = history.slice().reverse().map((h, i) => {
                            const x = (i / (history.length - 1)) * 100;
                            const y = 100 - ((h.price_value - min) / range) * 100;
                            return `${x}% ${y}%`;
                          }).join(', ');
                          
                          return (
                            <>
                              <polyline
                                fill="none"
                                stroke="var(--accent-color)"
                                strokeWidth="2"
                                points={points.replace(/%/g, '')}
                                vectorEffect="non-scaling-stroke"
                                style={{ transform: 'scale(1, 1)' }}
                              />
                              <polygon
                                fill="url(#chartGradient)"
                                points={`0,100 ${points.replace(/%/g, '')} 100,100`}
                                vectorEffect="non-scaling-stroke"
                              />
                            </>
                          );
                        })()}
                      </svg>
                      {history.slice(0, 5).reverse().map((h, i) => (
                        <div key={i} className="chart-pillar-hint group relative flex-1 h-full flex items-end">
                           <div className="pillar-bar w-1 bg-accent/20 h-[50%] mx-auto rounded-t transition-all group-hover:bg-accent"></div>
                           <div className="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black text-[10px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             {(h.price_value/10000).toFixed(1)}억
                           </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full opacity-20">
                      <TrendingDown size={24} />
                      <p className="text-[10px] mt-1">데이터 축적 중...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 지도 보기 섹션 추가 */}
              <div className="map-section mb-6">
                 <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <MapIcon size={14} className="text-accent" />
                  매물 위치 확인
                </h4>
                <div 
                  className="map-container relative h-32 rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer"
                  onClick={() => {
                    if (selectedListing.latitude && selectedListing.longitude) {
                      window.open(`https://map.kakao.com/link/map/${selectedListing.complex_name},${selectedListing.latitude},${selectedListing.longitude}`, '_blank');
                    } else {
                      window.open(`https://map.kakao.com/?q=${encodeURIComponent(selectedListing.complex_name)}`, '_blank');
                    }
                  }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent/5 gap-2 group-hover:bg-accent/10 transition-colors">
                    <MapPin className="text-accent animate-bounce" size={24} />
                    <span className="text-[10px] font-bold opacity-60">클릭하여 지도 상세보기</span>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[9px] px-2 py-1 rounded text-white border border-white/10">
                    대략적인 위치 (단지 중심)
                  </div>
                </div>
              </div>

              {/* 가격 변동 히스토리 리스트 */}
              <div className="history-section mb-6">
                <div className="history-list space-y-2">
                  {history.length > 0 ? (
                    history.map((h, i) => (
                      <div key={i} className="history-item flex justify-between items-center p-2 rounded bg-white/5 border-l-2 border-accent">
                        <span className="text-xs opacity-70">{new Date(h.recorded_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          {i < history.length - 1 && history[i].price_value < history[i+1].price_value && (
                            <span className="text-[9px] text-accent font-bold px-1 bg-accent/10 rounded">하락</span>
                          )}
                          <span className="font-bold text-sm">{(h.price_value/10000).toFixed(1)}억</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs opacity-40 italic">기록된 변동 이력이 없습니다.</p>
                  )}
                </div>
              </div>

              <div className="actions">
                <button 
                  onClick={() => window.open(selectedListing.url, '_blank')}
                  className="premium-btn shine-effect"
                >
                  <ExternalLink size={18} />
                  네이버 부동산 확인
                </button>
              </div>
            </div>
          ) : (
            <div className="placeholder-card flex flex-col items-center justify-center opacity-30 h-full">
              <TrendingDown size={48} className="mb-4" />
              <p className="text-center font-medium">급매 후보를 선택하여<br/>상세 분석 리포트를 확인하세요.</p>
            </div>
          )}
        </section>
      </aside>

      <main className="ranking-details">
         <div className="bg-glow"></div>
         <div className="welcome-banner relative">
            <span className="top-label">Live Analytics Dashboard</span>
            <h1 className="hero-text">Seoul <span className="text-accent">Urgent</span> Sales</h1>
            <p className="hero-subtext">데이터 사이언스 기반의 서울 아파트 실시간 급매 탐지 및 랭킹 시스템</p>
            
            <div className="insight-grid">
               <div className="insight-card-v2 shine-effect">
                  <span className="text-xs text-muted">분석된 총 매물</span>
                  <span className="font-black text-xl">{listings.length}건</span>
               </div>
               <div className="insight-card-v2">
                  <span className="text-xs text-muted">최근 동기화 시각</span>
                  <span className="text-sm font-mono opacity-80">{lastUpdated || '동기화 중...'}</span>
               </div>
            </div>

            <div className="market-trend">
               <div className="flex justify-between items-end">
                  <div className="text-left">
                     <h4 className="text-sm font-bold text-muted mb-2 uppercase tracking-wider">오늘의 최고 급매물</h4>
                     <p className="text-2xl font-black text-white">{listings[0]?.complex_name || '분석 대기 중'}</p>
                     <p className="text-sm text-secondary mt-1">{listings[0]?.price_display} | {Math.floor((listings[0]?.area_exclusive || 0) * 0.3025)}평형</p>
                  </div>
                  <div className="text-right">
                     <div className="price-badge mb-2">Urgent Index: {listings[0]?.urgent_index}%</div>
                     <button 
                       className="text-xs text-accent hover:underline flex items-center gap-1 justify-end cursor-pointer"
                       onClick={() => listings[0] && setSelectedListing(listings[0])}
                     >
                       상세보기 <ExternalLink size={10} />
                     </button>
                  </div>
               </div>
            </div>
         </div>
         <footer>
            Designed for Premium Real Estate Analysis • Built with Supabase & Vercel
         </footer>
      </main>
    </div>
  );
}

export default App;
