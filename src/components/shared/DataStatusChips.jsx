"use client";

import React from "react";
import FootballMediaImage from "@/components/shared/FootballMediaImage";

function createChip(label, tone = "neutral") {
  const toneClassName =
    tone === "success"
      ? "bg-primary/10 text-primary border-primary/20"
      : tone === "warning"
        ? "bg-accent/10 text-accent border-accent/20"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-secondary/50 text-muted-foreground border-border/30";

  return (
    <span
      key={`${tone}:${label}`}
      className={`px-2 py-1 rounded-full border text-xs ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function formatSourceLabel(source) {
  const normalizedSource = String(source || "").trim().toLowerCase();

  if (normalizedSource === "sportmonks_api") return "Feed Sportmonks";
  if (normalizedSource === "sportmonks_live_latest") return "Sync live incrementale";
  if (normalizedSource === "sportmonks_cache") return "Cache provider";
  if (normalizedSource === "not_implemented") return "Non implementato";
  if (normalizedSource === "provider_unavailable") return "Feed non disponibile";
  if (normalizedSource === "local_snapshot") return "Fallback snapshot locale";
  if (normalizedSource === "local_mock_data") return "Fallback locale dichiarato";
  if (normalizedSource === "route_error") return "Errore route";
  return source || "Sorgente non disponibile";
}

function formatFreshnessLabel(freshness) {
  if (!freshness?.updatedAt) {
    return null;
  }

  if (freshness.state === "stale") {
    return "Freshness: stale";
  }

  return "Freshness: fresh";
}

function formatPredictionProviderLabel(provider) {
  if (!provider) return null;
  if (provider === "sportmonks_predictions") return "Predizioni: Sportmonks";
  if (provider === "derived_internal_model") return "Predizioni: modello derivato";
  if (provider === "fallback_local_model") return "Predizioni: fallback locale";
  return `Predizioni: ${provider}`;
}

function formatOddsProviderLabel(provider) {
  if (!provider) return null;
  if (provider === "not_available_with_current_feed") return "Quote contestuali: non disponibili";
  if (provider === "derived_live_model") return "Live odds: stima derivata";
  if (provider === "sportmonks_pre_match_odds") return "Quote pre-match: Sportmonks";
  return `Quote: ${provider}`;
}

function formatLineupStatusLabel(status) {
  if (!status || status === "unknown") return "Lineup status: unknown";
  if (status === "official") return "Lineup status: official";
  if (status === "probable") return "Lineup status: probable";
  if (status === "expected") return "Lineup status: expected";
  return `Lineup status: ${status}`;
}

export default function DataStatusChips({
  provider,
  source,
  freshness,
  competition,
  leagueMedia,
  predictionProvider,
  oddsProvider,
  lineupStatus,
  notice,
}) {
  const chips = [];

  if (provider) {
    chips.push(createChip(`Provider: ${provider}`, "success"));
  }

  if (source) {
    chips.push(
      createChip(
        formatSourceLabel(source),
        source.includes("local") || source.includes("fallback") || source === "provider_unavailable"
          ? "warning"
          : "neutral"
      )
    );
  }

  const freshnessLabel = formatFreshnessLabel(freshness);
  if (freshnessLabel) {
    chips.push(
      createChip(
        freshnessLabel,
        freshness?.state === "stale" ? "warning" : "success"
      )
    );
  }

  if (competition?.name) {
    chips.push(createChip(`Competition: ${competition.name}`, "neutral"));
  }

  const predictionLabel = formatPredictionProviderLabel(predictionProvider);
  if (predictionLabel) {
    chips.push(
      createChip(
        predictionLabel,
        predictionProvider === "derived_internal_model" ? "warning" : "success"
      )
    );
  }

  const oddsLabel = formatOddsProviderLabel(oddsProvider);
  if (oddsLabel) {
    chips.push(
      createChip(
        oddsLabel,
        oddsProvider === "not_available_with_current_feed" ? "warning" : "neutral"
      )
    );
  }

  if (lineupStatus) {
    chips.push(
      createChip(
        formatLineupStatusLabel(lineupStatus),
        lineupStatus === "official" ? "success" : "neutral"
      )
    );
  }

  if (notice) {
    chips.push(createChip(notice, "warning"));
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {leagueMedia && (
        <FootballMediaImage
          media={leagueMedia}
          fallbackLabel={competition?.name || "Competition"}
          alt={competition?.name || ""}
          size="xs"
          shape="square"
          className="ring-1 ring-border/30"
        />
      )}
      {chips}
    </div>
  );
}
