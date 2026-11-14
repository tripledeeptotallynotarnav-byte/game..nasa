import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Database,
  Lock,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import {
  DataLogCategory,
  NASA_ARCHIVE_ENTRIES,
} from '../data/campaignArc';
import {
  DilemmaChoice,
  DilemmaEvent,
  MEDA_ARCHIVE_SOLS,
  NasaFlareRecord,
  ScienceTerm,
} from '../data/nasaTelemetry';
import { DebriefReport } from '../game/simulation';
import { DonkiFetchResult } from '../utils/nasaApi';
import { missionAudio } from '../utils/audio';

interface DilemmaModalProps {
  dilemma: DilemmaEvent;
  sol: number;
  onChoose: (choice: DilemmaChoice) => void;
  onOpenScienceLog: () => void;
}

export const DilemmaModal: React.FC<DilemmaModalProps> = ({
  dilemma,
  sol,
  onChoose,
  onOpenScienceLog,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dilemma-title"
      className="fixed inset-0 z-40 bg-slate-950/80 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
            Sol {sol} Mission Dilemma
          </span>
          <button
            type="button"
            onClick={() => {
              missionAudio.playClick();
              onOpenScienceLog();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            NASA Data Source: {dilemma.nasaSourceLabel}
          </button>
        </div>

        <h2 id="dilemma-title" className="text-2xl font-bold text-white">
          {dilemma.title}
        </h2>
        <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
          {dilemma.description}
        </p>

        <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-[#0B1220] border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{dilemma.commDelayNote}</span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {dilemma.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => {
                missionAudio.playClick();
                onChoose(choice);
              }}
              className="text-left p-4 rounded-xl bg-[#0B1220] hover:bg-slate-800/90 border border-slate-700 hover:border-cyan-400 transition-colors cursor-pointer flex flex-col justify-between gap-3 focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <div>
                <h3 className="text-base font-semibold text-white">{choice.label}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {choice.summary}
                </p>
              </div>
              <p className="text-xs font-mono text-cyan-300 pt-2 border-t border-slate-800">
                {choice.tradeoffHint}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ScienceLogModalProps {
  donkiResult: DonkiFetchResult;
  activeSol: number;
  unlockedLogIds: string[];
  onClose: () => void;
}

const ARCHIVE_CATEGORIES: Array<'All' | DataLogCategory> = [
  'All',
  'Mars Science & ISRU',
  'Jezero Geological Waypoints',
  'Historical Rover Discoveries',
];

export const ScienceLogModal: React.FC<ScienceLogModalProps> = ({
  donkiResult,
  activeSol,
  unlockedLogIds,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | DataLogCategory>('All');
  const weather = MEDA_ARCHIVE_SOLS[Math.min(activeSol - 1, MEDA_ARCHIVE_SOLS.length - 1)];

  const unlockedSet = useMemo(() => new Set(unlockedLogIds), [unlockedLogIds]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NASA_ARCHIVE_ENTRIES.filter((entry) => {
      if (selectedCategory !== 'All' && entry.category !== selectedCategory) return false;
      if (!q) return true;
      const isUnlocked = unlockedSet.has(entry.id);
      const haystack = isUnlocked
        ? `${entry.title} ${entry.category} ${entry.summary} ${entry.nasaFact} ${entry.source} ${entry.telemetryTag}`
        : `${entry.title} ${entry.category} ${entry.unlockHint}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [searchQuery, selectedCategory, unlockedSet]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="science-log-title"
      className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-3 sm:p-4"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0F172A] border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="science-log-title" className="text-lg sm:text-xl font-bold text-white">
                NASA Science & Telemetry Log
              </h2>
              <p className="text-xs font-mono text-cyan-300">
                {unlockedLogIds.length} / {NASA_ARCHIVE_ENTRIES.length} Archive Entries Decrypted
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close NASA Science Log"
            onClick={() => {
              missionAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Telemetry Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-cyan-300">NASA / CCMC DONKI Solar Monitor</span>
              <span className="font-mono text-[11px] text-slate-400">
                {donkiResult.mode === 'LIVE_NASA_DONKI' ? 'Live API' : 'Verified Archive'}
              </span>
            </div>
            <p className="text-slate-300 leading-snug">{donkiResult.statusNote}</p>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
              {donkiResult.flares.slice(0, 3).map((flare: NasaFlareRecord) => (
                <span
                  key={flare.id}
                  className="px-2 py-0.5 rounded bg-[#0F172A] border border-slate-700 text-amber-300"
                >
                  {flare.classType} · +{flare.radBoostMsv} mSv
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-emerald-300">Perseverance MEDA Sol {activeSol}</span>
              <span className="font-mono text-[11px] text-slate-400">{weather.nasaSourceId}</span>
            </div>
            <p className="text-slate-300 leading-snug">
              Pressure <strong>{weather.pressurePa} Pa</strong> · Low{' '}
              <strong>{weather.tempMinC}°C</strong> · Dust Tau <strong>{weather.tau}</strong> ·{' '}
              Wind <strong>{weather.windMs} m/s</strong>.
            </p>
            <p className="text-[11px] font-mono text-slate-400">
              Curiosity RAD Ambient Baseline: 0.67 mSv/Sol
            </p>
          </div>
        </div>

        {/* Search Bar & Category Filter Buttons */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              data-testid="archive-search"
              aria-label="Search NASA Data Log Archive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Mars logs, MOXIE, Jezero waypoints, rovers..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0B1220] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Archive Categories">
            {ARCHIVE_CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    missionAudio.playClick();
                    setSelectedCategory(category);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-[#0B1220] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Archive Entries Grid */}
        {filteredEntries.length === 0 ? (
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-6 text-center text-sm text-slate-400">
            No matching archive entries found. Clear search or switch categories.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredEntries.map((entry) => {
              const isUnlocked = unlockedSet.has(entry.id);
              return (
                <article
                  key={entry.id}
                  data-testid={`archive-entry-${entry.id}`}
                  data-unlocked={isUnlocked ? 'true' : 'false'}
                  className={`rounded-xl p-4 border flex flex-col justify-between gap-2.5 ${
                    isUnlocked
                      ? 'bg-[#0B1220] border-slate-700'
                      : 'bg-[#080D18] border-slate-800/80'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="text-slate-400 truncate">{entry.category}</span>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 shrink-0">
                          <Unlock className="w-3 h-3" aria-hidden="true" />
                          {entry.telemetryTag}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400 shrink-0">
                          <Lock className="w-3 h-3" aria-hidden="true" />
                          CLASSIFIED
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white">
                      {isUnlocked ? entry.title : `Encrypted Signal: ${entry.title}`}
                    </h3>

                    {isUnlocked ? (
                      <>
                        <p className="text-xs text-slate-300 leading-relaxed">{entry.summary}</p>
                        <div className="p-2.5 rounded-lg bg-[#0F172A] border border-slate-800 text-xs text-cyan-200 leading-relaxed">
                          <strong className="text-amber-300">NASA Fact: </strong>
                          {entry.nasaFact}
                        </div>
                      </>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[#0F172A] border border-amber-500/25 text-xs text-amber-200/90 font-mono leading-relaxed">
                        [TELEMETRY LOCKED] {entry.unlockHint}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800/80">
                    {isUnlocked ? `Source: ${entry.source}` : 'Complete mission actions to decrypt'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface ScienceDecoderModalProps {
  term: ScienceTerm;
  onClose: () => void;
}

export const ScienceDecoderModal: React.FC<ScienceDecoderModalProps> = ({ term, onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decoder-title"
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-[#0F172A] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Science Decoder
          </span>
          <button
            type="button"
            aria-label="Close Science Decoder"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 id="decoder-title" className="text-xl font-bold text-white">
          {term.term} — {term.shortTitle}
        </h2>
        <p className="mt-2.5 text-sm text-slate-200 leading-relaxed">{term.explanation}</p>
        <div className="mt-4 p-3 rounded-xl bg-[#0B1220] border border-slate-800">
          <p className="text-xs font-semibold text-amber-300 mb-1">Real NASA Fact</p>
          <p className="text-xs text-slate-300 leading-relaxed">{term.nasaFact}</p>
          <p className="text-[11px] font-mono text-slate-500 mt-2">Source: {term.source}</p>
        </div>
      </div>
    </div>
  );
};

interface DebriefModalProps {
  debrief: DebriefReport;
  onReplay: () => void;
}

export const DebriefModal: React.FC<DebriefModalProps> = ({ debrief, onReplay }) => {
  const isVictory = debrief.outcome === 'VICTORY';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="debrief-title"
      className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl bg-[#0F172A] border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          {isVictory ? (
            <Award className="w-7 h-7 text-emerald-400" aria-hidden="true" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-rose-400" aria-hidden="true" />
          )}
          <span
            className={`text-xs font-mono uppercase tracking-wider ${
              isVictory ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isVictory ? '10-Sol Mission Accomplished' : 'Emergency Evacuation Report'}
          </span>
        </div>

        <h2 id="debrief-title" className="text-3xl font-bold text-white">
          {debrief.overallRank}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {isVictory
            ? 'Your 4-person Jezero crew completed all 10 Martian Sols and handed over a thriving outpost.'
            : debrief.defeatReason}
        </p>

        {/* 3 Graded Pillars */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Crew Safety</p>
            <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">
              {debrief.crewSafetyGrade}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Final Health: {debrief.finalResources.crewHealthPct}%
            </p>
          </div>
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Resource Efficiency</p>
            <p className="text-3xl font-bold font-mono text-cyan-400 mt-1">
              {debrief.resourceEfficiencyGrade}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Battery: {debrief.finalResources.powerKwh} kWh · O₂: {debrief.finalResources.lifeSupportPct}%
            </p>
          </div>
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Science Discovered</p>
            <p className="text-3xl font-bold font-mono text-amber-400 mt-1">
              {debrief.scienceGrade}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {debrief.finalResources.sciencePoints} Discovery Pts
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            Sols Completed: {debrief.solsCompleted} / 10 · Mission Score: {debrief.totalScore}
          </div>
          <button
            type="button"
            data-start="true"
            onClick={() => {
              missionAudio.playSolAdvance();
              onReplay();
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Replay With New Strategy
          </button>
        </div>
      </div>
    </div>
  );
};
