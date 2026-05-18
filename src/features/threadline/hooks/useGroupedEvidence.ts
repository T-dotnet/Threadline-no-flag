import { useMemo } from 'react';

function toTagArray(tags: any): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  return ['untagged'];
}

export function useGroupedEvidence(
  localSessions: any[],
  assessmentItems: any[],
  documentItems: any[],
  evidenceItems: any[] = []
) {
  return useMemo(() => {
    const allEvidenceSnippets = [
      ...localSessions.flatMap(s => (s.evidence || []).map((f: any) => ({
        ...f,
        sourceSession: s.focus || s.description || 'Clinical Snapshot',
        sourceTimestamp: s.date,
        sessionId: s.id,
        notes: s.notes
      }))),
      ...assessmentItems.flatMap(a => (a.findings || []).map((f: any) => ({
        ...f,
        sourceSession: a.label,
        sourceTimestamp: a.date || "Apr 21, 2024",
        sourceAssessmentId: a.id,
        notes: a.notes
      }))),
      ...documentItems.flatMap(d => (d.findings || []).map((f: any) => ({
        ...f,
        sourceSession: d.label,
        sourceTimestamp: d.date || d.creationDate || "Apr 21, 2024",
        sourceDocumentId: d.id,
        notes: d.notes
      }))),
      ...evidenceItems.map(f => ({
        ...f,
        sourceSession: f.sessionSource || f.sourceDocumentName || 'Evidence',
        sourceTimestamp: f.timestamp || f.date,
        sessionId: f.sessionId,
        sourceAssessmentId: f.sourceAssessmentId,
        sourceDocumentId: f.sourceDocumentId,
      }))
    ];

    const tagsMap = new Map<string, any[]>();
    allEvidenceSnippets.forEach(snippet => {
      const tags = toTagArray(snippet.tags ?? snippet.tag);
      tags.forEach((t: string) => {
        const lowerT = t.toLowerCase();
        if (!tagsMap.has(lowerT)) tagsMap.set(lowerT, []);
        tagsMap.get(lowerT)!.push(snippet);
      });
    });

    const tagGroups = Array.from(tagsMap.entries()).map(([tag, items]) => ({
      id: `tag-${tag}`,
      label: tag.charAt(0).toUpperCase() + tag.slice(1),
      type: 'tag' as const,
      score: items[0]?.score || "0.95",
      findings: items
    })).sort((a, b) => b.findings.length - a.findings.length);

    return { tagGroups, allEvidenceSnippets };
  }, [localSessions, assessmentItems, documentItems, evidenceItems]);
}
