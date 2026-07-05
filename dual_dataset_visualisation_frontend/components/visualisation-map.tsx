import Map, {Source, Layer, MapRef} from "react-map-gl/maplibre";
import {memo, useCallback, useMemo, useRef} from "react";
import 'maplibre-gl/dist/maplibre-gl.css';
import {Button} from "@/components/ui/button";
import {IconDownload} from "@tabler/icons-react";

interface VisualisationMapProps {
  pdokTiles: string;
  provincesFillBase: any;
  gemeentenFillBase: any;
  bordersGemeenteBase: any;
  bordersProvinceBase: any;
  synthetic?: boolean;
  min: number | string;
  max: number | string;
  values: Record<string, number> | undefined;
  setAreaCode: (code: string) => void;
}

function VisualisationMapInner({
                                 pdokTiles,
                                 provincesFillBase,
                                 gemeentenFillBase,
                                 bordersGemeenteBase,
                                 bordersProvinceBase,
                                 synthetic,
                                 min,
                                 max,
                                 values,
                                 setAreaCode
                               }: VisualisationMapProps) {

  const mapRef = useRef<MapRef|null>(null);

  const valueExpr = useMemo(() => {
    const entries = Object.entries(values ?? {});
    return [
      "match",
      ["get", "identificatie"],
      ...entries.flatMap(([k, v]) => [k, v]),
      -999999, // numeric fallback (NOT null)
    ];
  }, [values]);

  const colorExpr = useMemo(() => {
    let lo = Number(min);
    let hi = Number(max);

    // Fallbacks if inputs are bad
    if (!Number.isFinite(lo)) lo = 0;
    if (!Number.isFinite(hi)) hi = lo + 1;

    // Ensure ascending
    if (hi < lo) [lo, hi] = [hi, lo];

    // Ensure STRICTLY increasing stops
    const range = hi - lo;
    const eps = range === 0 ? 1e-6 : Math.max(range * 1e-6, 1e-9);

    const hiSafe = hi === lo ? lo + 2 * eps : hi;
    const midRaw = (lo + hiSafe) / 2;
    const midSafe =
      midRaw <= lo ? lo + eps :
        midRaw >= hiSafe ? hiSafe - eps :
          midRaw;

    return [
      "case",
      ["==", valueExpr, -999999],
      "#e5e7eb",
      [
        "interpolate",
        ["linear"],
        ["to-number", valueExpr],
        lo, "#dbeafe",
        midSafe, "#60a5fa",
        hiSafe, "#1e40af",
      ],
    ];
  }, [valueExpr, min, max]);

  const provincesFill = useMemo(
    () => ({
      ...provincesFillBase,
      id: provincesFillBase.id + (synthetic ? "-synthetic" : ""),
      paint: {...(provincesFillBase.paint ?? {}), "fill-color": colorExpr},
    }),
    [provincesFillBase, synthetic, colorExpr]
  );

  const gemeentenFill = useMemo(
    () => ({
      ...gemeentenFillBase,
      id: gemeentenFillBase.id + (synthetic ? "-synthetic" : ""),
      paint: {...(gemeentenFillBase.paint ?? {}), "fill-color": colorExpr},
    }),
    [gemeentenFillBase, synthetic, colorExpr]
  );

  const interactiveLayerIds = useMemo(
    () => [provincesFill.id, gemeentenFill.id],
    [provincesFill.id, gemeentenFill.id]
  );

  const bordersGemeente = {
    ...bordersGemeenteBase,
    id: bordersGemeenteBase.id + (synthetic ? "-synthetic" : ""),
  };

  const bordersProvince = {
    ...bordersProvinceBase,
    id: bordersProvinceBase.id + (synthetic ? "-synthetic" : ""),
  };

  const handleDownloadImage = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Optional: wait one frame so the latest render is captured
    map.once("render", () => {
      const canvas = map.getCanvas();
      const url = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = url;
      a.download = "map.png";
      a.click();
    });

    map.triggerRepaint();
  }, []);

  return (
    <>
      <Map
        ref={mapRef}
        mapStyle={{
          version: 8,
          sources: {},
          layers: [
            {
              id: "bg",
              type: "background",
              paint: {"background-color": "#f5f5f5"},
            },
          ],
        }}
        style={{width: "100%", height: "100%"}}
        initialViewState={{
          longitude: 5.3,
          latitude: 52.2,
          zoom: 6.5,
        }}
        minZoom={6}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={(e) => {
          const f = e.features?.[0];
          console.log(f ? f.id : "none");
          if (!f) {
            setAreaCode("");
            return;
          }
          setAreaCode(f.id ? f.id.toString() : "");
        }}
      >
        <Source id="bestuurlijkegebieden" type="vector" tiles={[pdokTiles]} promoteId="identificatie"/>
        <Layer {...provincesFill} />
        <Layer {...gemeentenFill} />
        <Layer {...bordersGemeente} />
        <Layer {...bordersProvince} />
      </Map>
      <Button
        className="absolute top-2 right-2 z-10"
        onClick={handleDownloadImage}
        size="icon"
        variant="outline"
      >
        <IconDownload/>
      </Button>
    </>
  );
}

const VisualisationMap = memo(VisualisationMapInner);
export default VisualisationMap;
