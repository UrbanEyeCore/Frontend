import React from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const statusConfig = {
  NEW: { label: 'Queued', mapColor: '#FF9933' }, // Saffron
  UNDER_REVIEW: { label: 'Assessment', mapColor: '#3b82f6' }, // Light Blue
  IN_PROGRESS: { label: 'Dispatched', mapColor: '#2563eb' }, // Blue
  RESOLVED: { label: 'Complete', mapColor: '#138808' }, // Green
};

const mapDefaults = {
  center: [20.5937, 78.9629], // India
  zoom: 5,
};

export default function DashboardMap({ issues, userLocation, community }) {
  // Ensure we safely pull out reports possessing actual numeric coordinates natively
  const reportsWithCoordinates = issues
    .filter(
      (report) =>
        report.latitude != null &&
        report.longitude != null &&
        !Number.isNaN(Number(report.latitude)) &&
        !Number.isNaN(Number(report.longitude))
    )
    .map((report) => ({
      ...report,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
    }));

  const communityCenter = community?.centerLatitude && community?.centerLongitude
    ? [Number(community.centerLatitude), Number(community.centerLongitude)]
    : null;

  const center =
    reportsWithCoordinates.length > 0
      ? [reportsWithCoordinates[0].latitude, reportsWithCoordinates[0].longitude]
      : communityCenter || userLocation || mapDefaults.center;

  const zoom =
    reportsWithCoordinates.length > 0 ? 13 : communityCenter ? 11 : userLocation ? 12 : mapDefaults.zoom;

  return (
    <div className="relative z-0 overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm mt-6 mb-6">
      <div className="h-[360px] w-full">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Community Authorized Boundary Circle */}
          {communityCenter && (
            <Circle
              center={communityCenter}
              radius={Number(community.allowedRadiusMeters) || 35000}
              pathOptions={{
                color: '#1e3a8a',
                fillColor: '#3b82f6',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-[#1e3a8a]">{community.name} Authorized Jurisdiction</p>
                  <p className="text-gray-500 text-[10px]">
                    Radius: {((Number(community.allowedRadiusMeters) || 35000) / 1000).toFixed(0)} km
                  </p>
                </div>
              </Popup>
            </Circle>
          )}

          {userLocation ? (
            <CircleMarker
              center={userLocation}
              radius={9}
              pathOptions={{ color: '#0f172a', fillColor: '#1e3a8a', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                 <span className="font-bold text-[#1e3a8a] text-xs uppercase tracking-widest">You are here</span>
              </Popup>
            </CircleMarker>
          ) : null}

          {reportsWithCoordinates.map((report) => (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={11}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: statusConfig[report.status]?.mapColor || '#FF9933',
                fillOpacity: 0.95,
              }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold font-serif text-[#1e3a8a] text-sm leading-tight">{report.title}</p>
                  <p className="mt-1 text-xs text-gray-500 font-medium">{report.address || 'Unknown Location'}</p>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-widest inline-block px-2 py-0.5 rounded border" style={{ borderColor: statusConfig[report.status]?.mapColor || '#FF9933', color: statusConfig[report.status]?.mapColor || '#FF9933' }}>
                    {statusConfig[report.status]?.label || report.status || 'General'}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
