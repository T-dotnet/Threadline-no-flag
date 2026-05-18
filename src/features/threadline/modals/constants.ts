/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MOCK_CLIENT_DATA, MOCK_EVIDENCE_ITEMS } from "../mockData";

export const GLOBAL_FINDINGS_POOL = [
  ...Object.values(MOCK_CLIENT_DATA).flatMap(data => [
    ...(data.sessions || []).flatMap(s => (s.evidence || []).map((ev: any) => ({ ...ev, sourceSession: s.focus }))),
    ...((data as any).criteria || []).flatMap((i: any) => (i.findings || []).map((f: any) => ({ ...f, sourceSession: i.label }))),
    ...(data.assessments || []).flatMap((i: any) => (i.findings || []).map((f: any) => ({ ...f, sourceSession: i.title }))),
    ...(data.documents || []).flatMap((i: any) => (i.findings || []).map((f: any) => ({ ...f, sourceSession: i.name })))
  ]),
  ...MOCK_EVIDENCE_ITEMS.flatMap((item: any) => (item.findings || []).map((f: any) => ({ ...f, sourceSession: item.label })))
];

export const COMMON_TAGS = [
  "Physical Symptoms", "Social Trigger", "Avoidance", "Anxiety", "Arousal", 
  "Work Stress", "Perfectionism", "Distortion", "Paranoia", "Self-Consciousness",
  "Affective", "Processing Speed", "Progress", "Skill Acquisition", 
  "Mindfulness", "Difficulty", "Symptom Reduction", "Social", "Sensory", 
  "Work", "Communication", "History", "Behavior"
];

export const COMMON_FRAMEWORKS = [
  "Social Anxiety Disorder (SAD)", "Panic Disorder", 
  "Generalized Anxiety Disorder (GAD)", "Cognitive Appraisal", 
  "Depressive Features", "Anxiety Management", "DSM-V", "ICD-11"
];

export const CLINICAL_STATUSES = [
  "Met", "Not Met", "Rule Out", "Deferred", "Inconclusive"
];

export const CLINICAL_FOCUS_OPTIONS = [
  "Social Evaluation", "Mood Regulation", "Cognitive Functioning", 
  "Behavioral Patterns", "Physical Symptoms", "Sensory Processing",
  "Communication Skills", "Emotional Literacy"
];

export const IMPACT_OPTIONS = [
  "High information gain", "Medium information gain", "Quantifies symptom severity",
  "High", "Medium", "Low"
];

export const CONSENT_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "Yes (Digital)", value: "Yes (Digital)" },
  { label: "Yes (Physical Copy)", value: "Yes (Physical Copy)" },
  { label: "Declined", value: "Declined" },
];

export interface AssessmentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const ASSESSMENT_TEMPLATES: AssessmentTemplate[] = [
  {
    id: "gad-7",
    name: "GAD-7 (Generalized Anxiety Disorder)",
    description: "Evaluates the presence and severity of general anxiety symptoms over the past two weeks.",
    category: "Anxiety"
  },
  {
    id: "phq-9",
    name: "PHQ-9 (Patient Health Questionnaire)",
    description: "Multipurpose instrument for screening, diagnosing, monitoring and measuring the severity of depression.",
    category: "Depression"
  },
  {
    id: "wai",
    name: "WAI (Working Alliance Inventory)",
    description: "Assesses the therapeutic bond and agreement on therapy goals.",
    category: "Clinical Alliance"
  },
  {
    id: "asrs-6",
    name: "ASRS-6 (Adult ADHD Screening)",
    description: "Screening scale for adult ADHD based on DSM-V criteria.",
    category: "Neurodivergence"
  },
  {
    id: "dass-21",
    name: "DASS-21 (Depression Anxiety Stress Scale)",
    description: "Measures the negative emotional states of depression, anxiety and stress.",
    category: "General Health"
  },
];
