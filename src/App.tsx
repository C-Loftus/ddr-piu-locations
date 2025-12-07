import { useState, useEffect } from "react";
import Map, { Source, Layer, type LngLat, Popup } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  fetchArcades,
  Game,
  type ArcardeResponse,
  type CloudFlareResponse,
} from "./lib";

type FilterOption = "all" | "DDR" | "PIU";

function App() {
  const [arcades, setArcades] = useState<ArcardeResponse[]>([]);
  const [popupInfo, setPopupInfo] = useState<{
    feature: GeoJSON.Feature;
    lngLat: LngLat;
  } | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<GeoJSON.Feature | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchArcades(Game.DANCE_DANCE_REVOLUTION),
      fetchArcades(Game.PUMP_IT_UP),
    ])
      .then(([ddrResp, piuResp]: [CloudFlareResponse, CloudFlareResponse]) => {
        const mapKey = (a: ArcardeResponse) =>
          `${a.latitude.toFixed(5)},${a.longitude.toFixed(5)}`;
        const arcadeMap: Record<
          string,
          ArcardeResponse
        > = {};

        ddrResp.arcades?.forEach((a) => {
          if (!a.latitude || !a.longitude) return;
          arcadeMap[mapKey(a)] = { ...a, ddr: true };
        });

        piuResp.arcades?.forEach((a) => {
          if (!a.latitude || !a.longitude) return;
          const key = mapKey(a);
          if (arcadeMap[key]) arcadeMap[key].piu = true;
          else arcadeMap[key] = { ...a, piu: true };
        });

        const merged = Object.values(arcadeMap);
        if (merged.length === 0)
          throw new Error("No arcades returned from API!");
        setArcades(merged);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredArcades = arcades.filter((a) => {
    if (filter === "all") return true;
    if (filter === "DDR") return a.ddr && !a.piu;
    if (filter === "PIU") return a.piu && !a.ddr;
    return true;
  });

  const arcadeGeoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: filteredArcades.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      properties: {
        name: a.name,
        address: a.address,
        website: a.website,
        ddr: !!a.ddr,
        piu: !!a.piu,
      },
    })),
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Filter Controls and Legend */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "white",
          padding: "8px 12px",
          borderRadius: 6,
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: "bold" }}>Show:</div>
        <button onClick={() => setFilter("all")} style={{ marginRight: 4 }}>
          All{" "}
        </button>
        <button onClick={() => setFilter("DDR")} style={{ marginRight: 4, backgroundColor: "#ff006e" }}>
          DDR{" "}
        </button>
        <button onClick={() => setFilter("PIU")} style={{ backgroundColor: "#006eff" }}>PIU</button>

        <div style={{ marginTop: 10 }} className="maplibregl-legend-label">
          <div>
            <span style={{ color: "#ff006e", fontWeight: "bold" }}>●</span> DDR
            only
          </div>
          <div>
            <span style={{ color: "#006eff", fontWeight: "bold" }}>●</span> PIU
            only
          </div>
          <div>
            <span style={{ color: "#800080", fontWeight: "bold" }}>●</span> Both
            DDR + PIU
          </div>
        </div>
      </div>

      <Map
        mapLib={maplibregl}
        style={{ width: "100vw", height: "100vh" }}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        interactiveLayerIds={["arcades-circle"]}
        minZoom={2}
        attributionControl={{
          compact: true,
          customAttribution: "Arcade data from zenius-i-vanisher.com",
        }}
        onClick={(e) => {
          if (!e.features || e.features.length === 0) return setPopupInfo(null);
          setPopupInfo({
            feature: e.features[0],
            lngLat: maplibregl.LngLat.convert(e.lngLat),
          });
        }}
        onDblClick={(e) => {
          if (!e.features || e.features.length === 0) return setPopupInfo(null);
          setPopupInfo({
            feature: e.features[0],
            lngLat: maplibregl.LngLat.convert(e.lngLat),
          });
        }}
        onMouseMove={(e) => {
          if (e.features && e.features.length > 0)
            setHoveredFeature(e.features[0]);
          else setHoveredFeature(null);
        }}
      >
        {filteredArcades.length > 0 && (
          <Source id="arcades" type="geojson" data={arcadeGeoJson}>
            <Layer
              id="arcades-circle"
              type="circle"
              paint={{
                "circle-radius": 9,
                "circle-color": [
                  "case",
                  ["all", ["get", "ddr"], ["get", "piu"]],
                  "#800080",
                  ["get", "ddr"],
                  "#ff006e",
                  ["get", "piu"],
                  "#006eff",
                  "#aaaaaa",
                ],
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
              }}
            />
          </Source>
        )}

        {/* Hover Tooltip */}
        {hoveredFeature && hoveredFeature.geometry.type === "Point" && (
          <Popup
            anchor="top"
            longitude={
              (hoveredFeature.geometry as GeoJSON.Point).coordinates[0]
            }
            latitude={(hoveredFeature.geometry as GeoJSON.Point).coordinates[1]}
            closeButton={false}
            closeOnClick={false}
            offset={10}
          >
            <div style={{ fontWeight: "bold" }}>
              {hoveredFeature.properties?.name || "Unknown"}
            </div>
          </Popup>
        )}

        {/* Click/DblClick Popup as Formatted Table */}
        {popupInfo && popupInfo.feature.properties && (
          <Popup
            anchor="top"
            longitude={popupInfo.lngLat.lng}
            latitude={popupInfo.lngLat.lat}
            closeButton
            onClose={() => setPopupInfo(null)}
          >
            <table style={{ borderCollapse: "collapse", minWidth: 250 }}>
              <tbody>
                {Object.entries(popupInfo.feature.properties).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td
                        style={{
                          fontWeight: "bold",
                          border: "1px solid #ccc",
                          padding: "4px 6px",
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: "4px 6px",
                        }}
                      >
                        {String(value)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Popup>
        )}

        {loading && (
          <div style={{ position: "absolute", top: 10, left: 10 }}>
            Loading arcades...
          </div>
        )}
      </Map>
    </div>
  );
}

export default App;
