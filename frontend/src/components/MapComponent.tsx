import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Complex } from '../types';

interface MapComponentProps {
    complexes: Complex[];
    onSelect: (complex: Complex) => void;
}

const MapComponent = ({ complexes, onSelect }: MapComponentProps) => {
    // 서울 중심점
    const center: [number, number] = [37.5665, 126.9780];

    return (
        <MapContainer
            center={center}
            zoom={11}
            style={{ height: '100%', width: '100%', background: '#0d1117' }}
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            {complexes.map((c) => (
                <CircleMarker
                    key={c.id}
                    center={[c.lat, c.lng]}
                    radius={3}
                    pathOptions={{
                        fillColor: '#00f2ff',
                        color: '#00f2ff',
                        weight: 1,
                        opacity: 0.6,
                        fillOpacity: 0.4
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
        </MapContainer>
    );
};

export default MapComponent;
