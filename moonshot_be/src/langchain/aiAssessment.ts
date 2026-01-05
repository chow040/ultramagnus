import { ChatPromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { reports } from '../db/schema.js';
import { config } from '../config/env.js';
import { REPORT_PROMPT } from '../services/aiAnalysisService.js';
import { logger } from '../utils/logger.js';

export interface AssessmentSnapshot {
  verdict?: string;
  priceTarget?: string | number;
  valuation?: { intrinsicValue?: number | null };
  fundamentalAnalysis?: { valuation?: { intrinsicValue?: number | null } };
  shortTermFactors?: { positive?: { title?: string; detail?: string }[]; negative?: { title?: string; detail?: string }[] };
  longTermFactors?: { positive?: { title?: string; detail?: string }[]; negative?: { title?: string; detail?: string }[] };
  earningsCallAnalysis?: { sentiment?: string; summary?: string; keyTakeaways?: string[] };
  verdictReason?: string;
  summary?: string;
  history?: { previousVerdict?: string | null; previousDate?: string | null; changeRationale?: string[] };
  [key: string]: unknown;
}

export interface StoredAssessment {
  reportId: string;
  ticker: string;
  createdAt?: Date | null;
  snapshot: AssessmentSnapshot;
}

export interface MaterialityResult {
  isMaterial: boolean;
  materialityLevel?: string;
  verdictChanged?: boolean;
  targetPriceChangePct?: number | null;
  consistencyFlag?: boolean;
  overrideJustification?: string | null;
  whatChanged?: string[];
  whyItMatters?: string[];
  changeLogText?: string;
}

const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value);
  } catch (err) {
    logger.warn({ message: 'aiAssessment.stringify_failure', err });
    return 'null';
  }
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getLatestAssessment = async (ownerId: string | null | undefined, ticker: string): Promise<StoredAssessment | null> => {
  if (!ownerId || !UUID_REGEX.test(ownerId)) return null;

  const rows = await db.select({
    id: reports.id,
    ticker: reports.ticker,
    createdAt: reports.createdAt,
    payload: reports.payload
  })
    .from(reports)
    .where(and(eq(reports.ownerId, ownerId), eq(reports.ticker, ticker)))
    .orderBy(desc(reports.createdAt))
    .limit(1);

  const row = rows?.[0];
  if (!row) return null;

  return {
    reportId: row.id,
    ticker: row.ticker,
    createdAt: row.createdAt,
    snapshot: (row as any)?.payload as AssessmentSnapshot
  };
};

export interface AssessmentChainParams {
  ownerId?: string;
  ticker: string;
}

const runMaterialityComparator = async (previous: AssessmentSnapshot | null, current: AssessmentSnapshot): Promise<MaterialityResult> => {
  if (!previous) {
    return {
      isMaterial: false,
      verdictChanged: false,
      targetPriceChangePct: null,
      whatChanged: [],
      whyItMatters: []
    };
  }

  const comparatorPrompt = ChatPromptTemplate.fromTemplate(`
You are a senior equity analyst. Compare two assessments (previous vs current) and judge materiality.

Rules:
- Mark material only if thesis, risk profile, valuation anchor, or core drivers changed.
- Ignore wording/phrasing differences if meaning is the same.
- Headlines alone are not material.
- If verdict/target changed, explain why; if no meaningful change, mark non-material.

Return ONLY JSON:
{{
  "material_change": boolean,
  "materiality_level": "none" | "low" | "medium" | "high",
  "verdict_change": boolean,
  "target_price_change_pct": number | null,
  "consistency_flag": boolean,
  "override_justification": string | null,
  "what_changed": ["bullet"],
  "why_it_matters": ["bullet"]
}}

Previous Assessment:
{previous_assessment_json}

Current Assessment:
{current_assessment_json}
`);

  const parser = new JsonOutputParser<{
    material_change: boolean;
    materiality_level?: string;
    verdict_change?: boolean;
    target_price_change_pct?: number | null;
    consistency_flag?: boolean;
    override_justification?: string | null;
    what_changed?: string[];
    why_it_matters?: string[];
  }>();

  const model = new ChatGoogleGenerativeAI({
    model: config.geminiAnalyzeModel,
    apiKey: config.geminiApiKey,
    temperature: 0
  });

  const chain = comparatorPrompt.pipe(model).pipe(parser);
  const result = await chain.invoke({
    previous_assessment_json: safeStringify(previous),
    current_assessment_json: safeStringify(current)
  });

  return {
    isMaterial: Boolean(result.material_change),
    materialityLevel: result.materiality_level,
    verdictChanged: Boolean(result.verdict_change),
    targetPriceChangePct: result.target_price_change_pct ?? null,
    consistencyFlag: Boolean(result.consistency_flag),
    overrideJustification: result.override_justification || null,
    whatChanged: result.what_changed || [],
    whyItMatters: result.why_it_matters || [],
    changeLogText: (result.what_changed || []).join(' ')
  };
};

export const runAssessmentChain = async (
  params: AssessmentChainParams
): Promise<{
  report: AssessmentSnapshot;
  previous?: StoredAssessment | null;
  materiality: MaterialityResult;
}> => {
  const { ownerId, ticker } = params;
  const previous = await getLatestAssessment(ownerId, ticker);

  const model = new ChatGoogleGenerativeAI({
    model: config.geminiAnalyzeModel,
    apiKey: config.geminiApiKey,
    temperature: 0,
    // Allow grounded lookups to reduce hallucinations (parity with stream-report)
    // SDK typing does not yet expose `tools`; use ts-expect-error to pass through.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error tools not in current GoogleGenerativeAIChatInput types
    tools: [{ googleSearch: {} }]
  });

  const parser = new JsonOutputParser<AssessmentSnapshot>();
  const prompt = ChatPromptTemplate.fromTemplate(`
{base_prompt}

### Memory Context
Previous Assessment (JSON or "None"):
{previous_assessment_json}

### Consistency Instructions
- If fundamentals and evidence_hash are unchanged, maintain the prior verdict and target price unless you include a clear rationale in history.changeRationale.
- When you change verdict or target price, explain why in history.changeRationale and set history.previousVerdict.
- Return ONLY valid JSON that matches the schema above. Do not include markdown fences or commentary.
  `);

  const chain = prompt.pipe(model).pipe(parser);
  const report = await chain.invoke({
    base_prompt: REPORT_PROMPT(ticker),
    previous_assessment_json: previous ? safeStringify(previous.snapshot) : 'None'
  });

  const materiality = await runMaterialityComparator(previous?.snapshot || null, report);

  // Build change rationale for UI/history
  if (previous) {
    const bullets = (materiality.whatChanged && materiality.whatChanged.length)
      ? materiality.whatChanged
      : ['No material change detected; thesis held consistent with prior assessment.'];

    report.history = {
      previousDate: previous.createdAt?.toISOString?.() || '',
      previousVerdict: previous.snapshot.verdict || 'HOLD',
      changeRationale: bullets
    };

    materiality.changeLogText = bullets.join(' ');

    // Guardrail: if not material, reuse prior verdict/target price to avoid drift
    if (!materiality.isMaterial) {
      if (previous.snapshot.verdict) {
        report.verdict = previous.snapshot.verdict as any;
      }
      if (previous.snapshot.priceTarget) {
        report.priceTarget = previous.snapshot.priceTarget as any;
      }
    }
  }

  // Persist materiality alongside report payload for UI
  (report as any)._materiality = materiality;

  return { report, previous, materiality };
};
