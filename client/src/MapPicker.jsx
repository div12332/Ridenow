import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'

const initialCenter = [37.7749, -122.4194]

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

function Recenter({ coordinates }) {
  const map = useMap()
  useEffect(() => {
    if (coordinates) map.flyTo(coordinates, Math.max(map.getZoom(), 13), { duration: 0.5 })
  }, [coordinates, map])
  return null
}

export default function MapPicker({ pickup, destination, onSelect }) {
  const center = useMemo(() => pickup || destination || initialCenter, [pickup, destination])

  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={12} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter coordinates={pickup || destination} />
        <ClickHandler onSelect={onSelect} />
        {pickup && <CircleMarker center={pickup} radius={9} pathOptions={{ color: '#16694a', fillColor: '#53d69a', fillOpacity: 1 }} />}
        {destination && <CircleMarker center={destination} radius={9} pathOptions={{ color: '#b6533e', fillColor: '#ff9275', fillOpacity: 1 }} />}
      </MapContainer>
      <div className="map-hint"><span className="dot pickup-dot" /> Pickup <span className="dot destination-dot" /> Drop-off</div>
    </div>
  )
}
