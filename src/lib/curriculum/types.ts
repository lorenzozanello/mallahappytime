import type { DimensionKey, ExperienceFieldKey, SectionKey } from './sections';

export type LevelId = 'step-1' | 'step-2' | 'step-3' | 'kinder' | 'transicion';
export type PeriodNumber = 1 | 2 | 3 | 4;

/** Where a piece of content came from inside the source workbook. */
export interface SourceReference {
  file: string;
  sheet: string;
  cell: string;
}

export interface CurriculumVersion {
  id: string;
  label: string;
  effectiveDate: string;
  sourceFile: string;
  sourceSha256: string;
}

export interface CurriculumLevel {
  id: LevelId;
  /** Short code used in canonical IDs: S1, S2, S3, K, T. */
  code: string;
  name: string;
  order: number;
  cycle: string;
  equivalence: string;
  entryAge: string;
  exitAge: string;
  entryProfile: string;
  exitProfile: string;
  sourceRow: number;
}

export interface ActivityParts {
  tema: string;
  competencia: string;
  avance: string;
  evidencia: string;
}

export interface Purpose {
  number: number;
  /** The general purpose statement (shared across experiences). */
  statement: string;
  /** "En esta experiencia se logra cuando…" — experience-specific realisation. */
  realization: string;
}

export interface CurriculumExperience {
  /** Canonical ID, e.g. HT-S2-P3. */
  id: string;
  levelId: LevelId;
  period: PeriodNumber;
  periodLabel: string;
  periodCode: string;
  title: string;
  /** Verbatim workbook text for every curricular column. */
  fields: Record<ExperienceFieldKey, string>;
  purposes: Purpose[];
  activities: Record<'juego' | 'exploracion' | 'literatura' | 'arte', ActivityParts>;
  documentation: { documentacion: string; alertas: string };
  sourceRow: number;
}

export interface DevelopmentSummary {
  id: string;
  levelId: LevelId;
  dimension: DimensionKey;
  content: string;
  sourceReference: SourceReference;
}

export interface InstitutionalPrinciple {
  id: string;
  order: number;
  content: string;
  sourceReference: SourceReference;
}

export type Authority = 'institutional';
export type ChunkStatus = 'active' | 'retired';

export interface CurriculumChunk {
  id: string;
  curriculumVersion: string;
  levelId: LevelId | null;
  period: PeriodNumber | null;
  experienceId: string | null;
  section: SectionKey;
  subsection: string | null;
  content: string;
  tags: string[];
  authority: Authority;
  sourceReference: SourceReference;
  contentHash: string;
  status: ChunkStatus;
  updatedAt: string;
}

export interface ImportIssue {
  kind: 'ambiguity' | 'normalization';
  location: string;
  description: string;
}

export interface CurriculumCorpus {
  version: CurriculumVersion;
  levels: CurriculumLevel[];
  experiences: CurriculumExperience[];
  developmentSummaries: DevelopmentSummary[];
  principles: InstitutionalPrinciple[];
  chunks: CurriculumChunk[];
  issues: ImportIssue[];
}
