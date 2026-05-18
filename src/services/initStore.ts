/**
 * PERSISTENCE: This script initializes the localStorage store from mock data.
 * It's intended to be called once at application startup.
 */

import { useClinicalStore } from "./store";
import { 
  MOCK_CLIENTS, 
  MOCK_CLIENT_DATA, 
  MOCK_ASSESSMENTS, 
  MOCK_DOCUMENTS, 
} from "../features/threadline/mockData";

export function initStoreFromMockData() {
  const clinicalStore = useClinicalStore.getState();
  
  // Check if store is already initialized by checking if any clients exist
  if (clinicalStore.clients.length > 0) {
    console.info("PERSISTENCE: Store already initialized. Skipping mock seed.");
    return;
  }

  console.info("PERSISTENCE: Initializing store from mock data...");

  // 1. Clients
  const clients = MOCK_CLIENTS.map(c => ({
    id: c.id,
    name: c.name,
    extId: c.extId,
    clinicians: c.clinicians,
    ref: "Dr. Smith",
    consent: !!c.consent,
    hasConflicts: !!(MOCK_CLIENT_DATA as any)[c.id]?.conflicts?.length,
    missingDocs: (MOCK_CLIENT_DATA as any)[c.id]?.missingDocuments?.map((d: any) => d.id) || [],
    clinicalNotes: [],
    lastUpdated: new Date().toISOString()
  }));
  clinicalStore.setClients(clients);

  // 2. Per-client data
  clients.forEach(client => {
    const clientSpecificData = (MOCK_CLIENT_DATA as any)[client.id];
    
    // Assessments
    const assessments = (clientSpecificData?.assessments || MOCK_ASSESSMENTS).map((a: any, idx: number) => ({
      id: a.id || `asmt-${client.id}-${idx}`,
      title: a.title,
      subtitle: a.subtitle || "Standard Extract",
      status: a.status || "Ready",
      date: a.date,
      description: a.description,
      notes: a.notes,
      overallImpression: a.overallImpression,
      score: a.score,
      percentile: a.percentile,
      descriptor: a.descriptor,
      lifecycleState: (a.status === "ready" ? "in-progress" : (a.status === "Review Pass" ? "completed" : "created")) as any,
      reviewedSections: [],
      reportApproved: false
    }));
    clinicalStore.setAssessments(client.id, assessments);

    // Sessions
    const sessions = (clientSpecificData?.sessions || []).map((s: any) => ({
      id: s.id,
      date: s.date,
      focus: s.focus,
      notes: s.notes,
      score: s.score,
      relevanceCause: s.relevanceCause
    }));
    clinicalStore.setSessions(client.id, sessions);

    // Documents
    const documents = (clientSpecificData?.documents || MOCK_DOCUMENTS).map((d: any) => ({
      id: d.id || d.name,
      name: d.name,
      type: d.type || "Other",
      status: d.status || "Uploaded",
      uploadDate: d.uploadDate || "15 Dec 2025",
      creationDate: d.creationDate || "15 Dec 2025",
      version: d.version || "v1.0",
      uploadedAt: new Date().toISOString()
    }));
    documents.forEach((d: any) => clinicalStore.addDocument(client.id, d));
  });

  console.info("PERSISTENCE: Seed complete.");
}
