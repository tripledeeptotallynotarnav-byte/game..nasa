import React from 'react';
import { SCIENCE_GLOSSARY, ScienceTerm } from '../data/nasaTelemetry';
import { missionAudio } from '../utils/audio';

interface ScienceTermButtonProps {
  termKey: keyof typeof SCIENCE_GLOSSARY;
  label?: string;
  onSelectTerm: (term: ScienceTerm) => void;
  className?: string;
}

export const ScienceTermButton: React.FC<ScienceTermButtonProps> = ({
  termKey,
  label,
  onSelectTerm,
  className = '',
}) => {
  const entry = SCIENCE_GLOSSARY[termKey];
  if (!entry) return <span>{label ?? termKey}</span>;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        missionAudio.playClick();
        onSelectTerm(entry);
      }}
      title={`Decode: ${entry.term} — click for kid-friendly NASA fact`}
      className={`inline-flex items-baseline font-medium text-cyan-300 hover:text-cyan-200 border-b border-dotted border-cyan-400/75 hover:border-cyan-300 cursor-help transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 focus-visible:outline-offset-2 rounded-xs ${className}`}
    >
      {label ?? entry.term}
    </button>
  );
};
