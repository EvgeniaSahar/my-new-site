"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMockListings, type Listing } from "./lib/mockListings";

type MapAreaId = "Downtown" | "Riverside" | "Uptown";
type MapArea = {
  id: MapAreaId;
  label: string;
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number };
};

const MAP_AREAS: MapArea[] = [
  {
    id: "Downtown",
    label: "Map area: Downtown",
    bounds: { latMin: 37.73, latMax: 37.80, lngMin: -122.46, lngMax: -122.38 },
  },
  {
    id: "Riverside",
    label: "Map area: Riverside",
    bounds: { latMin: 37.70, latMax: 37.77, lngMin: -122.52, lngMax: -122.42 },
  },
  {
    id: "Uptown",
    label: "Map area: Uptown",
    bounds: { latMin: 37.78, latMax: 37.86, lngMin: -122.50, lngMax: -122.40 },
  },
];

const UI_STATE_KEY = "hybridMapListState:v1";
const MAP_PIN_PADDING_PX = 32;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getPinnedPosition(
  listing: Listing,
  bounds: MapArea["bounds"],
): { xPct: number; yPct: number } {
  const x = (listing.lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin);
  const y = 1 - (listing.lat - bounds.latMin) / (bounds.latMax - bounds.latMin);
  return { xPct: clamp(x, 0, 1), yPct: clamp(y, 0, 1) };
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function hashToInt(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function formatRubPrice(value: number) {
  return `${Math.round(value).toLocaleString("ru-RU").replace(/\u00A0/g, " ")}₽`;
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cx("h-5 w-5 transition-colors", filled ? "text-rose-500" : "text-white", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

type PersistedUIState = {
  selectedId: string | null;
  mapAreaId: MapAreaId;
  filterUnder100: boolean;
  listScrollTop: number;
  mapOffset: { x: number; y: number };
};

type DrawRect = { x1: number; y1: number; x2: number; y2: number };
type SortMode = "default" | "price_desc" | "price_asc" | "rating_desc";

function parsePriceInput(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function formatPriceInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

export default function Home() {
  const router = useRouter();
  // Базовый датасет: несколько страниц по 28 объявлений.
  const allListings = useMemo(() => getMockListings(28 * 3), []);

  const listRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverSource, setHoverSource] = useState<"list" | "pin" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [listCollapsed, setListCollapsed] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isDatesOpen, setIsDatesOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [drawRect, setDrawRect] = useState<DrawRect | null>(null);
  const [draftDrawRect, setDraftDrawRect] = useState<DrawRect | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [viewedPins, setViewedPins] = useState<Set<string>>(new Set());

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [mapAreaId, setMapAreaId] = useState<MapAreaId>("Downtown");
  const [filterUnder100, setFilterUnder100] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [mapOffset, setMapOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resultsVersion, setResultsVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; baseX: number; baseY: number } | null>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const datesPopoverRef = useRef<HTMLDivElement | null>(null);
  const datesButtonRef = useRef<HTMLButtonElement | null>(null);
  const [datesPopoverPos, setDatesPopoverPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const pricePopoverRef = useRef<HTMLDivElement | null>(null);
  const priceButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pricePopoverPos, setPricePopoverPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  const mapArea = useMemo(
    () => MAP_AREAS.find((a) => a.id === mapAreaId) ?? MAP_AREAS[0],
    [mapAreaId],
  );

  const getRenderablePinPosition = (listing: Listing) => {
    const base = getPinnedPosition(listing, mapArea.bounds);
    return base;
  };

  function pinPctToPx(pos: { xPct: number; yPct: number }, width: number, height: number) {
    const safeWidth = Math.max(1, width - MAP_PIN_PADDING_PX * 2);
    const safeHeight = Math.max(1, height - MAP_PIN_PADDING_PX * 2);
    return {
      x: MAP_PIN_PADDING_PX + pos.xPct * safeWidth,
      y: MAP_PIN_PADDING_PX + pos.yPct * safeHeight,
    };
  }

  // Базовая фильтрация по цене.
  const priceFilteredListings = useMemo(() => {
    return allListings.filter((l) => {
      if (filterUnder100 && l.price >= 100) return false;
      if (appliedMinPrice !== null && l.price < appliedMinPrice) return false;
      if (appliedMaxPrice !== null && l.price > appliedMaxPrice) return false;
      return true;
    });
  }, [filterUnder100, allListings, appliedMinPrice, appliedMaxPrice]);


  // Объекты в текущей области карты.
  const areaFilteredListings = useMemo(() => {
    const inArea = priceFilteredListings.filter((l) => {
      return (
        l.lat >= mapArea.bounds.latMin &&
        l.lat <= mapArea.bounds.latMax &&
        l.lng >= mapArea.bounds.lngMin &&
        l.lng <= mapArea.bounds.lngMax
      );
    });
    const centerLat = (mapArea.bounds.latMin + mapArea.bounds.latMax) / 2;
    const centerLng = (mapArea.bounds.lngMin + mapArea.bounds.lngMax) / 2;
    const outArea = priceFilteredListings.filter((l) => !inArea.some((a) => a.id === l.id));

    // Список обновляется по движению карты: сначала объекты в области,
    // затем остальные по расстоянию до центра области (пагинация сохраняется).
    const rankedOutArea = [...outArea]
      .sort((a, b) => {
        const da = (a.lat - centerLat) ** 2 + (a.lng - centerLng) ** 2;
        const db = (b.lat - centerLat) ** 2 + (b.lng - centerLng) ** 2;
        return da - db;
      });
    return [...inArea, ...rankedOutArea];
  }, [priceFilteredListings, mapArea]);

  // Симуляция zoom: чем больше zoom, тем меньше объектов в выдаче.
  const zoomFilteredListings = useMemo(() => {
    if (areaFilteredListings.length <= 1) return areaFilteredListings;
    if (zoomLevel <= 1) return areaFilteredListings;

    const centerLat = (mapArea.bounds.latMin + mapArea.bounds.latMax) / 2;
    const centerLng = (mapArea.bounds.lngMin + mapArea.bounds.lngMax) / 2;
    const keepRatioByZoom = [1, 0.82, 0.66, 0.5, 0.36];
    const ratio = keepRatioByZoom[clamp(zoomLevel - 1, 0, keepRatioByZoom.length - 1)];
    const keepCount = Math.max(8, Math.round(areaFilteredListings.length * ratio));

    return [...areaFilteredListings]
      .sort((a, b) => {
        const da = (a.lat - centerLat) ** 2 + (a.lng - centerLng) ** 2;
        const db = (b.lat - centerLat) ** 2 + (b.lng - centerLng) ** 2;
        return da - db;
      })
      .slice(0, keepCount);
  }, [areaFilteredListings, zoomLevel, mapArea]);

  const activeDrawRect = useMemo(
    () => {
      if (!isDrawingMode) return null;
      const rect = draftDrawRect ?? drawRect;
      if (!rect) return null;
      // Ignore accidental tiny taps so map/pins don't "disappear".
      const w = Math.abs(rect.x2 - rect.x1);
      const h = Math.abs(rect.y2 - rect.y1);
      if (w < 0.015 || h < 0.015) return null;
      return rect;
    },
    [isDrawingMode, draftDrawRect, drawRect],
  );

  // В режиме рисования показываем только объекты внутри выделенной области (до 28 штук).
  const visibleListings = useMemo(() => {
    if (!activeDrawRect) return zoomFilteredListings;
    const left = Math.min(activeDrawRect.x1, activeDrawRect.x2);
    const right = Math.max(activeDrawRect.x1, activeDrawRect.x2);
    const top = Math.min(activeDrawRect.y1, activeDrawRect.y2);
    const bottom = Math.max(activeDrawRect.y1, activeDrawRect.y2);

    const inSelection = areaFilteredListings.filter((l) => {
      // Use the same coordinate system as pin rendering to avoid drift
      // between selected area and displayed pins.
      const pos = getRenderablePinPosition(l);
      return pos.xPct >= left && pos.xPct <= right && pos.yPct >= top && pos.yPct <= bottom;
    });
    return inSelection.slice(0, 28);
  }, [activeDrawRect, zoomFilteredListings, areaFilteredListings, mapArea, zoomLevel]);

  const sortedVisibleListings = useMemo(() => {
    if (sortMode === "default") return visibleListings;
    const next = [...visibleListings];
    if (sortMode === "price_desc") {
      next.sort((a, b) => b.price - a.price);
    } else if (sortMode === "price_asc") {
      next.sort((a, b) => a.price - b.price);
    } else if (sortMode === "rating_desc") {
      next.sort((a, b) => b.rating - a.rating);
    }
    return next;
  }, [visibleListings, sortMode]);

  const pageSize = 28; // 1 страница = 28 объектов
  const totalPages = Math.max(1, Math.ceil(sortedVisibleListings.length / pageSize));
  const pagedListings = useMemo(() => {
    const safePage = clamp(page, 1, totalPages);
    const start = (safePage - 1) * pageSize;
    return sortedVisibleListings.slice(start, start + pageSize);
  }, [page, pageSize, totalPages, sortedVisibleListings]);

  const selectedVisible = useMemo(
    () => (selectedId ? sortedVisibleListings.some((l) => l.id === selectedId) : false),
    [selectedId, sortedVisibleListings],
  );

  const relatedListings = useMemo(() => allListings.slice(0, 4), [allListings]);

  const distributedPinPositions = useMemo(() => {
    const positions = new Map<string, { xPct: number; yPct: number }>();
    if (pagedListings.length === 0) return positions;

    // Airbnb-like behavior: keep geo position as base and
    // only softly push overlapping pins apart, с небольшим стягиванием к центру.
    const nodes = pagedListings.map((l) => {
      const raw = getPinnedPosition(l, mapArea.bounds);
      const pullToCenter = 0.7; // 1 = без изменений, 0 = всё в центре
      const base = {
        xPct: 0.5 + (raw.xPct - 0.5) * pullToCenter,
        yPct: 0.5 + (raw.yPct - 0.5) * pullToCenter,
      };
      return {
        id: l.id,
        baseX: base.xPct,
        baseY: base.yPct,
        x: base.xPct,
        y: base.yPct,
      };
    });

    const minDist = 0.055; // in map-percent space
    const minDistSq = minDist * minDist;
    const spring = 0.08; // pull back to base
    const repel = 0.22; // push apart strength
    const edgePad = 0.02;

    for (let iter = 0; iter < 22; iter += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 >= minDistSq) continue;

          const d = Math.sqrt(Math.max(d2, 1e-6));
          const overlap = (minDist - d) / minDist;
          const ux = dx / d;
          const uy = dy / d;
          const push = overlap * repel * 0.5;

          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }

      for (const n of nodes) {
        n.x += (n.baseX - n.x) * spring;
        n.y += (n.baseY - n.y) * spring;
        n.x = clamp(n.x, edgePad, 1 - edgePad);
        n.y = clamp(n.y, edgePad, 1 - edgePad);
      }
    }

    for (const n of nodes) {
      positions.set(n.id, { xPct: n.x, yPct: n.y });
    }
    return positions;
  }, [pagedListings, mapArea]);

  function getDisplayPinPosition(listing: Listing) {
    return distributedPinPositions.get(listing.id) ?? getRenderablePinPosition(listing);
  }


  const unavailableSelectedReason = useMemo(() => {
    if (!selectedId) return null;
    if (selectedVisible) return null;
    return "This listing is no longer available";
  }, [selectedId, selectedVisible]);

  // Restore state only once on back-navigation from the details page.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(UI_STATE_KEY);
      if (!raw) return;
      // Consume it so it doesn't re-apply on next hard refresh.
      sessionStorage.removeItem(UI_STATE_KEY);

      const parsed = JSON.parse(raw) as Partial<PersistedUIState>;
      if (parsed.mapAreaId) setMapAreaId(parsed.mapAreaId);
      if (typeof parsed.filterUnder100 === "boolean") setFilterUnder100(parsed.filterUnder100);
      if (typeof parsed.selectedId === "string")
        setSelectedId(parsed.selectedId);
      if (parsed.mapOffset && typeof parsed.mapOffset.x === "number" && typeof parsed.mapOffset.y === "number")
        setMapOffset({ x: parsed.mapOffset.x, y: parsed.mapOffset.y });

      if (typeof parsed.listScrollTop === "number") {
        const scrollTop = parsed.listScrollTop;
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = scrollTop;
        });
      }
    } catch {
      // ignore corrupted state
    }
  }, []);

  // Fade in results on dataset changes.
  useEffect(() => {
    setResultsVersion((v) => v + 1);
  }, [mapAreaId, filterUnder100, page, zoomLevel]);

  // Keep pagination valid when results change.
  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  function persistUIState(partial?: Partial<PersistedUIState>) {
    const listScrollTop = listRef.current?.scrollTop ?? 0;
    const next: PersistedUIState = {
      selectedId,
      mapAreaId,
      filterUnder100,
      listScrollTop,
      mapOffset,
      ...partial,
    };
    sessionStorage.setItem(UI_STATE_KEY, JSON.stringify(next));
  }

  function scrollListTo(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-listing-row="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function centerMapOn(listing: Listing) {
    const mapEl = mapRef.current;
    if (!mapEl) return;
    const rect = mapEl.getBoundingClientRect();
    const pos = getDisplayPinPosition(listing);
    const px = pinPctToPx(pos, rect.width, rect.height);
    const pinX = px.x;
    const pinY = px.y;
    const nextOffset = {
      x: Math.round(rect.width / 2 - pinX),
      y: Math.round(rect.height / 2 - pinY),
    };
    setMapOffset(nextOffset);
  }

  function closePinPreview() {
    setOpenPinId(null);
  }

  function openPinPreview(id: string) {
    // New click on pin replaces currently opened preview.
    setOpenPinId(id);
    // Pin is considered viewed after explicit click.
    setViewedPins((prev) => new Set(prev).add(id));
    // Keep list in sync with pin hover/click context.
    setHoveredId(id);
    setHoverSource("pin");
  }

  function openDetails(id: string) {
    persistUIState({ selectedId: id, listScrollTop: listRef.current?.scrollTop ?? 0 });
    router.push(`/listing/${id}`, { scroll: false });
  }

  function openDetailsInNewTab(id: string) {
    window.open(`/listing/${id}`, "_blank", "noopener,noreferrer");
  }

  function toggleDrawingMode() {
    setIsDrawingMode((prev) => {
      const next = !prev;
      if (!next) {
        // Exit drawing mode: clear current rectangle state.
        setDraftDrawRect(null);
        setDrawRect(null);
        setIsDrawingSelection(false);
        drawStartRef.current = null;
      } else {
        // Enter drawing mode: reset and start fresh.
        setDraftDrawRect(null);
        setDrawRect(null);
        closePinPreview();
      }
      return next;
    });
  }

  const moveMapTimeoutRef = useRef<number | null>(null);
  const pageChangeTimeoutRef = useRef<number | null>(null);
  const zoomChangeTimeoutRef = useRef<number | null>(null);
  const sortChangeTimeoutRef = useRef<number | null>(null);
  function moveMap() {
    if (moveMapTimeoutRef.current) window.clearTimeout(moveMapTimeoutRef.current);
    closePinPreview();
    setIsLoading(true);
    setHoveredId(null);
    setHoverSource(null);

    moveMapTimeoutRef.current = window.setTimeout(() => {
      setMapAreaId((prev) => {
        const idx = MAP_AREAS.findIndex((a) => a.id === prev);
        const next = MAP_AREAS[(idx + 1) % MAP_AREAS.length];
        return next.id;
      });
      // Area changed: reset visual drag offset, pins will render for the new map area.
      setMapOffset({ x: 0, y: 0 });
      setIsLoading(false);
      setPage(1);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (moveMapTimeoutRef.current) window.clearTimeout(moveMapTimeoutRef.current);
      if (pageChangeTimeoutRef.current) window.clearTimeout(pageChangeTimeoutRef.current);
      if (zoomChangeTimeoutRef.current) window.clearTimeout(zoomChangeTimeoutRef.current);
      if (sortChangeTimeoutRef.current) window.clearTimeout(sortChangeTimeoutRef.current);
    };
  }, []);

  function changePage(next: number) {
    const safe = clamp(next, 1, totalPages);
    if (safe === page) return;
    if (pageChangeTimeoutRef.current) window.clearTimeout(pageChangeTimeoutRef.current);
    closePinPreview();
    setHoveredId(null);
    setHoverSource(null);
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Сразу показываем скелетоны и обновляем страницу,
    // а через 3 секунды мягко завершаем загрузку.
    setIsLoading(true);
    setPage(safe);
    pageChangeTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  function changeZoom(delta: 1 | -1) {
    const next = clamp(zoomLevel + delta, 1, 5);
    if (next === zoomLevel) return;
    if (zoomChangeTimeoutRef.current) window.clearTimeout(zoomChangeTimeoutRef.current);

    closePinPreview();
    setHoveredId(null);
    setHoverSource(null);
    // Apply zoom value immediately so transform animates smoothly while loading is visible.
    setZoomLevel(next);
    setPage(1);
    setIsLoading(true);

    zoomChangeTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      if (listRef.current) {
        listRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 600);
  }

  function changeSort(nextMode: SortMode) {
    if (nextMode === sortMode) {
      setIsSortMenuOpen(false);
      return;
    }
    if (sortChangeTimeoutRef.current) window.clearTimeout(sortChangeTimeoutRef.current);
    closePinPreview();
    setHoveredId(null);
    setHoverSource(null);
    setIsSortMenuOpen(false);
    setIsLoading(true);

    sortChangeTimeoutRef.current = window.setTimeout(() => {
      setSortMode(nextMode);
      setPage(1);
      setIsLoading(false);
      if (listRef.current) {
        listRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 600);
  }

  useEffect(() => {
    function onPointerUp() {
      if (isDrawingSelection) {
        setIsDrawingSelection(false);
        if (draftDrawRect) {
          const w = Math.abs(draftDrawRect.x2 - draftDrawRect.x1);
          const h = Math.abs(draftDrawRect.y2 - draftDrawRect.y1);
          setDrawRect(w < 0.015 || h < 0.015 ? null : draftDrawRect);
        }
        return;
      }
      if (!isDraggingMap) return;
      const start = dragStartRef.current;
      setIsDraggingMap(false);
      dragStartRef.current = null;
      // Only reload map data when the user actually dragged (moved > 5 px).
      if (start) {
        const dx = mapOffset.x - start.baseX;
        const dy = mapOffset.y - start.baseY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          moveMap();
        }
      }
    }
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDraggingMap, mapOffset, isDrawingSelection, draftDrawRect]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!isSortMenuOpen) return;
      const target = e.target as Node | null;
      if (sortMenuRef.current && target && !sortMenuRef.current.contains(target)) {
        setIsSortMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isSortMenuOpen]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!isDatesOpen) return;
      const target = e.target as Node | null;
      const insidePopover = !!(datesPopoverRef.current && target && datesPopoverRef.current.contains(target));
      const insideButton = !!(datesButtonRef.current && target && datesButtonRef.current.contains(target));
      if (!insidePopover && !insideButton) {
        setIsDatesOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isDatesOpen]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextMin = parsePriceInput(draftMinPrice);
      const nextMax = parsePriceInput(draftMaxPrice);
      setAppliedMinPrice(nextMin);
      setAppliedMaxPrice(nextMax);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftMinPrice, draftMaxPrice]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!isPriceOpen) return;
      const target = e.target as Node | null;
      const insidePopover = !!(pricePopoverRef.current && target && pricePopoverRef.current.contains(target));
      const insideButton = !!(priceButtonRef.current && target && priceButtonRef.current.contains(target));
      if (!insidePopover && !insideButton) {
        setIsPriceOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [isPriceOpen]);

  useEffect(() => {
    if (!isDatesOpen) return;
    function updatePosition() {
      const rect = datesButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDatesPopoverPos({
        left: Math.round(rect.left),
        top: Math.round(rect.bottom + 8),
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isDatesOpen]);

  useEffect(() => {
    if (!isPriceOpen) return;
    function updatePosition() {
      const rect = priceButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPricePopoverPos({
        left: Math.round(rect.left),
        top: Math.round(rect.bottom + 8),
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isPriceOpen]);

  // If selected becomes unavailable, keep selection but avoid "phantom highlight" in list/map.

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInOnly {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Top filters bar (full width) */}
      <div className="sticky top-0 z-40 hidden border-b border-zinc-200 bg-white md:block">
        <div className="mx-auto w-full px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
            >
              Посуточно
            </button>
            <div ref={datesPopoverRef} className="relative">
              <button
                ref={datesButtonRef}
                type="button"
                onClick={() => setIsDatesOpen((v) => !v)}
                className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
              >
                Выберите даты
              </button>
            </div>
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
            >
              1 гость
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
            >
              Квартиру
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
            >
              Комнатность
            </button>
            <button
              ref={priceButtonRef}
              type="button"
              onClick={() => setIsPriceOpen((v) => !v)}
              className={cx(
                "whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm",
                isPriceOpen || filterUnder100 || appliedMinPrice !== null || appliedMaxPrice !== null
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700",
              )}
            >
              Цена за сутки
            </button>
            <button
              type="button"
              onClick={() => setIsFiltersModalOpen(true)}
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm"
            >
              Ещё фильтры
            </button>

            <div className="ml-2 flex min-w-[220px] flex-1 items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm text-zinc-500">
              <span className="mr-1 text-zinc-400">🔍</span>
              <span className="truncate">Адрес, ЖК или запрос…</span>
            </div>

            <button
              type="button"
              className="ml-1 whitespace-nowrap rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-blue-700"
            >
              Регион
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-blue-700"
            >
              Метро
            </button>
            <button
              type="button"
              className="ml-1 flex items-center gap-1 whitespace-nowrap rounded-lg border border-zinc-200 bg-transparent px-3 py-1.5 text-sm text-blue-700"
            >
              <span>♡</span>
              <span>Сохранить поиск</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">

      {/* < 900px: mobile mode, map hidden by default, open via button */}
      <div className="sticky top-0 z-30 flex min-[900px]:hidden border-b border-zinc-200 bg-white px-3 py-2">
        {mobileTab === "list" ? (
          <button
            type="button"
            onClick={() => setMobileTab("map")}
            className="ml-auto rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Открыть карту
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMobileTab("list")}
            className="ml-auto rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            К списку
          </button>
        )}
      </div>

      {/* Left: list */}
      {/* Breakpoints:
          0-899: one column, map via separate button
          900-1199: one column
          1200-1699: two columns + 50/50 split
          >=1700: fixed list width 760px + map fills rest */}
      <section
        className={cx(
          "w-full border-r border-zinc-200 bg-white overflow-hidden transition-[width,min-width,opacity] duration-500 ease-in-out min-[900px]:w-1/2 min-[1700px]:w-[760px] min-[1700px]:min-w-[760px]",
          mobileTab !== "list" && "max-[899px]:hidden",
        )}
        style={{
          width: listCollapsed ? "0px" : undefined,
          minWidth: listCollapsed ? 0 : undefined,
          opacity: listCollapsed ? 0 : 1,
        }}
      >
        <div
          ref={listRef}
          className="h-screen overflow-auto px-3 sm:px-4 py-4"
        >
            <div
              key={resultsVersion}
              style={{ animation: "fadeInUp 360ms ease-out both" }}
              className="flex flex-col gap-3"
            >
            <div className="mb-5 rounded-2xl bg-white px-4 py-3">
              <div className="text-sm text-zinc-500">Недвижимость в Москве / Посуточно</div>
              <div
                className="mt-1 overflow-hidden whitespace-nowrap text-[22px] font-bold leading-[28px] tracking-[-0.5px] text-zinc-900"
                style={{
                  WebkitMaskImage: "linear-gradient(to right, #000 84%, transparent 100%)",
                  maskImage: "linear-gradient(to right, #000 84%, transparent 100%)",
                }}
              >
                Снять посуточно 1-комн и 2-комнатн квартир в Москве с бассейном
              </div>
              <div className="relative mt-2 flex items-center gap-3 text-[18px] font-medium leading-[24px] tracking-[-0.5px] text-zinc-900">
                <span>{`Найдено ${visibleListings.length.toLocaleString("ru-RU")}+ объявлений`}</span>
                <div ref={sortMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSortMenuOpen((v) => !v)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-blue-50"
                    aria-label="Открыть сортировку"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <path
                        d="M12.5 0.999756V11.5857L14.293 9.79272L15.707 11.2068L11.5 15.4138L7.29297 11.2068L8.70703 9.79272L10.5 11.5857V0.999756H12.5ZM8.70703 4.79272L7.29297 6.20679L5.5 4.41382V14.9998H3.5V4.41382L1.70703 6.20679L0.292969 4.79272L4.5 0.585693L8.70703 4.79272Z"
                        fill="#0468FF"
                      />
                    </svg>
                  </button>

                  {isSortMenuOpen ? (
                    <div className="absolute left-0 top-9 z-30 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                      {([
                        { id: "default", label: "По умолчанию" },
                        { id: "price_desc", label: "Сначала дороже" },
                        { id: "price_asc", label: "Сначала дешевле" },
                        { id: "rating_desc", label: "С хорошим рейтингом" },
                      ] as Array<{ id: SortMode; label: string }>).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => changeSort(opt.id)}
                          className={cx(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                            sortMode === opt.id
                              ? "bg-blue-50 font-medium text-blue-700"
                              : "text-zinc-700 hover:bg-zinc-50",
                          )}
                        >
                          <span>{opt.label}</span>
                          {sortMode === opt.id ? <span>✓</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-x-3 gap-y-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl ring-1 ring-zinc-900/10 bg-white overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-zinc-200/70" />
                    <div className="p-3">
                      <div className="h-4 w-2/3 rounded bg-zinc-200/70" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200/60" />
                      <div className="mt-4 h-4 w-1/3 rounded bg-zinc-200/70" />
                      <div className="mt-2 h-3 w-2/5 rounded bg-zinc-200/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleListings.length === 0 ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5">
                  <div className="text-sm font-semibold">Нет объектов</div>
                  <div className="mt-1 text-sm text-zinc-600">Попробуйте изменить фильтры</div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterUnder100(false);
                      setDraftMinPrice("");
                      setDraftMaxPrice("");
                      setAppliedMinPrice(null);
                      setAppliedMaxPrice(null);
                      setIsPriceOpen(false);
                    }}
                    className="mt-3 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    Сбросить фильтры
                  </button>
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold text-zinc-900">Похожие варианты</div>
                  <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-x-3 gap-y-8">
                    {relatedListings.map((l) => {
                      const h = hashToInt(l.id);
                      const imageTone = h % 6;
                      const imageBg =
                        imageTone === 0
                          ? "linear-gradient(135deg, #fde68a, #fb7185)"
                          : imageTone === 1
                            ? "linear-gradient(135deg, #bfdbfe, #a7f3d0)"
                            : imageTone === 2
                              ? "linear-gradient(135deg, #ddd6fe, #fecaca)"
                              : imageTone === 3
                                ? "linear-gradient(135deg, #e9d5ff, #bae6fd)"
                                : imageTone === 4
                                  ? "linear-gradient(135deg, #bbf7d0, #fde68a)"
                                  : "linear-gradient(135deg, #fecaca, #bfdbfe)";
                      return (
                        <div
                          key={`related-${l.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openDetailsInNewTab(l.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDetailsInNewTab(l.id);
                            }
                          }}
                          className="cursor-pointer overflow-hidden rounded-3xl bg-white transition-all"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden">
                            <div className="absolute inset-0" style={{ backgroundImage: imageBg }} />
                            <div className="absolute inset-0 bg-black/10" />
                          </div>
                          <div className="pt-3 text-[15px] font-medium text-zinc-900">{l.title}</div>
                          <div className="mt-1 text-sm text-zinc-900">
                            <span className="font-semibold">{formatRubPrice(l.price)}</span>{" "}
                            <span className="text-zinc-600">/сут.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 max-[600px]:grid-cols-1 gap-x-3 gap-y-8">
                  {pagedListings.map((l, cardIndex) => {
                    const isHovered = hoveredId === l.id;
                    const h = hashToInt(l.id);
                    const isGuestFavorite = h % 4 === 0;
                    const hasFreeCancel = h % 3 === 0;
                    const hasDiscount = h % 5 === 0;
                    const nights = 2 + (h % 3);
                    const city = h % 2 === 0 ? "Батуми" : "Тбилиси";
                    const savedCount = 40 + (h % 260);
                    const imageTone = h % 6;
                    const imageBg =
                      imageTone === 0
                        ? "linear-gradient(135deg, #fde68a, #fb7185)"
                        : imageTone === 1
                          ? "linear-gradient(135deg, #bfdbfe, #a7f3d0)"
                          : imageTone === 2
                            ? "linear-gradient(135deg, #ddd6fe, #fecaca)"
                            : imageTone === 3
                              ? "linear-gradient(135deg, #e9d5ff, #bae6fd)"
                              : imageTone === 4
                                ? "linear-gradient(135deg, #bbf7d0, #fde68a)"
                                : "linear-gradient(135deg, #fecaca, #bfdbfe)";
                    const shouldShowAd = cardIndex === 6 || cardIndex === 16;
                    return [
                      shouldShowAd ? (
                        <div
                          key={`ad-${cardIndex}`}
                          className="col-span-2 max-[600px]:col-span-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white"
                        >
                          <div className="relative flex">
                            <button
                              type="button"
                              aria-label="Закрыть рекламу"
                              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-500 shadow-sm"
                            >
                              ×
                            </button>
                            <div className="w-[240px] shrink-0 bg-gradient-to-br from-zinc-100 to-blue-100">
                              <div className="p-5">
                                <div className="inline-flex rounded-md bg-white/80 px-2 py-1 text-[12px] font-semibold text-blue-600">
                                  МИРАПОЛИС
                                </div>
                              </div>
                            </div>
                            <div className="flex-1 p-5">
                              <div className="text-[14px] font-semibold text-zinc-900">МИРАПОЛИС</div>
                              <div className="mt-1 text-[12px] leading-snug text-zinc-600">
                                Бизнес-класс от 9,5 млн ₽. Квартал рядом с ВДНХ.
                              </div>
                              <div className="mt-2 text-[12px] text-zinc-500">м. Ростокино · 9 минут пешком</div>
                              <button
                                type="button"
                                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white"
                              >
                                Узнать подробнее
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null,
                      <div
                        key={l.id}
                        data-listing-row={l.id}
                        onMouseEnter={() => { setHoveredId(l.id); setHoverSource("list"); }}
                        onMouseLeave={() => { setHoveredId((h) => (h === l.id ? null : h)); setHoverSource(null); }}
                        className="group overflow-hidden rounded-3xl bg-white transition-all cursor-pointer"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openDetailsInNewTab(l.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDetailsInNewTab(l.id);
                            }
                          }}
                          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                          aria-label={`Открыть объявление ${l.id}`}
                        >
                          {/* Блок фото: большая + мини-галерея для всех карточек */}
                          <div className="relative aspect-[4/3] w-full overflow-hidden flex flex-col gap-1">
                            {/* Верхняя большая фотография занимает оставшееся пространство */}
                            <div className="relative w-full flex-1 overflow-hidden">
                              <div className="absolute inset-0" style={{ backgroundImage: imageBg }} />
                              <div className="absolute inset-0 bg-black/10" />

                              <div className="absolute right-4 top-4 z-10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleFavorite(l.id);
                                  }}
                                  className="grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition-colors hover:bg-white"
                                  aria-label="Сохранить"
                                >
                                  <HeartIcon
                                    filled={favorites.has(l.id)}
                                    className={favorites.has(l.id) ? "" : "!text-zinc-700"}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Мини-галерея снизу, внутри того же общего блока aspect-[4/3] */}
                            <div className="flex gap-1 px-0 py-0">
                              {Array.from({ length: 3 }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className={cx(
                                    "h-14 flex-1 overflow-hidden",
                                    idx === 0 && "rounded-bl-lg",
                                    idx === 1 && "rounded-none",
                                    idx === 2 && "rounded-br-lg",
                                  )}
                                  style={{ backgroundImage: imageBg }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Контент как в примере */}
                          <div className="px-0 py-3">
                            {/* Бейджи — в один ряд с горизонтальным скроллом */}
                            <div className="mt-0.5 overflow-x-auto pb-1">
                              <div className="flex min-w-full gap-1.5 text-[11px]">
                                <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
                                  Суперхозяин
                                </span>
                                <span className="whitespace-nowrap rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                                  Проверено
                                </span>
                                {hasFreeCancel ? (
                                  <span className="whitespace-nowrap rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700">
                                    Мгновенное бронирование
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {/* Заголовок */}
                            <div className="mt-2 text-[15px] font-medium text-zinc-900">
                              Уютные апартаменты у метро
                            </div>

                            {/* Цена в стиле “от 5 600 ₽/сут.” */}
                            <div className="mt-1 text-sm">
                              <span className="text-zinc-500">от </span>
                              <span className="text-[18px] font-semibold leading-none text-zinc-900">
                                {formatRubPrice(l.price)}
                              </span>
                              <span className="ml-1 text-[15px] font-semibold text-zinc-900">/сут.</span>
                            </div>

                            {/* Описание + параметры */}
                            <div className="mt-1 text-xs text-zinc-600">
                              <div>
                                2-комн. кв. · {60 + (h % 20)}
                                {" м² · "}
                                {8 + (h % 10)}/17 этаж
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-[11px]">
                                <span className="text-amber-500">★</span>
                                <span className="font-semibold text-amber-700">
                                  {l.rating.toFixed(1).replace(".", ",")}
                                </span>
                                <span className="text-zinc-500">· {savedCount} отзывов</span>
                              </div>
                            </div>

                            {/* Локация */}
                            <div className="mt-2 text-[11px] text-zinc-500">
                              <div>
                                м. {city} · 19 мин.
                              </div>
                              <div className="truncate">
                                Москва, Ленинградский проспект, 34А
                              </div>
                            </div>

                            {/* Ссылка-комплекс */}
                            <div className="mt-1 text-[11px] font-medium text-sky-700 underline underline-offset-2">
                              ЖК Комплекс апартаментов Alcon Tower
                            </div>
                          </div>
                        </div>
                      </div>
                    ];
                  })}
                </div>

                {totalPages > 1 ? (
                  <div className="mt-5 flex justify-center">
                    <nav className="inline-flex items-center gap-1 rounded-2xl bg-white px-2 py-1.5 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                      {/* Назад */}
                      <button
                        type="button"
                        onClick={() => changePage(page - 1)}
                        disabled={page <= 1}
                        className={cx(
                          "min-w-[72px] rounded-xl px-3 py-1.5 text-center font-medium transition-colors",
                          page <= 1
                            ? "cursor-not-allowed text-zinc-300"
                            : "text-zinc-600 hover:bg-zinc-50",
                        )}
                      >
                        Назад
                      </button>

                      {/* Номера страниц */}
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const num = i + 1;
                        const isActive = num === page;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => changePage(num)}
                            className={cx(
                              "min-w-[36px] rounded-xl border px-2.5 py-1.5 text-center text-sm transition-colors",
                              isActive
                                ? "border-zinc-300 bg-zinc-100 font-semibold text-zinc-900"
                                : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50",
                            )}
                          >
                            {num}
                          </button>
                        );
                      })}

                      {/* Дальше */}
                      <button
                        type="button"
                        onClick={() => changePage(page + 1)}
                        disabled={page >= totalPages}
                        className={cx(
                          "min-w-[80px] rounded-xl px-3 py-1.5 text-center font-semibold transition-colors",
                          page >= totalPages
                            ? "cursor-not-allowed text-zinc-300"
                            : "text-zinc-900 hover:bg-zinc-50",
                        )}
                      >
                        Дальше
                      </button>
                    </nav>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Right: map */}
      {/* Map is hidden by default only on <900, visible from >=900 */}
      <section
        className={cx(
          "relative w-full bg-zinc-100 transition-[width] duration-500 ease-in-out min-[900px]:w-1/2 min-[1700px]:w-auto min-[1700px]:flex-1",
          mobileTab !== "map" && "max-[899px]:hidden",
          mobileTab === "map" && "min-h-[calc(100vh-44px)]",
          listCollapsed && "min-[900px]:w-full",
        )}
      >
        {/* Top bar: toggle */}
        <div className="pointer-events-auto absolute left-4 top-4 z-[60] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setListCollapsed((c) => !c)}
            className="hidden md:flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white/95 px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            <svg
              viewBox="0 0 20 20"
              className={cx("h-4 w-4 text-zinc-700 transition-transform duration-300", listCollapsed && "rotate-180")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 4L10 10L4 16" />
              <path d="M10 4L16 10L10 16" />
            </svg>
            {listCollapsed ? "Показать список" : "Раскрыть карту"}
          </button>
        </div>

        {/* Map controls */}
        <div className="pointer-events-auto absolute right-4 top-1/2 z-[60] flex -translate-y-1/2 flex-col items-end gap-3">
          <button
            type="button"
            onClick={toggleDrawingMode}
            className={cx(
              "grid h-14 w-14 place-items-center rounded-2xl shadow-md ring-1 transition-colors",
              isDrawingMode
                ? "bg-blue-600 text-white ring-blue-600 hover:bg-blue-700"
                : "bg-white/95 text-zinc-800 ring-zinc-200 hover:bg-white",
            )}
            aria-label={isDrawingMode ? "Выйти из режима выделения" : "Войти в режим выделения"}
            title={isDrawingMode ? "Выйти из режима выделения" : "Войти в режим выделения"}
          >
            {isDrawingMode ? (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3z" />
                <path d="M13 7l4 4" />
              </svg>
            )}
          </button>

          <div className="overflow-hidden rounded-2xl bg-white/95 shadow-md ring-1 ring-zinc-200">
            <button
              type="button"
              onClick={() => changeZoom(1)}
              className="grid h-14 w-14 place-items-center text-4xl leading-none text-zinc-800 transition-colors hover:bg-zinc-50"
              aria-label="Приблизить"
              title="Приблизить"
            >
              +
            </button>
            <div className="h-px bg-zinc-200" />
            <button
              type="button"
              onClick={() => changeZoom(-1)}
              className="grid h-14 w-14 place-items-center text-4xl leading-none text-zinc-800 transition-colors hover:bg-zinc-50"
              aria-label="Отдалить"
              title="Отдалить"
            >
              −
            </button>
          </div>

          <button
            type="button"
            className="grid h-14 w-14 place-items-center rounded-2xl bg-white/95 text-zinc-800 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-white"
            aria-label="Моё местоположение"
            title="Моё местоположение"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              <circle cx="12" cy="12" r="4.5" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsHelpModalOpen(true)}
          className="pointer-events-auto fixed bottom-5 right-4 z-[80] grid h-14 w-14 place-items-center rounded-full bg-white/95 text-4xl leading-none text-blue-600 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-white"
          aria-label="Справка"
          title="Справка"
        >
          ?
        </button>

        <div
          ref={mapRef}
          className="absolute inset-0 overflow-hidden"
          onClick={(e) => {
            // Close pin preview when clicking on the map background (not on a pin / popup).
            if (e.target === e.currentTarget || !(e.target as HTMLElement).closest("[data-pin]")) {
              closePinPreview();
            }
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            if (isDrawingMode) {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
              const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
              setIsDrawingSelection(true);
              drawStartRef.current = { x, y };
              setDraftDrawRect({ x1: x, y1: y, x2: x, y2: y });
              (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
              return;
            }
            // Don't start drag when clicking on a pin or popup — let the pin's own click handler fire.
            if ((e.target as HTMLElement).closest("[data-pin]")) return;
            setIsDraggingMap(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY, baseX: mapOffset.x, baseY: mapOffset.y };
            (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (isDrawingMode && isDrawingSelection) {
              const start = drawStartRef.current;
              if (!start) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
              const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
              setDraftDrawRect({ x1: start.x, y1: start.y, x2: x, y2: y });
              return;
            }
            if (!isDraggingMap) return;
            const start = dragStartRef.current;
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            const next = { x: start.baseX + dx, y: start.baseY + dy };
            const mapRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();

            // Keep all rendered pins inside the visible map while dragging.
            let minXPx = Infinity, maxXPx = -Infinity, minYPx = Infinity, maxYPx = -Infinity;
            for (const listing of pagedListings) {
              const p = getDisplayPinPosition(listing);
              const px = pinPctToPx(p, mapRect.width, mapRect.height);
              const xPx = px.x;
              const yPx = px.y;
              if (xPx < minXPx) minXPx = xPx;
              if (xPx > maxXPx) maxXPx = xPx;
              if (yPx < minYPx) minYPx = yPx;
              if (yPx > maxYPx) maxYPx = yPx;
            }
            if (Number.isFinite(minXPx) && Number.isFinite(maxXPx)) {
              const pad = 16;
              const minOffsetX = pad - minXPx;
              const maxOffsetX = mapRect.width - pad - maxXPx;
              const minOffsetY = pad - minYPx;
              const maxOffsetY = mapRect.height - pad - maxYPx;
              next.x = clamp(next.x, minOffsetX, maxOffsetX);
              next.y = clamp(next.y, minOffsetY, maxOffsetY);
            }

            setMapOffset(next);
          }}
          style={{
            cursor: isDrawingMode ? "pointer" : isDraggingMap ? "grabbing" : "grab",
            background:
              "radial-gradient(800px 400px at 30% 20%, rgba(24,24,27,0.06), transparent 60%), radial-gradient(600px 380px at 70% 70%, rgba(24,24,27,0.06), transparent 55%)",
          }}
        >
          {activeDrawRect ? (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: `${Math.min(activeDrawRect.x1, activeDrawRect.x2) * 100}%`,
                top: `${Math.min(activeDrawRect.y1, activeDrawRect.y2) * 100}%`,
                width: `${Math.abs(activeDrawRect.x2 - activeDrawRect.x1) * 100}%`,
                height: `${Math.abs(activeDrawRect.y2 - activeDrawRect.y1) * 100}%`,
                border: "2px solid #68A4FF",
                background: "#E6F0FF",
              }}
            />
          ) : null}
          {/* A subtle grid to make panning obvious */}
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          <div
            key={resultsVersion}
            className={cx(
              "absolute inset-0 z-20 transition-opacity duration-500",
              isLoading ? "opacity-60" : "opacity-100",
            )}
            style={{ animation: "fadeInUp 360ms ease-out both" }}
          >
            <div
              className={cx(
                "absolute inset-0 transition-transform [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]",
                isDraggingMap ? "duration-0" : "duration-[1200ms]",
              )}
              style={{
                transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${1 + (zoomLevel - 1) * 0.08})`,
                transformOrigin: "50% 50%",
                willChange: "transform",
              }}
            >
              {isLoading ? (
                <>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 ring-1 ring-zinc-900/10 px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm animate-pulse"
                      style={{
                        left: `${10 + (i % 5) * 18}%`,
                        top: `${18 + Math.floor(i / 5) * 28}%`,
                      }}
                    >
                      —
                    </div>
                  ))}
                </>
              ) : (
                pagedListings.map((l) => {
                  const pos = getDisplayPinPosition(l);
                  const isHovered = hoveredId === l.id;
                  const pinHighlight = isHovered || openPinId === l.id;
                  const isViewed = viewedPins.has(l.id);

                  const h = hashToInt(l.id);
                  const city = h % 2 === 0 ? "Батуми" : "Тбилиси";
                  const reviews = 40 + (h % 260);
                  const nights = 2 + (h % 3);
                  const imageTone = h % 6;
                  const imageBg =
                    imageTone === 0
                      ? "linear-gradient(135deg, #fde68a, #fb7185)"
                      : imageTone === 1
                        ? "linear-gradient(135deg, #bfdbfe, #a7f3d0)"
                        : imageTone === 2
                          ? "linear-gradient(135deg, #ddd6fe, #fecaca)"
                          : imageTone === 3
                            ? "linear-gradient(135deg, #e9d5ff, #bae6fd)"
                            : imageTone === 4
                              ? "linear-gradient(135deg, #bbf7d0, #fde68a)"
                              : "linear-gradient(135deg, #fecaca, #bfdbfe)";

                  return (
                    <div
                      key={l.id}
                      data-pin
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `calc(${MAP_PIN_PADDING_PX}px + ${pos.xPct} * (100% - ${MAP_PIN_PADDING_PX * 2}px))`,
                        top: `calc(${MAP_PIN_PADDING_PX}px + ${pos.yPct} * (100% - ${MAP_PIN_PADDING_PX * 2}px))`,
                        zIndex: pinHighlight ? 30 : 1,
                      }}
                    >
                      {/* Pin */}
                      <button
                        type="button"
                        onMouseEnter={() => { setHoveredId(l.id); setHoverSource("pin"); }}
                        onMouseLeave={() => { setHoveredId((prev) => (prev === l.id ? null : prev)); setHoverSource(null); }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPinPreview(l.id);
                        }}
                        className={cx(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition-all duration-150 whitespace-nowrap",
                          "focus:outline-none focus:ring-2 focus:ring-zinc-900/20",
                          isHovered || openPinId === l.id
                            ? "bg-zinc-900 text-white shadow-lg scale-110"
                            : isViewed
                              ? "bg-zinc-200 text-zinc-700 ring-1 ring-zinc-900/10 hover:ring-zinc-900/20"
                              : "bg-white text-zinc-900 ring-1 ring-zinc-900/10 hover:ring-zinc-900/20",
                        )}
                        aria-pressed={openPinId === l.id}
                      >
                        {formatRubPrice(l.price)}
                        {favorites.has(l.id) ? (
                          <HeartIcon filled className="!h-3.5 !w-3.5 shrink-0" />
                        ) : null}
                      </button>

                      {/* Popup preview — shown on click, stays until closed */}
                      {openPinId === l.id && !isDraggingMap ? (() => {
                        const popupW = 260;
                        const popupH = 320;
                        const pinPad = 8;

                        // Vertical: show above if pin is in bottom 45%, else below.
                        const showAbove = pos.yPct > 0.55;
                        // Center by default; near map edges clamp popup into visible area.
                        const mapEl = mapRef.current;
                        const mapW = mapEl?.clientWidth ?? 0;
                        const pinXPx = MAP_PIN_PADDING_PX + pos.xPct * Math.max(1, mapW - MAP_PIN_PADDING_PX * 2);
                        const edgeSafe = 12;
                        const alignH =
                          pinXPx - popupW / 2 < edgeSafe
                            ? "left"
                            : pinXPx + popupW / 2 > mapW - edgeSafe
                              ? "right"
                              : "center";

                        const posStyle: React.CSSProperties = {
                          width: popupW,
                          position: "absolute",
                          animation: "fadeInOnly 150ms ease-out both",
                        };

                        if (showAbove) {
                          posStyle.bottom = "100%";
                          posStyle.marginBottom = pinPad;
                        } else {
                          posStyle.top = "100%";
                          posStyle.marginTop = pinPad;
                        }

                        if (alignH === "left") {
                          posStyle.left = 0;
                        } else if (alignH === "right") {
                          posStyle.right = 0;
                        } else {
                          posStyle.left = "50%";
                          posStyle.transform = "translateX(-50%)";
                        }

                        return (
                        <div
                          className="rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
                          style={posStyle}
                        >
                          <div className="relative aspect-[4/3] w-full">
                            <div className="absolute inset-0" style={{ backgroundImage: imageBg }} />
                            <div className="absolute inset-0 bg-black/10" />

                            <div className="absolute right-2 top-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(l.id); }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
                                aria-label="Сохранить"
                              >
                                <HeartIcon filled={favorites.has(l.id)} className={favorites.has(l.id) ? "" : "!text-zinc-700"} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closePinPreview();
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
                                aria-label="Закрыть"
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {/* Carousel dots */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={cx("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-white" : "bg-white/55")} />
                              ))}
                            </div>
                          </div>

                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => openDetails(l.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="truncate text-[14px] font-semibold leading-5 text-zinc-900">
                                Квартира, {city}
                              </div>
                              <div className="shrink-0 text-[13px] text-zinc-900 inline-flex items-center gap-1">
                                <span aria-hidden="true">★</span>
                                <span className="font-medium">{l.rating.toFixed(2).replace(".", ",")}</span>
                                <span className="text-zinc-500">({reviews})</span>
                              </div>
                            </div>
                            <div className="mt-1 text-[13px] text-zinc-600 truncate">Квартира с потрясающим видом</div>
                            <div className="mt-0.5 text-[13px] text-zinc-600">1 спальня · 2 кровати</div>
                            <div className="mt-2 text-[14px] text-zinc-900">
                              <span className="font-semibold">{formatRubPrice(l.price)}</span>{" "}
                              <span className="text-zinc-600">за {nights} ночи</span>
                            </div>
                          </div>
                        </div>
                        );
                      })() : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Center marker */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-900/40" />
          </div>

          {isLoading ? (
            <div className="absolute inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-700 backdrop-blur">
              Map update delay… (300ms debounce)
            </div>
          ) : null}
        </div>

      </section>
      </div>

      {isDatesOpen ? (
        <div
          ref={datesPopoverRef}
          className="fixed z-[90] w-[640px] rounded-[24px] border border-zinc-200 bg-white p-6 shadow-2xl"
          style={{ left: datesPopoverPos.left, top: datesPopoverPos.top }}
        >
          <div className="grid grid-cols-2 gap-8">
            {["Март 2026", "Апрель 2026"].map((month, idx) => (
              <div key={month}>
                <div className="flex items-center justify-between">
                  {idx === 0 ? <span /> : <span className="cursor-pointer text-zinc-400">‹</span>}
                  <div className="text-center text-[16px] font-semibold text-zinc-900">{month}</div>
                  {idx === 0 ? (
                    <span className="cursor-pointer text-zinc-400">›</span>
                  ) : (
                    <span />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[13px]">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className="h-8 w-8 rounded-full text-zinc-400 hover:bg-zinc-100"
                    >
                      {i + 1 <= 31 ? i + 1 : ""}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isPriceOpen ? (
        <div
          ref={pricePopoverRef}
          className="fixed z-[90] w-[640px] rounded-[16px] border border-zinc-200 bg-white p-6 shadow-2xl"
          style={{ left: pricePopoverPos.left, top: pricePopoverPos.top }}
        >
          <div className="grid grid-cols-2 gap-4">
            <label className="flex h-14 items-center justify-between rounded-xl border border-zinc-300 px-4 text-[16px]">
              <input
                inputMode="numeric"
                value={draftMinPrice}
                onChange={(e) => setDraftMinPrice(formatPriceInput(e.target.value))}
                placeholder="от"
                className="w-full bg-transparent text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
              />
              <span className="ml-3 text-zinc-900">₽</span>
            </label>
            <label className="flex h-14 items-center justify-between rounded-xl border border-zinc-300 px-4 text-[16px]">
              <input
                inputMode="numeric"
                value={draftMaxPrice}
                onChange={(e) => setDraftMaxPrice(formatPriceInput(e.target.value))}
                placeholder="до"
                className="w-full bg-transparent text-zinc-900 placeholder:text-zinc-500 focus:outline-none"
              />
              <span className="ml-3 text-zinc-900">₽</span>
            </label>
          </div>
        </div>
      ) : null}

      {isHelpModalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
          onClick={() => setIsHelpModalOpen(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-semibold text-zinc-900">Напишите нам</h2>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Закрыть"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-100 p-6 sm:p-8 text-zinc-800">
              <p className="text-[16px] leading-tight">или попробуйте найти ответ сами - так будет быстрее</p>
              <p className="mt-5 text-[16px] font-medium">Популярные вопросы:</p>
              <div className="mt-4 space-y-2.5 text-[16px]">
                <button type="button" className="block text-left text-blue-600 hover:text-blue-700">
                  Как войти в нужный аккаунт?
                </button>
                <button type="button" className="block text-left text-blue-600 hover:text-blue-700">
                  Как бесплатно разместить объявление?
                </button>
                <button type="button" className="block text-left text-blue-600 hover:text-blue-700">
                  Как правильно ввести адрес?
                </button>
              </div>
              <button
                type="button"
                className="mt-6 rounded-xl bg-blue-100 px-6 py-3 text-[16px] font-semibold text-blue-700 transition-colors hover:bg-blue-200"
              >
                Смотреть все вопросы
              </button>
            </div>

            <div className="mt-7">
              <label className="mb-2 block text-[16px] font-medium text-zinc-800">
                Тема <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-zinc-300 px-5 py-4 text-left text-[16px] text-zinc-400"
              >
                <span>Выберите тему</span>
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-8 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Далее
              </button>
            </div>
          </div>
        </div>
      ) : null}


      {isFiltersModalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
          onClick={() => setIsFiltersModalOpen(false)}
        >
          <div
            className="w-full max-w-[600px] rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-semibold text-zinc-900">Ещё фильтры</h2>
              <button
                type="button"
                onClick={() => setIsFiltersModalOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Закрыть"
              >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-5 text-sm text-zinc-800">
              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Формат бронирования</div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span>Мгновенное бронирование</span>
                </label>
              </div>

              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Условия проживания</div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-md border border-blue-500 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    Неважно
                  </button>
                  <button className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm">
                    Можно с детьми
                  </button>
                  <button className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm">
                    Можно с животными
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Удобства</div>
                <div className="grid grid-cols-2 gap-2">
                  {["Кондиционер", "Интернет", "Холодильник", "Телефон", "Посудомоечная машина", "Стиральная машина"].map(
                    (label) => (
                      <label key={label} className="inline-flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4" />
                        <span>{label}</span>
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Санузел</div>
                <div className="flex flex-wrap gap-2">
                  {["Неважно", "Совмещённый", "Раздельный", "Два и более"].map((label, idx) => (
                    <button
                      key={label}
                      className={cx(
                        "rounded-md border px-3 py-1 text-sm",
                        idx === 0 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Балкон/Лоджия</div>
                <div className="flex flex-wrap gap-2">
                  {["Неважно", "Балкон", "Лоджия"].map((label, idx) => (
                    <button
                      key={label}
                      className={cx(
                        "rounded-md border px-3 py-1 text-sm",
                        idx === 0 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,140px)_1fr] items-start gap-3">
                <div className="pt-1 text-zinc-500">Ванна/Душ</div>
                <div className="flex flex-wrap gap-2">
                  {["Неважно", "Ванна", "Душевая кабина"].map((label, idx) => (
                    <button
                      key={label}
                      className={cx(
                        "rounded-md border px-3 py-1 text-sm",
                        idx === 0 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4 text-sm">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => {
                  // Здесь можно будет сбрасывать реальные фильтры
                  setIsFiltersModalOpen(false);
                }}
              >
                Сбросить фильтры
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                onClick={() => setIsFiltersModalOpen(false)}
              >
                Показать объекты
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
