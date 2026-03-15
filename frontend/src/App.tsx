import { useState, useEffect, useMemo, useRef } from 'react';
import MapComponent from './components/MapComponent';
import type { Complex } from './types';
import { Search, MapPin, Building2, Info, Navigation, ExternalLink } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import './App.css';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGu, setSelectedGu] = useState<string>('All');
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/complexes.json`)
      .then(res => res.json())
      .then(data => {
        setComplexes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load complexes:', err);
        setLoading(false);
      });
  }, []);

  const guList = useMemo(() => {
    const gus = new Set(complexes.map(c => c.g));
    return ['All', ...Array.from(gus).sort()];
  }, [complexes]);

  const filteredComplexes = useMemo(() => {
    return complexes.filter(c => {
      const matchesSearch = c.n.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.d.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGu = selectedGu === 'All' || c.g === selectedGu;
      return matchesSearch && matchesGu;
    });
  }, [complexes, searchTerm, selectedGu]);

  const handleComplexSelect = (complex: Complex) => {
    setSelectedComplex(complex);
    // 선택된 항목이 리스트 상단에 보이게 스크롤 (필요시)
    if (listRef.current) {
        // 실제 운영 환경에서는 더 정교한 스크롤 로직이 필요할 수 있음
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p className="glow-text">서울시 부동산 데이터 로드 중...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar glass-panel animate-fade-in">
        <header className="sidebar-header">
          <div className="logo">
            <Building2 className="accent-glow" size={24} />
            <h2 className="glow-text">Seoul Atlas</h2>
          </div>
          <p className="text-secondary text-xs">Premium Real Estate Insights</p>
        </header>

        <section className="search-section">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="단지명 또는 동 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-row">
            <select 
              className="gu-select"
              value={selectedGu}
              onChange={(e) => setSelectedGu(e.target.value)}
            >
              {guList.map(gu => <option key={gu} value={gu}>{gu}</option>)}
            </select>
            <div className="count-pill glass-pill">
                {filteredComplexes.length.toLocaleString()}
            </div>
          </div>
        </section>

        {/* Results List View */}
        <section className="results-list-wrapper" ref={listRef}>
          <div className="results-list">
            {filteredComplexes.length > 0 ? (
                filteredComplexes.slice(0, 100).map((c) => (
                    <div 
                        key={c.id} 
                        className={cn("result-item", selectedComplex?.id === c.id && "active")}
                        onClick={() => handleComplexSelect(c)}
                    >
                        <div className="result-info">
                            <span className="name">{c.n}</span>
                            <span className="address">{c.g} {c.d}</span>
                        </div>
                        <Navigation size={14} className="nav-icon" />
                    </div>
                ))
            ) : (
                <div className="no-results">검색 결과가 없습니다.</div>
            )}
            {filteredComplexes.length > 100 && (
                <p className="list-limit-hint">* 상위 100개 단지만 표시 중입니다. 더 정확히 검색해 주세요.</p>
            )}
          </div>
        </section>

        {/* Detail Action Panel */}
        <section className="detail-panel">
          {selectedComplex ? (
            <div className="selected-detail-card animate-fade-in">
              <div className="detail-header">
                <h3 className="text-accent">{selectedComplex.n}</h3>
                <span className="badge-gu">{selectedComplex.g}</span>
              </div>
              <div className="info-row">
                <MapPin size={14} />
                <span>{selectedComplex.d}</span>
              </div>
              <div className="actions">
                <button 
                  onClick={() => window.open(`https://new.land.naver.com/complexes/${selectedComplex.id}`, '_blank')}
                  className="primary-btn-icon"
                >
                  <ExternalLink size={16} />
                  네이버 부동산 상세 보기
                </button>
              </div>
            </div>
          ) : (
            <div className="placeholder-card">
              <Info size={24} className="text-muted" />
              <p>리스트나 마커를 선택하여 <br/> 상세 정보를 확인하세요.</p>
            </div>
          )}
        </section>

        <footer className="sidebar-footer">
          <p>© 2026 Seoul Real Estate Lab</p>
        </footer>
      </aside>

      {/* Main Content */}
      <main className="map-area">
        <MapComponent 
          complexes={filteredComplexes} 
          selectedComplex={selectedComplex}
          onSelect={handleComplexSelect} 
        />
        
        <div className="map-overlay-stats glass-panel">
          <span className="glow-text">Total Core: {complexes.length.toLocaleString()}</span>
        </div>
      </main>
    </div>
  );
}

export default App;
