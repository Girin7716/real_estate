import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, TrendingDown, Filter, Navigation, ExternalLink } from 'lucide-react';
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
}

// Google Fonts 임포트 (index.html 또는 CSS 상단에 추가 권장)
// @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@500;700;800&display=swap');

function App() {
  const [listings, setListings] = useState<RankedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(200000); 
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedListing, setSelectedListing] = useState<RankedListing | null>(null);
  
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('urgent_sales')
        .select('*')
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
      return matchesSearch && matchesPrice && matchesArea;
    });
  }, [listings, searchTerm, maxPrice, selectedArea]);

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
            
            <div className="filter-row">
              <select 
                className="gu-select"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                {areaList.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
              <div className="count-pill glass-pill shine-effect">
                  {filteredListings.length.toLocaleString()}건 매물
              </div>
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
                          selectedListing?.article_no === l.article_no && "active"
                        )}
                        style={{animationDelay: `${idx * 0.05}s`}}
                        onClick={() => setSelectedListing(l)}
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
