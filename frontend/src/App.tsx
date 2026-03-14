import { useState, useEffect, useMemo } from 'react';
import MapComponent from './components/MapComponent';
import type { Complex } from './types';
import { Search, MapPin, Building2, BarChart3, Info } from 'lucide-react';
import './App.css';

function App() {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGu, setSelectedGu] = useState<string>('All');
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);

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
          
          <select 
            className="gu-select"
            value={selectedGu}
            onChange={(e) => setSelectedGu(e.target.value)}
          >
            {guList.map(gu => <option key={gu} value={gu}>{gu}</option>)}
          </select>
        </section>

        <section className="stats-section">
          <div className="stat-card">
            <BarChart3 size={16} className="text-accent" />
            <div>
              <p className="label">탐색된 단지</p>
              <p className="value">{filteredComplexes.length.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <section className="info-panel">
          {selectedComplex ? (
            <div className="selected-card animate-fade-in">
              <h3 className="text-accent">{selectedComplex.n}</h3>
              <div className="info-row">
                <MapPin size={14} />
                <span>{selectedComplex.g} {selectedComplex.d}</span>
              </div>
              <div className="actions">
                <button 
                  onClick={() => window.open(`https://new.land.naver.com/complexes/${selectedComplex.id}`, '_blank')}
                  className="primary-btn"
                >
                  상세 정보 탐색
                </button>
              </div>
            </div>
          ) : (
            <div className="placeholder-card">
              <Info size={24} className="text-muted" />
              <p>지도의 마커를 클릭하여 <br/> 상세 정보를 확인하세요.</p>
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
          onSelect={setSelectedComplex} 
        />
        
        <div className="map-overlay-stats glass-panel">
          <span className="glow-text">Seoul Core: {complexes.length.toLocaleString()} Complexes</span>
        </div>
      </main>
    </div>
  );
}

export default App;
