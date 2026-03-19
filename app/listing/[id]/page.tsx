"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMockListings } from "../../lib/mockListings";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function hashToInt(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 21s-7.2-4.4-9.7-8.6C.4 9 .9 6.4 3 4.8c2.2-1.7 5.2-1.2 7 1 1.8-2.2 4.8-2.7 7-1 2.1 1.6 2.6 4.2.7 7.6C19.2 16.6 12 21 12 21z" />
    </svg>
  );
}

export default function ListingDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  // Должно покрывать все страницы (по 28 объектов на страницу).
  const all = useMemo(() => getMockListings(28 * 3), []);
  const listing = useMemo(() => all.find((l) => l.id === id) ?? null, [all, id]);
  const related = useMemo(() => all, [all]); // always 28 cards as requested

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Back
          </button>
          <div className="text-sm font-semibold">Details (simulated page)</div>
          <div className="w-[60px]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {listing ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-lg font-semibold">{listing.title}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-700">
                <div className="rounded-md bg-zinc-50 px-2 py-1">
                  <span className="text-zinc-500">id</span>{" "}
                  <span className="font-mono text-zinc-900">{listing.id}</span>
                </div>
                <div className="rounded-md bg-zinc-50 px-2 py-1">
                  <span className="text-zinc-500">price</span>{" "}
                  <span className="font-semibold text-zinc-900">${listing.price}</span>
                </div>
                <div className="rounded-md bg-zinc-50 px-2 py-1">
                  <span className="text-zinc-500">rating</span>{" "}
                  <span className="font-semibold text-zinc-900">{listing.rating.toFixed(1)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                <div className="font-semibold text-zinc-900">Context preservation</div>
                <div className="mt-1">
                  This page is intentionally simple. When you go back, the search UI restores:
                  selected item, list scroll position, and simulated map position.
                </div>
              </div>
            </div>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">Похожие варианты</div>
                  <div className="mt-0.5 text-sm text-zinc-600">28 карточек (мок-данные)</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {related.map((l) => {
                  const h = hashToInt(l.id);
                  const isGuestFavorite = h % 4 === 0;
                  const hasFreeCancel = h % 3 === 0;
                  const hasDiscount = h % 5 === 0;
                  const nights = 2 + (h % 3);
                  const city = h % 2 === 0 ? "Батуми" : "Тбилиси";
                  const reviews = 40 + (h % 260);
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

                  const isCurrent = l.id === id;

                  return (
                    <div
                      key={l.id}
                      className={cx(
                        "group rounded-2xl transition-all",
                        isCurrent ? "ring-2 ring-zinc-900/90" : "ring-1 ring-zinc-900/10 hover:ring-zinc-900/20",
                      )}
                    >
                      <div className="relative overflow-hidden rounded-2xl">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/listing/${l.id}`, { scroll: false })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(`/listing/${l.id}`, { scroll: false });
                            }
                          }}
                          className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                          aria-label={`Открыть ${l.id}`}
                        >
                          <div className="relative aspect-[4/3] w-full">
                            <div className="absolute inset-0" style={{ backgroundImage: imageBg }} />
                            <div className="absolute inset-0 bg-black/10" />

                            {isGuestFavorite ? (
                              <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm">
                                Выбор гостей
                              </div>
                            ) : null}

                            <div className="absolute right-3 top-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="grid h-9 w-9 place-items-center rounded-full bg-black/30 backdrop-blur transition-colors hover:bg-black/40"
                                aria-label="Сохранить"
                              >
                                <HeartIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-1 pt-3 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-semibold leading-5 text-zinc-900">
                              Квартира, {city}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm text-zinc-900">
                            <span className="inline-flex items-center gap-1">
                              <span aria-hidden="true">★</span>
                              <span className="font-medium">{l.rating.toFixed(2).replace(".", ",")}</span>
                              <span className="text-zinc-500">({reviews})</span>
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 space-y-0.5 text-sm text-zinc-600">
                          <div className="truncate">Квартира с потрясающим видом от Wehost</div>
                          <div className="truncate">1 спальня · 2 кровати</div>
                        </div>

                        <div className="mt-2 text-sm text-zinc-900">
                          {hasDiscount ? (
                            <span className="mr-1 text-zinc-500 line-through">
                              {Math.round(l.price * 1.18).toLocaleString("ru-RU")}₽
                            </span>
                          ) : null}
                          <span className="font-semibold">{Math.round(l.price * 105).toLocaleString("ru-RU")}₽</span>{" "}
                          <span className="text-zinc-600">за {nights} ночи</span>
                        </div>

                        {hasFreeCancel ? (
                          <div className="mt-2 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                            Бесплатная отмена
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold">Listing not found</div>
            <div className="mt-1 text-sm text-zinc-600">
              This is a mock-details route. Try going back and selecting a listing again.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

