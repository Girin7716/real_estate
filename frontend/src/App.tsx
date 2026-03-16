import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, TrendingDown, Filter, Navigation, ExternalLink, MapPin } from 'lucide-react';
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
              placeholder="단지명 검색..." 
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
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-base truncate flex-1 pr-2">{l.complex_name}</h4>
                            </div>
                            <div className="flex gap-2 text-xs text-muted mb-2">
                                <span className={cn("px-1.5 py-0.5 rounded-md font-medium", 
                                    l.trade_type === '매매' ? 'bg-blue-500/20 text-blue-400' : 
                                    l.trade_type === '전세' ? 'bg-green-500/20 text-green-400' : 
                                    'bg-accent/20 text-accent'
                                )}>{l.trade_type}</span>
                                <span>{Math.floor((l.area_exclusive || 0) * 0.3025)}평</span>
                                <span>{l.floor_info}층</span>
                            </div>
                            <div className="flex justify-between items-end mt-2">
                                <div className="text-lg font-black tracking-tight">{l.price_display}</div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-sm text-muted">
                    검색 조건에 맞는 매물이 없습니다.
                </div>
            )}
          </div>
        </section>
      </aside>

      {/* 우측 메인 영역: 상세 분석 및 트렌드 */}
      <main className="main-content ranking-details">
         <div className="bg-glow"></div>
         {selectedListing ? (
            <section className="detail-panel w-full h-full flex flex-col">
              <div className="selected-detail-card flex-1 flex flex-col min-h-0">
                <div className="detail-header mb-4 shrink-0">
                  <h3 className="text-3xl font-bold">{selectedListing.complex_name}</h3>
                  <span className="text-sm opacity-60">Real-time Ranking Score: {selectedListing.final_score.toFixed(1)}</span>
                </div>
                
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 mb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* 상단 왼쪽: 기본 정보 & 요약 */}
                    <div className="info-column flex flex-col gap-4">
                      <div className="feature-box p-4 rounded-xl bg-white/5 border border-white/10 shrink-0">
                        <p className="feature-text italic text-base text-secondary leading-relaxed">"{selectedListing.features}"</p>
                      </div>
                      
                      <div className="info-grid grid grid-cols-2 gap-3 text-sm shrink-0">
                        <div className="info-item bg-black/20 p-3 rounded-lg border border-white/5 flex items-center gap-2">
                          <Navigation size={16} className="text-accent" />
                          <span className="font-medium">{selectedListing.floor_info}층</span>
                        </div>
                        <div className="info-item bg-black/20 p-3 rounded-lg border border-white/5 flex items-center justify-center font-bold text-accent">
                          {selectedListing.trade_type}
                        </div>
                        <div className="info-item bg-black/20 p-3 rounded-lg border border-white/5 flex items-center gap-2">
                          <span className="opacity-60 text-xs">전용면적</span>
                          <span className="font-medium">{selectedListing.area_exclusive}㎡ ({Math.floor((selectedListing.area_exclusive || 0) * 0.3025)}평)</span>
                        </div>
                        <div className="info-item bg-black/20 p-3 rounded-lg border border-white/5 flex items-center justify-center text-xl font-black tracking-tight">
                          {selectedListing.price_display}
                        </div>
                      </div>
                      
                      {history.length > 1 && (
                        <div className="analytics-metrics grid grid-cols-2 gap-3 mt-2 shrink-0">
                          <div className="metric-card bg-accent/10 border border-accent/20 p-4 rounded-xl">
                            <span className="text-[11px] uppercase opacity-70 block mb-2 tracking-wider">최고가 대비 하락</span>
                            <span className="text-2xl font-black text-accent">
                              -{((Math.max(...history.map(h => h.price_value)) - selectedListing.price_value) / 10000).toFixed(1)}억
                            </span>
                          </div>
                          <div className="metric-card bg-white/5 border border-white/10 p-4 rounded-xl">
                            <span className="text-[11px] uppercase opacity-70 block mb-2 tracking-wider">추적 기간</span>
                            <span className="text-2xl font-black text-white">
                              {Math.ceil((new Date().getTime() - new Date(history[history.length-1].recorded_at).getTime()) / (1000 * 60 * 60 * 24))}일
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 상단 오른쪽: 차트 */}
                    <div className="visual-column flex flex-col h-full">
                      <div className="chart-section bg-white/5 rounded-xl p-6 border border-white/10 flex-col flex h-full min-h-[250px] shrink-0">
                        <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-white/90 shrink-0">
                          <TrendingDown size={16} className="text-accent" />
                          가격 변동 트렌드 (최근 12개월)
                        </h4>
                        <div className="chart-container relative flex-1 min-h-0 flex items-end justify-between gap-2 overflow-hidden">
                          {history.length > 1 ? (
                            <>
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                                {(() => {
                                   const prices = history.map(h => h.price_value);
                                   const min = Math.min(...prices) * 0.98;
                                   const max = Math.max(...prices) * 1.02;
                                   const range = (max - min) || 1;
                                   const points = history.slice().reverse().map((h, i) => {
                                     const x = (i / (Math.max(1, history.length - 1))) * 100;
                                     const y = 100 - ((h.price_value - min) / range) * 100;
                                     return `${x}% ${y}%`;
                                   }).join(', ');
                                   
                                   return (
                                     <>
                                       <polyline
                                         fill="none"
                                         stroke="var(--accent-color)"
                                         strokeWidth="3"
                                         points={points.replace(/%/g, '')}
                                         vectorEffect="non-scaling-stroke"
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
                                <div key={i} className="chart-pillar-hint group relative flex-1 h-full flex items-end justify-center z-10 transition-all">
                                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-black/90 text-xs py-1 px-2 rounded whitespace-nowrap border border-white/20 transition-opacity pointer-events-none backdrop-blur-md">
                                    {(h.price_value / 10000).toFixed(1)}억
                                  </div>
                                  <div className="w-full h-full hover:bg-white/5 transition-colors cursor-crosshair"></div>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="flex w-full h-full items-center justify-center text-sm opacity-50">
                              데이터 축적 중...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 하단 전체 너비: 지도 */}
                  <div className="map-section bg-[#1a1a1a] rounded-xl border border-white/5 min-h-[450px] relative overflow-hidden group shadow-inner mb-2">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(85%) contrast(85%) saturate(0%) grayscale(100%) sepia(10%)' }}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent('서울 ' + selectedListing.complex_name)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                    ></iframe>
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#050811] via-[#050811]/80 to-transparent pointer-events-none flex flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                          <MapPin size={18} className="text-accent" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white leading-none">단지 위치</h4>
                          <p className="text-[10px] text-white/40 mt-1">Girin Urgent Detect AI</p>
                        </div>
                      </div>
                      <button 
                        className="pointer-events-auto text-xs font-bold bg-accent text-black px-4 py-2 rounded-lg hover:bg-accent/80 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
                        onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(selectedListing.complex_name)}`, '_blank')}
                      >
                        카카오맵 열기
                      </button>
                    </div>
                  </div>
                </div>


                <div className="actions">
                  <button 
                    className="premium-btn flex-1"
                    onClick={() => window.open(`https://new.land.naver.com/complexes?articleNo=${selectedListing.article_no}`, '_blank')}
                  >
                    <ExternalLink size={20} />
                    네이버 부동산에서 매물 확인하기
                  </button>
                  <div className="action-row">
                    <button 
                      className="premium-btn flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-xs"
                      onClick={() => window.open(`https://map.kakao.com/?q=${encodeURIComponent(selectedListing.complex_name)}`, '_blank')}
                    >
                      <MapPin size={14} className="text-accent" />
                      카카오맵 상세보기
                    </button>
                    <button 
                      className="premium-btn flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-xs"
                      onClick={() => window.open(`https://m.land.naver.com/search/result/${encodeURIComponent(selectedListing.complex_name)}`, '_blank')}
                    >
                      <Navigation size={14} className="text-secondary" />
                      네이버 지도 검색
                    </button>
                  </div>
                </div>
              </div>
            </section>
         ) : (
            <div className="welcome-banner relative w-full h-full flex flex-col justify-center items-center text-center">
              <span className="top-label mb-4">Live Analytics Dashboard</span>
              <h1 className="hero-text mb-4">Seoul <span className="text-accent">Urgent</span> Sales</h1>
              <p className="hero-subtext mb-12">데이터 사이언스 기반의 서울 아파트 실시간 급매 탐지 및 랭킹 시스템</p>
              
              <div className="insight-grid max-w-2xl w-full mb-12">
                  <div className="insight-card-v2 shine-effect text-center items-center">
                    <span className="text-xs text-muted mb-1">분석된 총 매물</span>
                    <span className="font-black text-2xl">{listings.length}건</span>
                  </div>
                  <div className="insight-card-v2 text-center items-center">
                    <span className="text-xs text-muted mb-1">최근 동기화 시각</span>
                    <span className="text-sm font-mono opacity-80">{lastUpdated || '동기화 중...'}</span>
                  </div>
              </div>

              {listings.length > 0 && (
                <div className="market-trend bg-white/5 p-6 rounded-2xl border border-white/5 cursor-pointer max-w-2xl w-full text-left hover:bg-white/10 transition-colors group"
                     onClick={() => listings[0] && setSelectedListing(listings[0])}>
                    <div className="flex justify-between items-center text-left max-md:flex-col max-md:items-start max-md:gap-4">
                      <div>
                          <h4 className="text-sm font-bold text-accent mb-2 uppercase tracking-wider flex items-center gap-2"><TrendingDown size={16}/> 오늘의 추천 급매물</h4>
                          <p className="text-xl font-black text-white">{listings[0]?.complex_name}</p>
                          <p className="text-sm text-secondary mt-1">{listings[0]?.price_display} <span className="mx-2 opacity-30">|</span> 평형 {Math.floor((listings[0]?.area_exclusive || 0) * 0.3025)}평</p>
                      </div>
                      <div className="text-right max-md:text-left">
                          <div className="price-badge mb-2 bg-accent/20 border-accent/30 text-accent">Urgent Index: {listings[0]?.urgent_index}%</div>
                          <span className="text-sm text-white/50 group-hover:text-accent flex items-center gap-1 justify-end max-md:justify-start transition-colors">
                            상세분석 뷰로 이동 <ExternalLink size={14} />
                          </span>
                      </div>
                    </div>
                </div>
              )}
            </div>
         )}
         <footer className="absolute bottom-6 left-0 right-0 text-center text-xs opacity-40">
            Designed for Premium Real Estate Analysis • Built with Supabase & Vercel
         </footer>
      </main>
    </div>
  );
}

export default App;
