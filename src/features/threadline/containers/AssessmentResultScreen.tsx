import React, { useState } from "react";
import { InterpRow, EntityCard, DetailViewLayout } from "../components";
import { DataPoint } from "@ui/index";
import { 
  Download as DownloadIcon, 
  ArrowLeft as BackArrow, 
  Search, 
  Copy,
  Edit2, 
  Trash2,
  Edit3,
  Plus,
  Trash,
  X
} from "lucide-react";
import { MOCK_CLIENTS, MOCK_EVIDENCE_ITEMS, MOCK_CLIENT_DATA, MOCK_ASSESSMENTS } from "../mockData";
import { 
  Button, 
  Card, 
  Typography, 
  Badge,
  Select,
  Input,
  Textarea,
  Modal
} from "@ui/index";
import { cn } from "@lib/utils";
import { StatusBadge } from "@shared/StatusBadge";
import { CreateClinicalEvidenceModal } from "../modals";

export function AssessmentResultScreen({ clientId, assessmentIndex, onBack, onGuidelinesClick }: { clientId: string, assessmentIndex: string, onBack: () => void, onGuidelinesClick?: () => void }) {
  const clientData = (MOCK_CLIENT_DATA as any)[clientId];
  const assessments = clientData?.assessments || MOCK_ASSESSMENTS;
  const assessment = assessments[parseInt(assessmentIndex)] || assessments[0];
  const clientMeta = MOCK_CLIENTS.find(c => c.id === clientId) || MOCK_CLIENTS[0];
  const [activeTabLeft, setActiveTabLeft] = useState("Overall Impression");
  const [isEditing, setIsEditing] = useState(false);

  // Editable Assessment Analysis fields
  const [overallImpression, setOverallImpression] = useState(assessment.overallImpression || assessment.notes || "No impression recorded.");
  const [keyFindings, setKeyFindings] = useState(assessment.keyFindings || (assessment.title.includes("GAD-7") ? "- Moderate mood dysregulation\n- High academic stress alignment" : assessment.title.includes("PHQ-9") ? "- Persistent low mood\n- Sleep latency detected" : "- Significant clinical indicators\n- Pattern alignment detected"));
  const [clinicalThreadAnalysis, setClinicalThreadAnalysis] = useState(assessment.clinicalThreadAnalysis || (assessment.title.includes("GAD-7") 
    ? `The raw scores suggest a pattern of intermittent anxiety specifically triggered by academic deadlines. The 'Worry' thread scores were elevated (${assessment.score}/21).` 
    : assessment.title.includes("PHQ-9")
      ? `The depressive indicators are most prominent in the sleep and energy domains. Total score of ${assessment.score}/27 suggests a mild depressive episode.`
      : `The results indicate a pattern consistent with ${assessment.overallImpression || 'the assessment criteria'}. Total score of ${assessment.score || '--'}.`));
  
  const [physicalArousal, setPhysicalArousal] = useState(assessment.physicalArousal || (assessment.title.includes("PHQ-9") ? "Mild" : "Elevated"));
  const [cognitiveFocus, setCognitiveFocus] = useState(assessment.cognitiveFocus || "Normal");

  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);
  const [evidenceTags, setEvidenceTags] = useState<string[]>([]);
  const [editingEvidenceItem, setEditingEvidenceItem] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Filter evidence related to assessments for this client (mocked)
  const initialEvidence: any[] = [];
  MOCK_EVIDENCE_ITEMS.forEach(item => {
    if (item.type === "assessment" && item.label.toLowerCase().includes(assessment.title.split(' ')[0].toLowerCase())) {
       if (item.findings) {
         item.findings.forEach((f: any) => {
           initialEvidence.push({
             ...f,
             label: f.text,
             type: 'evidence',
             sourceLabel: item.label,
             timestampValue: f.timestamp,
             tags: f.tags
           });
         });
       } else {
         initialEvidence.push(item);
       }
    }
  });

  // If no specific assessment evidence found, show some relevant clinical evidence items
  if (initialEvidence.length === 0) {
    initialEvidence.push(...MOCK_EVIDENCE_ITEMS.filter(item => item.type === "evidence").slice(0, 3).map((item: any) => ({
      ...item,
      sourceLabel: item.sourceDocumentName || item.sessionSource || "Diagnostic Interview",
      timestampValue: item.timestamp || ""
    })));
  }

  const [localEvidence, setLocalEvidence] = useState(initialEvidence);

  const handleEditEvidenceModal = (item: any) => {
    setEditingEvidenceItem(item);
    setIsAddEvidenceOpen(true);
  };

  const handleDeleteEvidence = (id: string) => {
    const updated = localEvidence.filter((e: any) => e.id !== id);
    setLocalEvidence(updated);

    // Update in assessment object
    if (assessment) {
      assessment.findings = updated;
    }

    const mockAssessment = MOCK_EVIDENCE_ITEMS.find((item: any) => item.type === "assessment" && item.label.toLowerCase().includes(assessment.title.split(' ')[0].toLowerCase()));
    if (mockAssessment) {
      mockAssessment.findings = updated.map((e: any) => ({
        ...e,
        id: e.id,
        text: e.text || e.label,
        timestamp: e.timestamp || e.timestampValue,
      }));
    }
  };

  const handleSaveEvidence = (newEvidence: any) => {
    let updated;
    if (editingEvidenceItem) {
      updated = localEvidence.map((e: any) => e.id === newEvidence.id ? newEvidence : e);
    } else {
      updated = [newEvidence, ...localEvidence];
    }
    setLocalEvidence(updated);

    // Update in assessment object
    if (assessment) {
      assessment.findings = updated;
    }

    const mockAssessment = MOCK_EVIDENCE_ITEMS.find((item: any) => item.type === "assessment" && item.label.toLowerCase().includes(assessment.title.split(' ')[0].toLowerCase()));
    if (mockAssessment) {
      mockAssessment.findings = updated.map((e: any) => ({
        ...e,
        id: e.id,
        text: e.text || e.label,
        timestamp: e.timestamp || e.timestampValue,
      }));
    } else {
      MOCK_EVIDENCE_ITEMS.unshift({
           label: assessment.title,
           score: "0.95",
           type: "assessment",
           hasConflict: false,
           findings: updated.map((e: any) => ({
             ...e,
             id: e.id,
             text: e.text || e.label,
             timestamp: e.timestamp || e.timestampValue,
           }))
       } as any);
    }
    setIsAddEvidenceOpen(false);
  };
  
  const COMMON_TAGS = [
    "Physical Symptoms", "Social Trigger", "Avoidance", "Anxiety", "Arousal", 
    "Work Stress", "Perfectionism", "Distortion", "Paranoia", "Self-Consciousness",
    "Affective", "Processing Speed", "Progress", "Skill Acquisition", 
    "Mindfulness", "Difficulty", "Symptom Reduction", "Social", "Sensory", 
    "Work", "Communication", "History", "Behavior"
  ];

  const toggleTag = (tag: string) => {
    if (evidenceTags.includes(tag)) {
      setEvidenceTags(evidenceTags.filter(t => t !== tag));
    } else {
      setEvidenceTags([...evidenceTags, tag]);
    }
  };
  
  const [nextSteps, setNextSteps] = useState([
    { title: assessment.title.includes("GAD-7") ? "Cognitive Behavioural Therapy" : assessment.title.includes("PHQ-9") ? "Mindfulness Training" : "Cognitive Behavioural Therapy", desc: "Focus on academic stress reduction and sleep hygiene." },
    { title: "Progress Monitoring", desc: `Re-evaluate using ${assessment.title.split(' ')[0]} in 4 weeks.` }
  ]);

  // Handle adding new step
  const addNextStep = () => {
    setNextSteps([...nextSteps, { title: "", desc: "" }]);
  };

  // Handle updating a step
  const updateNextStep = (index: number, field: 'title' | 'desc', value: string) => {
    const updated = [...nextSteps];
    updated[index][field] = value;
    setNextSteps(updated);
  };

  // Handle removing a step
  const removeNextStep = (index: number) => {
    setNextSteps(nextSteps.filter((_, i) => i !== index));
  };
  
  // Filter evidence related to assessments for this client (mocked) - REMOVED logic moved to state

  return (
    <DetailViewLayout
      onBack={onBack}
      backLabel="Back to Assessments"
      title={assessment.title}
      subtitle={assessment.description || "View and download assessment results and clinical reports for this client."}
      headerBadges={
        <StatusBadge 
          status="completed" 
          label="Complete" 
          showIcon={true}
        />
      }
      metaBanner={[
        { label: "Patient Name", value: clientMeta.name },
        { label: "Date Administered", value: assessment.date || "17 December 2025" },
        { label: "Date of Birth", value: "17 Dec 2001 (24y)" },
        { label: "Assessor", value: assessment.subtitle?.split('•')[1]?.trim() || "Dr. Marcus Thorne" },
        { label: "Completion Time", value: "12 minutes" },
      ]}
      headerActions={
        <Button variant="brand" className="shrink-0">
          <DownloadIcon size={18} /> Download Results
        </Button>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Visual Summary & Analysis */}
        <div className="space-y-6 flex flex-col">
          {/* Visual Summary */}
          <Card className="p-0 border-divider overflow-hidden shrink-0">
            <div className="p-8 space-y-8 pt-10">
              <div className="relative pt-6 pb-2">
                <div className="h-8 w-full bg-[#f5f5f5] rounded-full overflow-hidden relative">
                  {/* Fill */}
                  <div className="absolute top-0 bottom-0 left-0 bg-[#f7c5a8] rounded-full transition-all duration-1000 ease-out" style={{ width: assessment.score ? `${(parseInt(assessment.score) / (assessment.title.includes('PHQ-9') ? 27 : assessment.title.includes('GAD-7') ? 21 : 60)) * 100}%` : '50%' }} />
                </div>
                
                {/* Clinical Threshold Marker */}
                <div className="absolute top-6 bottom-[-8px] left-[58.3%] w-0.5 bg-emerald-900 z-10 overflow-visible">
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-text-secondary font-medium pt-0.5">Clinical Threshold</div>
                   <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-bold text-text-primary pt-1">35</div>
                </div>

                {/* Labels below */}
                <div className="flex justify-between text-xs text-text-secondary font-medium mt-6">
                  <span>0 - Minimal</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
            </div>

            {/* Score info mini-banner */}
            <div className="border-t border-divider grid grid-cols-3 bg-slate-50/50">
              <DataPoint label="Total Score" value={`${assessment.score || '--'} / ${assessment.title.includes('PHQ-9') ? 27 : assessment.title.includes('GAD-7') ? 21 : 60}`} className="px-6 py-4 border-r border-divider" />
              <DataPoint label="Percentile" value={assessment.percentile || '--'} className="px-6 py-4 border-r border-divider" />
              <DataPoint label="Overall Severity Level" value={assessment.descriptor || assessment.overallImpression || "Normal"} className="px-6 py-4" />
            </div>
          </Card>

          {/* Analysis Tabs */}
          <Card className="p-0 border-divider flex flex-col flex-1">
            <div className="p-4 border-b border-divider bg-slate-50/50 flex justify-between items-center shrink-0">
              <div className="flex gap-6 overflow-x-auto no-scrollbar">
                {["Overall Impression", "Symptom Analysis", "Next Steps"].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTabLeft(tab)}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                      activeTabLeft === tab ? "text-primary border-b-2 border-primary pb-1" : "text-text-disabled hover:text-text-secondary"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn("h-7 px-2 hover:bg-primary/5", isEditing ? "text-primary bg-primary/10" : "text-text-secondary hover:text-primary")}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 size={14} />
                </Button>
              </div>
            </div>

            <div className="p-6">
                {activeTabLeft === "Overall Impression" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Typography variant="label-micro" className="text-text-secondary">Overall Impression</Typography>
                      {isEditing ? (
                        <textarea 
                          className="w-full text-sm text-text-primary leading-relaxed bg-white p-4 rounded-lg border border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-y" 
                          value={overallImpression}
                          onChange={(e) => setOverallImpression(e.target.value)}
                        />
                      ) : (
                        <Typography variant="body" className="text-text-primary leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                           {overallImpression}
                        </Typography>
                      )}
                    </div>
                    <div className="space-y-2">
                        <Typography variant="label-micro" className="text-text-secondary">Key Findings</Typography>
                        {isEditing ? (
                          <textarea 
                            className="w-full text-sm text-text-primary leading-relaxed bg-white p-4 rounded-lg border border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-y" 
                            value={keyFindings}
                            onChange={(e) => setKeyFindings(e.target.value)}
                          />
                        ) : (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                             <ul className="space-y-2">
                               {keyFindings.split('\n').filter(line => line.trim().length > 0).map((item, i) => (
                                 <li key={i} className="flex items-center gap-2 text-sm text-text-primary">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                   {item.replace(/^- /, '')}
                                 </li>
                               ))}
                             </ul>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {activeTabLeft === "Symptom Analysis" && (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <Typography variant="label-micro" className="text-text-secondary uppercase tracking-[0.05em] font-bold">Clinical Thread Analysis</Typography>
                        {isEditing ? (
                          <textarea 
                            className="w-full text-sm text-text-primary leading-relaxed bg-white p-4 rounded-lg border border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-y" 
                            value={clinicalThreadAnalysis}
                            onChange={(e) => setClinicalThreadAnalysis(e.target.value)}
                          />
                        ) : (
                          <Typography variant="body" className="text-text-primary leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                           {clinicalThreadAnalysis}
                          </Typography>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <DataPoint 
                          label="PHYSICAL AROUSAL" 
                          value={isEditing ? (
                            <Select 
                              value={physicalArousal}
                              onChange={(e) => setPhysicalArousal(e.target.value)}
                              className="w-full bg-white h-9"
                            >
                              <option>Normal</option>
                              <option>Elevated</option>
                              <option>Mild</option>
                              <option>High</option>
                            </Select>
                          ) : (
                            physicalArousal
                          )}
                          className="p-4 bg-slate-50 rounded-xl border border-divider"
                        />

                        <DataPoint 
                          label="COGNITIVE FOCUS" 
                          value={isEditing ? (
                            <Select 
                              value={cognitiveFocus}
                              onChange={(e) => setCognitiveFocus(e.target.value)}
                              className="w-full bg-white h-9"
                            >
                              <option>Normal</option>
                              <option>Impacted</option>
                              <option>Severely Impacted</option>
                            </Select>
                          ) : (
                            cognitiveFocus
                          )}
                          className="p-4 bg-slate-50 rounded-xl border border-divider"
                        />
                     </div>
                  </div>
                )}

               {activeTabLeft === "Next Steps" && (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <Typography variant="label-micro" className="text-text-secondary font-bold uppercase tracking-widest">Recommended Protocol</Typography>
                      {isEditing && (
                        <Button variant="ghost" size="sm" onClick={addNextStep} className="h-7 text-primary hover:bg-primary/5 gap-1 text-[10px]">
                          <Plus size={12} /> Add Strategy
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {nextSteps.map((step, i) => (
                        <div key={i} className={cn(
                          "flex gap-4 p-4 rounded-xl border transition-colors bg-white relative group",
                          isEditing ? "border-primary/20" : "border-divider"
                        )}>
                          <div className={cn(
                            "w-8 h-8 rounded-full text-primary flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                            isEditing ? "bg-primary text-white" : "bg-primary/5"
                          )}>
                            {i+1}
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            {isEditing ? (
                              <>
                                <div className="space-y-1">
                                  <Typography variant="label-micro" className="text-text-disabled">Heading</Typography>
                                  <Input 
                                    className="h-9 text-sm" 
                                    value={step.title}
                                    onChange={(e) => updateNextStep(i, 'title', e.target.value)}
                                    placeholder="Enter heading..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Typography variant="label-micro" className="text-text-disabled">Description</Typography>
                                  <Textarea 
                                    className="text-sm min-h-[60px]" 
                                    value={step.desc}
                                    onChange={(e) => updateNextStep(i, 'desc', e.target.value)}
                                    placeholder="Enter description..."
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <Typography variant="body" className="font-bold text-text-primary">{step.title}</Typography>
                                <Typography variant="body" className="text-text-secondary text-sm">{step.desc}</Typography>
                              </>
                            )}
                          </div>

                          {isEditing && (
                            <button 
                              onClick={() => removeNextStep(i)}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </div>
                      ))}

                      {nextSteps.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-divider rounded-xl">
                          <Typography variant="label-micro" className="text-text-disabled">No next steps defined. Add one to get started.</Typography>
                        </div>
                      )}
                    </div>
                 </div>
               )}
            </div>

            {isEditing && (
              <div className="p-4 border-t border-divider bg-slate-50/30 flex justify-end gap-3 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Reset</Button>
                <Button variant="brand" size="sm" onClick={() => {
                  if (assessment) {
                    assessment.overallImpression = overallImpression;
                    assessment.keyFindings = keyFindings;
                    assessment.clinicalThreadAnalysis = clinicalThreadAnalysis;
                    assessment.physicalArousal = physicalArousal;
                    assessment.cognitiveFocus = cognitiveFocus;
                    assessment.nextSteps = nextSteps;

                    // Update global mock data
                    if (clientId && MOCK_CLIENT_DATA[clientId]) {
                       const globalAssessments = (MOCK_CLIENT_DATA[clientId] as any).assessments;
                       if (globalAssessments && globalAssessments[parseInt(assessmentIndex)]) {
                          const globalA = globalAssessments[parseInt(assessmentIndex)];
                          globalA.overallImpression = overallImpression;
                          globalA.keyFindings = keyFindings;
                          globalA.clinicalThreadAnalysis = clinicalThreadAnalysis;
                          globalA.physicalArousal = physicalArousal;
                          globalA.cognitiveFocus = cognitiveFocus;
                          globalA.nextSteps = nextSteps;
                       }
                    }
                  }
                  setIsEditing(false);
                }}>Save Changes</Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Evidence & Mappings */}
        <div className="space-y-6 flex flex-col">
          <Card className="p-0 border-divider flex flex-col flex-1">
            <div className="p-4 border-b border-divider bg-slate-50/50 flex justify-between items-center shrink-0">
              <Typography variant="label-micro" className="text-primary font-bold uppercase tracking-wider">Supporting Tags</Typography>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-600 hover:text-slate-600">
                  <Copy size={14} />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary hover:bg-primary/5" onClick={() => setIsAddEvidenceOpen(true)}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-6 pb-12">
                {localEvidence.map((evidence: any, idx) => (
                  <EntityCard 
                    key={evidence.id || idx}
                    title={evidence.type === 'verbatim' || evidence.verbatim ? `"${evidence.verbatim || evidence.text || evidence.label}"` : (evidence.label || evidence.text)}
                    titleClassName={['verbatim', 'behavioural'].includes(evidence.type) || evidence.verbatim ? "text-base font-bold leading-relaxed text-slate-800" : "font-bold"}
                    metadata={[
                      { label: "Timestamp", value: evidence.timestamp || evidence.timestampValue || "05:12" },
                      ...(evidence.findings || evidence.tags ? [{ label: "Clinical Tags", value: (
                        <div className="flex flex-wrap gap-1">
                          {(evidence.findings || []).map((f: any) => (
                            <Badge key={f.id} variant="soft" className="px-2 py-0.5 text-xs text-slate-600 font-mono">
                              {f.tags?.[0] || f.text}
                            </Badge>
                          ))}
                          {(evidence.tags || []).map((tag: string) => (
                            <Badge key={tag} variant="soft" className="px-2 py-0.5 text-xs text-slate-600 font-mono">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}] : [])
                    ]}
                    statusBadge={
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={(evidence.type === 'verbatim' || evidence.verbatim) ? 'processing' : 'completed'} 
                          showIcon={false}
                          label={evidence.type === 'verbatim' || evidence.verbatim ? 'VERBATIM' : (evidence.type === 'behavioural' ? 'BEHAVIOURAL' : 'OBSERVATION')}
                          className={(evidence.type === 'verbatim' || evidence.verbatim) ? "bg-blue-100 text-slate-900 border-0" : "bg-emerald-100 text-slate-900 border-0"}
                        />
                        <StatusBadge 
                          status={evidence.isUserGenerated ? 'user' : 'ai'} 
                          showIcon={false}
                        />
                      </div>
                    }
                    rightAction={(
                      <div className="flex gap-2 items-center">
                        {!evidence.isUserGenerated && evidence.hasConflict && (
                          <Badge variant="soft" className="bg-red-100 text-red-600 border-none">Conflict</Badge>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditEvidenceModal(evidence); }} 
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(evidence.id); }} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    onClick={() => {}}
                    hoverable={true}
                  />
                ))}

                {localEvidence.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-divider rounded-2xl">
                    <Typography variant="label-micro" className="text-text-disabled">No clinical evidence items mapped specifically to this assessment.</Typography>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Bar Footer */}
            {/* Removed Update Mappings button as requested */}
          </Card>
        </div>
      </div>

      <CreateClinicalEvidenceModal 
        isOpen={isAddEvidenceOpen}
        onClose={() => { setIsAddEvidenceOpen(false); setEditingEvidenceItem(null); }}
        onCreate={handleSaveEvidence}
        editingItem={editingEvidenceItem}
        context="assessment"
      />

      <Modal 
        isOpen={!!deleteConfirmId} 
        onClose={() => setDeleteConfirmId(null)} 
        title="Delete Evidence" 
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { if(deleteConfirmId) handleDeleteEvidence(deleteConfirmId); setDeleteConfirmId(null); }}>Delete</Button>
          </>
        } 
        width={400}
      >
        <div className="py-4">
          <Typography variant="body" className="text-slate-600">Are you sure you want to delete this clinical evidence? This action cannot be undone.</Typography>
        </div>
      </Modal>
    </DetailViewLayout>
  );
}

