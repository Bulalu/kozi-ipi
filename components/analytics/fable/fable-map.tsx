"use client"

import { useMemo, useRef, useState, type PointerEvent } from "react"

import type { TanzaniaRegionsGeoJson } from "@/lib/analytics/types"

import {
  buildGeometryPath,
  buildQuantileScale,
  MAP_NO_DATA,
  MAP_RAMP,
  normalizeRegionKey,
} from "./fable-data"
import styles from "./fable.module.css"

export type MapRegionValue = {
  key: string
  name: string
  value: number | null
  detail: Array<{ label: string; value: string }>
}

type FableMapProps = {
  geo: TanzaniaRegionsGeoJson
  valuesByRegion: Map<string, MapRegionValue>
  formatValue: (value: number) => string
  metricLabel: string
  hoveredRegion: string | null
  onHoverRegion: (key: string | null) => void
}

type TooltipState = {
  regionKey: string
  x: number
  y: number
}

const MAP_WIDTH = 720

export function FableMap({
  geo,
  valuesByRegion,
  formatValue,
  metricLabel,
  hoveredRegion,
  onHoverRegion,
}: FableMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { shapes, mapHeight } = useMemo(() => {
    let minLon = Infinity
    let maxLon = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity
    const walk = (coordinates: unknown): void => {
      if (typeof (coordinates as number[])[0] === "number") {
        const [lon, lat] = coordinates as [number, number]
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        return
      }
      for (const child of coordinates as unknown[]) walk(child)
    }
    for (const feature of geo.features) walk(feature.geometry.coordinates)

    const padding = 6
    const innerWidth = MAP_WIDTH - padding * 2
    const scale = innerWidth / (maxLon - minLon)
    const height = Math.round((maxLat - minLat) * scale + padding * 2)
    const project = (lon: number, lat: number): [number, number] => [
      padding + (lon - minLon) * scale,
      padding + (maxLat - lat) * scale,
    ]

    return {
      mapHeight: height,
      shapes: geo.features.map((feature) => ({
        key: normalizeRegionKey(feature.properties.reg_name),
        name: feature.properties.reg_name,
        path: buildGeometryPath(feature.geometry, project),
      })),
    }
  }, [geo])

  const scale = useMemo(() => {
    const values = [...valuesByRegion.values()]
      .map((entry) => entry.value)
      .filter((value): value is number => value !== null)
    return buildQuantileScale(values, MAP_RAMP.length)
  }, [valuesByRegion])

  const handlePointerMove = (event: PointerEvent, regionKey: string) => {
    const bounds = containerRef.current?.getBoundingClientRect()
    if (!bounds) return
    setTooltip({
      regionKey,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  const clearHover = () => {
    setTooltip(null)
    onHoverRegion(null)
  }

  const tooltipEntry = tooltip ? valuesByRegion.get(tooltip.regionKey) : null
  const tooltipOnLeft = tooltip !== null && tooltip.x > MAP_WIDTH * 0.55

  return (
    <div className={styles.mapFrame} ref={containerRef}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${mapHeight}`}
        className={styles.mapSvg}
        role="img"
        aria-label={`Map of Tanzania regions shaded by ${metricLabel}`}
      >
        {shapes.map((shape) => {
          const entry = valuesByRegion.get(shape.key)
          const hasValue = entry !== undefined && entry.value !== null
          const fill = hasValue
            ? MAP_RAMP[scale(entry.value as number)]
            : MAP_NO_DATA
          const isHovered = hoveredRegion === shape.key
          return (
            <path
              key={shape.key}
              d={shape.path}
              className={`${styles.mapRegion} ${isHovered ? styles.mapRegionActive : ""} ${hasValue ? "" : styles.mapRegionEmpty}`}
              fill={fill}
              tabIndex={hasValue ? 0 : -1}
              aria-label={
                hasValue
                  ? `${entry.name}: ${formatValue(entry.value as number)} ${metricLabel}`
                  : `${shape.name}: no mainland ACSEE mapping`
              }
              onPointerEnter={() => hasValue && onHoverRegion(shape.key)}
              onPointerMove={(event) =>
                hasValue && handlePointerMove(event, shape.key)
              }
              onPointerLeave={clearHover}
              onFocus={() => hasValue && onHoverRegion(shape.key)}
              onBlur={clearHover}
            />
          )
        })}
      </svg>
      {tooltip && tooltipEntry && (
        <div
          className={styles.mapTooltip}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: tooltipOnLeft
              ? "translate(calc(-100% - 14px), -50%)"
              : "translate(14px, -50%)",
          }}
        >
          <p className={styles.mapTooltipTitle}>{tooltipEntry.name}</p>
          <dl className={styles.mapTooltipList}>
            {tooltipEntry.detail.map((row) => (
              <div key={row.label} className={styles.mapTooltipRow}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className={styles.mapLegend} aria-hidden="true">
        <span className={styles.mapLegendLabel}>Lower</span>
        {MAP_RAMP.map((color) => (
          <span
            key={color}
            className={styles.mapLegendSwatch}
            style={{ backgroundColor: color }}
          />
        ))}
        <span className={styles.mapLegendLabel}>Higher</span>
        <span className={styles.mapLegendDivider} />
        <span
          className={styles.mapLegendSwatch}
          style={{ backgroundColor: MAP_NO_DATA }}
        />
        <span className={styles.mapLegendLabel}>No mapped data</span>
      </div>
    </div>
  )
}
