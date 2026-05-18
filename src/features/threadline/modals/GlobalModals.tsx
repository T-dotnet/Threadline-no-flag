/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Toast } from "@ui/index";
import { MOCK_EVIDENCE_ITEMS } from "../mockData";
import { useAppStore, useClinicalStore } from "@/services/store";
import { AddEvidenceTypeModal } from "./AddEvidenceTypeModal";
import { ModifyModal } from "./ModifyModal";
import { CreateSessionModal } from "./CreateSessionModal";
import { StartAssessmentModal } from "./StartAssessmentModal";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { SkipNextStepModal } from "./SkipNextStepModal";
import { CognitiveLoopModal } from "./CognitiveLoopModal";

export function GlobalModals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeClientId, activeAssessmentId } = useAppStore();
  const clinicalStore = useClinicalStore();
  const modalType = searchParams.get("modal");
  const itemId = searchParams.get("itemId");
  const [showToast, setShowToast] = useState(false);
  
  const closeModal = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("modal");
    newParams.delete("itemId");
    setSearchParams(newParams);
  };

  if (!modalType) return null;

  // Try to find the real item from mock data if itemId is present
  const realItem = itemId ? MOCK_EVIDENCE_ITEMS.find(i => i.label === itemId) : null;

  const mockItem = realItem || { 
    type: 'evidence', 
    label: 'Behavioural pattern', 
    impact: 'Moderate',
    findings: [
      { id: 'f1', text: 'Significant impairment in social communication', tags: ['Social'], included: true, framework: "Panic Disorder" },
      { id: 'f2', text: 'Elevated tactile sensitivity reported', tags: ['Sensory'], included: true, framework: "Anxiety Management" }
    ]
  };

  const handleSave = (updatedData: any) => {
    // Persist modification to the evidence decision store
    if (activeClientId && activeAssessmentId && itemId) {
      const existing = clinicalStore.getEvidenceDecisions(activeClientId, activeAssessmentId);
      const now = new Date().toISOString();
      const existingIdx = existing.modifiedItems.findIndex(m => m.id === itemId);
      const modifiedItems = existingIdx >= 0
        ? existing.modifiedItems.map((m, i) =>
            i === existingIdx ? { ...m, newValue: updatedData, timestamp: now } : m
          )
        : [...existing.modifiedItems, { id: itemId, originalValue: realItem, newValue: updatedData, timestamp: now }];
      clinicalStore.setEvidenceDecisions(activeClientId, activeAssessmentId, { ...existing, modifiedItems });
    }

    setShowToast(true);
    closeModal();
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleAddEvidenceSelect = (type: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (type === 'session') {
      newParams.set("modal", "create_session");
    } else if (type === 'assessment') {
      newParams.set("modal", "start_assessment");
    } else if (type === 'document') {
      newParams.set("modal", "upload_document");
    } else {
      newParams.set("modal", "modify");
      newParams.set("addMode", "true");
      newParams.set("addType", type);
    }
    setSearchParams(newParams);
  };

  const isAddMode = searchParams.get("addMode") === "true";
  const addType = (searchParams.get("addType") || "criteria") as any;

  return (
    <>
      <AddEvidenceTypeModal
        isOpen={modalType === "add_evidence"}
        onClose={closeModal}
        onSelect={handleAddEvidenceSelect as any}
      />
      <ModifyModal 
        isOpen={modalType === "modify"} 
        onClose={closeModal} 
        item={isAddMode ? null : mockItem} 
        isAddMode={isAddMode}
        addType={addType}
        onSave={handleSave} 
      />
      <CreateSessionModal
        isOpen={modalType === "create_session"}
        onClose={closeModal}
        onSessionCreate={(info) => {
          console.log("Session created:", info);
          handleSave({ type: 'session', ...info });
        }}
      />
      <StartAssessmentModal
        isOpen={modalType === "start_assessment"}
        onClose={closeModal}
        onStart={(assessment) => {
          console.log("Assessment started:", assessment);
          handleSave({ type: 'assessment', ...assessment });
        }}
      />
      <UploadDocumentModal
        isOpen={modalType === "upload_document"}
        onClose={closeModal}
        onUpload={(doc) => {
          console.log("Document uploaded:", doc);
          handleSave({ type: 'document', ...doc });
        }}
      />
      <SkipNextStepModal 
        isOpen={modalType === "skip"} 
        onClose={closeModal} 
        item={mockItem} 
        onConfirm={() => console.log("Confirmed skip")} 
      />
      <CognitiveLoopModal 
        isOpen={modalType === "cognitive_loop"} 
        onClose={closeModal} 
      />
      
      <Toast message="Changes saved successfully!" visible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
}
