"use client";

import VisualisationMap from "@/components/visualisation-map";
import {Card, CardContent, CardTitle} from "@/components/ui/card";
import {useCallback, useEffect, useMemo, useState} from "react";
import {API} from "@/lib/api";

interface MapsContainerProps {
  level: string;
  values: Visualisation;
}

export default function MapsContainer({level, values}: MapsContainerProps) {
  const [areaCode, setAreaCode] = useState("");
  const [areas, setAreas] = useState<Municipality[] | Province[]>([]);

  useEffect(() => {
    const fetchAreas = async () => {
      let response: Municipality[] | Province[] = [];
      if (level === "province") {
        response = await API.getProvinces();
      }
      if (level === "municipality") {
        response = await API.getMunicipalities();
      }
      setAreas(response);
    }

    fetchAreas();
  }, [level]);

  const onHoverArea = useCallback((id: string) => {
    setAreaCode(id);
  }, []);

  const pdokTiles = useMemo(
    () =>
      "https://api.pdok.nl/kadaster/bestuurlijkegebieden/ogc/v1/tiles/WebMercatorQuad/{z}/{y}/{x}?f=mvt",
    []
  );

  const plainValues = useMemo(
    () => [
      ...Object.values(values.original ?? {}),
      ...Object.values(values.synthetic ?? {}),
    ] as number[],
    [values]
  );

  const min = useMemo(() => Math.min(...plainValues), [plainValues]);
  const max = useMemo(() => Math.max(...plainValues), [plainValues]);

  const provincesFillBase = useMemo(
    () => ({
      id: "provincies-fill",
      type: "fill",
      source: "bestuurlijkegebieden",
      "source-layer": "provinciegebied",
      paint: {"fill-opacity": 0.8, "fill-color": "#888888"},
    }),
    []
  );

  const gemeentenFillBase = useMemo(
    () => ({
      id: "gemeenten-fill",
      type: "fill",
      source: "bestuurlijkegebieden",
      "source-layer": "gemeentegebied",
      paint: {"fill-opacity": 0.5},
      layout: {visibility: level === "municipality" ? "visible" : "none"},
    }),
    [level]
  );

  const bordersProvinceBase = useMemo(
    () => ({
      id: "bordersprovince",
      type: "line",
      source: "bestuurlijkegebieden",
      "source-layer": "provinciegebied",
      paint: {"line-width": 0.5},
      layout: {visibility: level === "province" ? "visible" : "none"},
    }),
    [level]
  );

  const bordersGemeenteBase = useMemo(
    () => ({
      id: "bordersgemeente",
      type: "line",
      source: "bestuurlijkegebieden",
      "source-layer": "gemeentegebied",
      paint: {"line-width": 0.5},
      layout: {visibility: level === "municipality" ? "visible" : "none"},
    }),
    [level]
  );

  return (
    <div className="grid grid-cols-2 gap-6">
      {Boolean(values.difference) ? (
        <Card className="h-[80vh]">
          <CardContent className="flex flex-col h-full">
            <div className="flex-grow-1 relative">
              {areaCode && (
                <Card className="absolute top-2 left-2 z-10">
                  <CardContent>
                    <CardTitle className="!font-medium mb-2">
                      {areas.find((a) => a.code === areaCode) ? areas.find((a) => a.code === areaCode)?.name : areaCode}
                      <>
                        {areas.find((a) => a.code === areaCode)?.hasOwnProperty("province") && (
                          <span
                            className="block text-xs text-gray-500"
                          >
                          Provincie {(areas.find((a) => a.code === areaCode) as Municipality).province.name}
                        </span>
                        )}
                      </>
                    </CardTitle>
                    <>
                      {values.difference?.hasOwnProperty(areaCode) ? (
                        <span className="text-blue-800 font-bold">{values.difference?.[areaCode]?.toFixed(3)}</span>
                      ) : "No data"}
                    </>
                  </CardContent>
                </Card>
              )}
              <VisualisationMap
                pdokTiles={pdokTiles}
                provincesFillBase={provincesFillBase}
                gemeentenFillBase={gemeentenFillBase}
                bordersGemeenteBase={bordersGemeenteBase}
                bordersProvinceBase={bordersProvinceBase}
                min={min}
                max={max}
                values={values.difference}
                synthetic={false}
                setAreaCode={onHoverArea}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="h-[80vh]">
            <CardContent className="flex flex-col h-full">
              <CardTitle className="mb-3">Original</CardTitle>
              <div className="flex-grow-1 relative">
                {areaCode && (
                  <Card className="absolute top-2 left-2 z-10">
                    <CardContent>
                      <CardTitle className="!font-medium mb-2">
                        {areas.find((a) => a.code === areaCode) ? areas.find((a) => a.code === areaCode)?.name : areaCode}
                        <>
                          {areas.find((a) => a.code === areaCode)?.hasOwnProperty("province") && (
                            <span
                              className="block text-xs text-gray-500"
                            >
                          Provincie {(areas.find((a) => a.code === areaCode) as Municipality).province.name}
                        </span>
                          )}
                        </>
                      </CardTitle>
                      <>
                        {values.original?.hasOwnProperty(areaCode) ? (
                          <span className="text-blue-800 font-bold">{values.original?.[areaCode]?.toFixed(3)}</span>
                        ) : "No data"}
                      </>
                    </CardContent>
                  </Card>
                )}
                <VisualisationMap
                  pdokTiles={pdokTiles}
                  provincesFillBase={provincesFillBase}
                  gemeentenFillBase={gemeentenFillBase}
                  bordersGemeenteBase={bordersGemeenteBase}
                  bordersProvinceBase={bordersProvinceBase}
                  min={min}
                  max={max}
                  values={values.original}
                  synthetic={false}
                  setAreaCode={onHoverArea}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="h-[80vh]">
            <CardContent className="flex flex-col h-full">
              <CardTitle className="mb-3">Synthetic</CardTitle>
              <div className="flex-grow-1 relative">
                {areaCode && (
                  <Card className="absolute top-2 left-2 z-10">
                    <CardContent>
                      <CardTitle className="!font-medium mb-2">
                        {areas.find((a) => a.code === areaCode) ? areas.find((a) => a.code === areaCode)?.name : areaCode}
                        <>
                          {areas.find((a) => a.code === areaCode)?.hasOwnProperty("province") && (
                            <span
                              className="block text-xs text-gray-500"
                            >
                          Provincie {(areas.find((a) => a.code === areaCode) as Municipality).province.name}
                        </span>
                          )}
                        </>
                      </CardTitle>
                      <>
                        {values.synthetic?.hasOwnProperty(areaCode) ? (
                          <span className="text-blue-800 font-bold">{values.synthetic?.[areaCode]?.toFixed(3)}</span>
                        ) : "No data"}
                      </>
                    </CardContent>
                  </Card>
                )}
                <VisualisationMap
                  pdokTiles={pdokTiles}
                  provincesFillBase={provincesFillBase}
                  gemeentenFillBase={gemeentenFillBase}
                  bordersGemeenteBase={bordersGemeenteBase}
                  bordersProvinceBase={bordersProvinceBase}
                  min={min}
                  max={max}
                  values={values.synthetic}
                  synthetic={true}
                  setAreaCode={onHoverArea}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}