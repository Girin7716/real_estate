import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import type { Complex } from '../types';
import { useEffect } from 'react';

interface MapComponentProps {
    complexes: Complex[];
    selectedComplex: Complex | null;
    onSelect: (complex: Complex) => void;
}

// 지도 위치를 수동으로 조정하기 위한 내부 컴포넌트
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

const MapComponent = ({ complexes, selectedComplex, onSelect }: MapComponentProps) => {
    // 서울 중심점 (기본값)
    const defaultCenter: [number, number] = [37.5665, 126.9780];
    const defaultZoom = 11;

    // 선택된 단지가 있으면 그 위치로 이동, 없으면 서울 중심
    const center = selectedComplex ? [selectedComplex.lat, selectedComplex.lng] as [number, number] : defaultCenter;
    const zoom = selectedComplex ? 16 : defaultZoom;

    return (
        <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%', background: '#0d1117' }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            
            <ChangeView center={center} zoom={zoom} />

            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
                {complexes.map((c) => (
                    <CircleMarker
                        key={c.id}
                        center={[c.lat, c.lng]}
                        radius={selectedComplex?.id === c.id ? 8 : 4}
                        pathOptions={{
                            fillColor: selectedComplex?.id === c.id ? '#ffffff' : '#00f2ff',
                            color: selectedComplex?.id === c.id ? '#00f2ff' : '#00f2ff',
                            weight: selectedComplex?.id === c.id ? 2 : 1,
                            opacity: 1,
                            fillOpacity: selectedComplex?.id === c.id ? 0.9 : 0.6
                        }}
                        eventHandlers={{
                            click: () => onSelect(c)
                        }}
                    >
                        <Popup className="premium-popup">
                            <div style={{ minWidth: '150px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#00f2ff' }}>{c.n}</h4>
                                <p style={{ margin: '0', fontSize: '12px', color: '#9198a1' }}>
                                    {c.g} {c.d}
                                </p>
                                <button 
                                    onClick={() => window.open(`https://new.land.naver.com/complexes/${c.id}`, '_blank')}
                                    style={{
                                        marginTop: '12px',
                                        width: '100%',
                                        padding: '6px',
                                        background: 'rgba(0, 242, 255, 0.1)',
                                        border: '1px solid rgba(0, 242, 255, 0.3)',
                                        color: '#00f2ff',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                    }}
                                >
                                    네이버 부동산 보기
                                </button>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
};

export default MapComponent;
