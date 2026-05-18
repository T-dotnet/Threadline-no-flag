/**
 * PERSISTENCE: ReportWorkspace management.
 * - reviewedSections: Persisted to AssessmentRecord to survive refresh.
 * - reportApproved: Dispatched to shared state and audit log.
 */

import React, { useState, useEffect } from "react";
import { Download as DownloadIcon, ChevronUp, Edit3 as EditIcon, CheckCircle2, Circle, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TEXT_PRIMARY, TEXT_SECONDARY, DIVIDER, BRAND, BRAND_LIGHT, ACCEPTED_BG, cardStyle, cardHeaderStyle, h1Style, subStyle, primaryBtn, outlineBtn, TYPE_SCALE } from "../constants";
import { cn } from "@lib/utils";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { useAppStore, useClinicalStore } from "@/services/store";
import { useWorkspaceAlerts } from "@/contexts/WorkspaceAlertsContext";

import { AssessmentGate } from "../components/AssessmentGate";
import { ReportSection } from "../components";
import { ProgressBanner } from "../components/ProgressBanner";
import { WorkspaceLayout } from "@components/layout/WorkspaceLayout";
import { Modal, Button, Typography, DataPoint } from "@ui/index";

const REPORT_SECTIONS = ['Formulation', 'Evidence Summary', 'Caveats', 'Next Steps', 'Missing Information Notes'];

import { MOCK_REPORT_MAPPING_IDS as REPORT_MAPPING_IDS } from "../mockData";

function CompletenessWarningModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  missingItems 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  missingItems: { id: string, label: string }[] 
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Evidence not reflected in report"
      width={500}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Download anyway
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Typography variant="body" className="text-text-secondary">
          The following evidence items were accepted in the Evidence Workspace but are not currently reflected in this version of the report:
        </Typography>
        <div className="bg-slate-50 rounded-lg border border-divider max-h-[200px] overflow-y-auto p-3">
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {missingItems.map(item => (
              <li key={item.id} className="text-[14px] leading-relaxed flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-text-secondary shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <Typography variant="body" className="text-[13px] text-text-secondary italic">
          This gap will be logged in the audit trail if you proceed.
        </Typography>
      </div>
    </Modal>
  );
}

export function ReportWorkspace({ onNavigateToAssessments, status }: { onNavigateToAssessments?: () => void, status?: string }) {
  const { activeAssessmentId, activeClientId } = useAppStore();
  const clinicalStore = useClinicalStore();
  const { acceptedMappings } = useWorkspaceAlerts();
  const [reviewedSections, setReviewedSections] = useState<Set<string>>(new Set());
  const [showCompletenessModal, setShowCompletenessModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState(3);
  const [missingEvidence, setMissingEvidence] = useState<{ id: string, label: string }[]>([]);

  // PERSISTENCE: Initial load
  useEffect(() => {
    if (!activeAssessmentId || !activeClientId) return;
    const assessment = clinicalStore.getAssessments(activeClientId)
      .find((a) => a.id === activeAssessmentId);
    if (assessment?.reviewedSections) {
      setReviewedSections(new Set(assessment.reviewedSections));
    }
  }, [activeAssessmentId, activeClientId]);

  // PERSISTENCE: Auto-save on change
  useEffect(() => {
    if (!activeAssessmentId || !activeClientId) return;
    clinicalStore.updateAssessment(activeClientId, activeAssessmentId, {
      reviewedSections: Array.from(reviewedSections),
    });
  }, [reviewedSections]);

  // REGULATORY NOTE: This is the primary control for RISK-006. The sequential review requirement must not be simplified to a single confirm without updating the risk control documentation.
  
  useEffect(() => {
    let timer: any;
    if (showPauseModal && pauseCountdown > 0) {
      timer = setInterval(() => {
        setPauseCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showPauseModal, pauseCountdown]);

  const toggleReview = (section: string) => {
    const newSet = new Set(reviewedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setReviewedSections(newSet);
  };

  const isAllReviewed = reviewedSections.size === REPORT_SECTIONS.length;

  const { setReportApproved, conflicts } = useWorkspaceAlerts();

  const proceedWithDownload = (acknowledgedGap = false) => {
    if (FEATURE_FLAGS.FEATURE_UX_COGNITIVE_PAUSE_ON_DIAGNOSIS && !showPauseModal) {
      setShowPauseModal(true);
      setPauseCountdown(3);
      return;
    }

    console.info("AUDIT LOG: Report Approved", {
      timestamp: new Date().toISOString(),
      assessmentId: activeAssessmentId,
      reviewedSections: Array.from(reviewedSections),
      clinicianId: "CLINICIAN_001", // Mock ID
      completenessCheckAcknowledged: acknowledgedGap,
      missingItems: acknowledgedGap ? missingEvidence.map(i => i.id) : []
    });

    // PERSISTENCE: Loop update
    if (activeClientId && activeAssessmentId) {
      clinicalStore.updateCognitiveLoop(activeClientId, activeAssessmentId, {
        reportApproved: true,
        reportApprovedAt: new Date().toISOString()
      });
    }

    setReportApproved(true);
    // Trigger download logic here
    alert("Report download triggered successfully.");
    setShowCompletenessModal(false);
    setShowPauseModal(false);
  };

  const handleApprove = () => {
    if (!isAllReviewed && FEATURE_FLAGS.FEATURE_SEQUENTIAL_REPORT_REVIEW) return;

    if (FEATURE_FLAGS.FEATURE_REPORT_COMPLETENESS_CHECK) {
      const missing = acceptedMappings.filter(mapping => !REPORT_MAPPING_IDS.includes(mapping.id));
      if (missing.length > 0) {
        setMissingEvidence(missing.map(m => ({ id: m.id, label: m.label })));
        setShowCompletenessModal(true);
        return;
      }
    }
    
    proceedWithDownload();
  };

  const navItems = [
    "Information User",
    "Sources Of Information Reviewed",
    "Summary Of Current Concerns\n(Presenting Picture)",
    "Whole-Mind Snapshot",
    "Strengths",
    "Areas Under Pressure",
    "Assessment Insights",
    "Provisional Working Impression",
    "Differential Considerations",
    "Key Diagnostic Indicators",
    "Recommended Next Steps\nFor Diagnostic Clarity",
    "Summary Statement",
    "Safety Summary"
  ];

  const [activeNav, setActiveNav] = useState("Information User");

  const ReviewBadge = ({ section }: { section: string }) => {
    if (!FEATURE_FLAGS.FEATURE_SEQUENTIAL_REPORT_REVIEW) return null;
    const isReviewed = reviewedSections.has(section);
    
    return (
      <button 
        onClick={() => toggleReview(section)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer border transition-all duration-200",
          isReviewed ? "bg-secondary-balance text-secondary-balance-text border-secondary-balance-text" : "bg-white text-text-secondary border-divider"
        )}
      >
        <AnimatePresence mode="wait">
                {isReviewed ? (
                  <motion.div
                    key="checked"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <CheckCircle2 size={16} className="text-secondary-balance-text" />
                  </motion.div>
          ) : (
            <motion.div key="unchecked">
              <Circle size={16} />
            </motion.div>
          )}
        </AnimatePresence>
        {isReviewed ? "Reviewed" : "Mark as reviewed"}
      </button>
    );
  };
  
  const sidebarContent = (
    <>
      <div className="px-5 py-6 border-b border-divider">
        <h2 className="m-0 text-[20px] font-medium text-text-primary">Report Sections</h2>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        {navItems.map((item, idx) => (
          <div 
            key={idx}
            onClick={() => setActiveNav(item)}
            className={cn(
              "px-6 py-4 cursor-pointer transition-colors duration-200 border-l-4",
              activeNav === item ? "bg-primary-light border-primary" : "bg-transparent border-transparent"
            )}
          >
            <div className={cn(
              "text-[14px] leading-relaxed whitespace-pre-line",
              activeNav === item ? "text-primary font-medium" : "text-text-primary font-normal"
            )}>
              {item}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const mainContent = (
    <div className="flex flex-col flex-1 overflow-y-auto">
      {/* Banner */}
      <div className="p-8 bg-white border-b border-divider">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6 bg-slate-50 rounded-xl border border-divider">
          <DataPoint label="Client Name" value="Liam Alexander O'Sullivan" />
          <DataPoint label="Date of Report" value="17 December 2025" />
          <DataPoint label="Prepared By" value="Threadline" />
          <DataPoint label="Clinician" value="[Clinician Name]" />
          <DataPoint label="Session IDs Reviewed" value="[IDs]" />
          
          <div className="col-span-full h-px bg-slate-200 my-1" />
          
          <DataPoint label="Assessments Completed" value="GAD-7, PHQ-9, SDS" />
          <div className="sm:col-span-2">
            <DataPoint label="Collateral Reviewed" value="Teacher notes, psychological evaluation, referral letter" />
          </div>
        </div>
      </div>

      <div className="flex flex-col px-10 py-6 bg-workspace-bg">
        {/* 1. Sources of Information Reviewed */}
        <ReportSection title="Sources of Information Reviewed" reviewBadge={<ReviewBadge section="Missing Information Notes" />} noCollapse>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>Structured mental-health telehealth session transcript</li>
            <li>Self-reported assessments: GAD-7, PHQ-9, SDS</li>
            <li>Teacher comments and school report (Previous psychological evaluation)</li>
            <li>Referral information</li>
            <li>No parent/caregiver collateral available</li>
          </ul>
        </ReportSection>

        {/* 2. Summary of Current Concerns */}
        <ReportSection title="Summary of Current Concerns (Presenting Picture)" reviewBadge={<ReviewBadge section="Evidence Summary" />} noCollapse>
          <p className="m-0 mb-4 text-[14px] text-text-secondary leading-relaxed">
            Alexa reports difficulty concentrating during school hours, feelings of overwhelm in the evenings, and sleep irregularity
            with late bedtimes. She describes increased irritability over the past term and moments of feeling emotionally
            overloaded. No acute safety concerns were expressed during sessions.
          </p>
          <p className="m-0 text-[14px] text-text-secondary leading-relaxed">
            Teacher and school reports note reduced attention, difficulty with transitions, and intermittent irritability. Previous
            psychological evaluation described mild anxiety traits. Alexa has not provided detailed sleep logs or recent parent/
            caregiver insights.
          </p>
        </ReportSection>

        {/* 3. Whole-Mind Snapshot */}
        <ReportSection title="Whole-Mind Snapshot" noCollapse>
           <p className="m-0 mb-2 text-[13px] text-slate-600 italic">A summary of Alexa's emotional, cognitive, physical, social, and environmental functioning.</p>
           <p className="m-0 text-[14px] text-text-secondary leading-relaxed">
             Summary - Alexa appears to be experiencing a mild but noticeable emotional and cognitive load, influenced by worry,
             sleep disturbance, and situational demands. Her functioning remains generally intact, with preserved insight and strong
             relational awareness. Sleep irregularity and school-based challenges appear to be contributing factors.
           </p>
        </ReportSection>

        {/* 4. Strengths & Areas Under Pressure */}
        <ReportSection title="Strengths" noCollapse>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>Demonstrates insight and reflective capacity</li>
            <li>Strong interpersonal awareness</li>
            <li>Engages openly in sessions</li>
            <li>Motivated to improve routines</li>
          </ul>
        </ReportSection>
        <ReportSection title="Areas Under Pressure" noCollapse>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>Demonstrates insight and reflective capacity</li>
            <li>Strong interpersonal awareness</li>
            <li>Engages openly in sessions</li>
            <li>Motivated to improve routines</li>
          </ul>
        </ReportSection>

        {/* 5. Assessment Insights */}
        <ReportSection title="Assessment Insights" noCollapse>
          <div className="flex flex-col gap-4">
            <DataPoint label="Worry (GAD-7)" value="Demonstrates insight and reflective capacity" />
            <DataPoint label="Sleep (SDS)" value="Strong interpersonal awareness" />
            <DataPoint label="Mood (PHQ-9)" value="Motivated to improve routines" />
          </div>
        </ReportSection>

        {/* 6. Provisional Working Impression */}
        <ReportSection title="Provisional Working Impression" reviewBadge={<ReviewBadge section="Formulation" />} noCollapse>
          <p className="m-0 text-[14px] text-text-secondary leading-relaxed">
            The combined information suggests a pattern of mild distress with early risk indicators across worry, sleep, mood, and
            attention domains. Impacts on functioning are present but currently limited. No indicators of acute risk were identified.
          </p>
        </ReportSection>

        {/* 7. Differential Considerations & Key Diagnostic Indicators */}
        <ReportSection title="Differential Considerations" reviewBadge={<ReviewBadge section="Caveats" />} noCollapse>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>Demonstrates insight and reflective capacity</li>
            <li>Strong interpersonal awareness</li>
            <li>Engages openly in sessions</li>
            <li>Motivated to improve routines</li>
          </ul>
        </ReportSection>
        <ReportSection title="Key Diagnostic Indicators" noCollapse>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>Demonstrates insight and reflective capacity</li>
            <li>Strong interpersonal awareness</li>
            <li>Engages openly in sessions</li>
            <li>Motivated to improve routines</li>
          </ul>
        </ReportSection>

        {/* 8. Recommended Next Steps for Diagnostic Clarity */}
        <ReportSection title="Recommended Next Steps for Diagnostic Clarity" reviewBadge={<ReviewBadge section="Next Steps" />} noCollapse>
          <div className="flex flex-col md:flex-row gap-8 mb-6">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Targeted Diagnostic Steps</div>
              <ul className="margin-0 pl-5 text-slate-600 text-sm leading-relaxed space-y-2 list-disc">
                <li>Early generalised anxiety pattern</li>
                <li>Low mood pattern associated with situational influences</li>
                <li>Attention-related challenges</li>
                <li>Sleep-related symptom amplification</li>
                <li>No current indicators of acute risk</li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recommended Information to Gather</div>
              <ul className="margin-0 pl-5 text-slate-600 text-sm leading-relaxed space-y-2 list-disc">
                <li>Elevated worry across assessment items</li>
                <li>Low mood indicators affecting motivation</li>
                <li>Sleep disruption contributing to symptom load</li>
                <li>Screen-related strain affecting routine</li>
                <li>Attention challenges impacting concentration</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reason for Recommendations</div>
            <div className="text-sm text-slate-700 leading-relaxed italic">
              These areas represent domains with remaining uncertainty. Additional information will help differentiate between early-stage
              symptoms and situational responses and strengthen the provisional working impression.
            </div>
          </div>
        </ReportSection>

        {/* 9. Summary Statement */}
        <ReportSection title="Summary Statement" noCollapse>
          <p className="m-0 text-[14px] text-text-secondary leading-relaxed">
            Alexa presents with a mild but coherent constellation of worry, low mood indicators, sleep disruption, and functional
            challenges related to school engagement. Her strengths, insight, and engagement provide a strong foundation for
            ongoing monitoring and clarity-building. A short period of targeted data gathering is recommended to refine the picture
            and confirm whether symptoms remain situational or represent an emerging early-stage pattern.
          </p>
        </ReportSection>

        {/* 10. Safety Summary */}
        <ReportSection title="Safety Summary" noBottomBorder>
          <ul className="m-0 pl-5 text-[14px] leading-relaxed text-text-secondary list-disc">
            <li>No acute risk indicators identified during sessions.</li>
            <li>No reports of suicidal ideation, self-harm behaviours, or threats to others.</li>
            <li>Client engaged, coherent, and future-oriented.</li>
          </ul>
        </ReportSection>

      </div>
    </div>
  );

  return (
    <AssessmentGate onNavigateToAssessments={onNavigateToAssessments || (() => {})}>
      <div className="pb-16">
      
      <WorkspaceLayout 
        title="Report"
        subtitle="Threadline Diagnostic Summary Report"
        headerActions={
          !FEATURE_FLAGS.FEATURE_SEQUENTIAL_REPORT_REVIEW && (
            <button 
              onClick={handleApprove}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[14px] font-medium rounded-lg hover:opacity-90 w-auto"
            >
              <DownloadIcon size={18} /> Download Report
            </button>
          )
        }
        subHeaderContent={FEATURE_FLAGS.FEATURE_SEQUENTIAL_REPORT_REVIEW && (
          <ProgressBanner
            title="Report Quality Review"
            subtitle="Review all sections to enable approval and download"
            current={reviewedSections.size}
            total={REPORT_SECTIONS.length}
            progressLabel="Sections Reviewed"
            actionLabel="Approve and Download"
            actionIcon={DownloadIcon}
            onAction={handleApprove}
            isActionActive={isAllReviewed}
            className="mb-6"
          />
        )}
        sidebarWidth={280}
        sidebarContent={sidebarContent}
        mainContent={mainContent}
      />
      <CompletenessWarningModal 
        isOpen={showCompletenessModal}
        onClose={() => setShowCompletenessModal(false)}
        onConfirm={() => proceedWithDownload(true)}
        missingItems={missingEvidence}
      />
      
      <Modal
        isOpen={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Analytical Review Pause"
        width={550}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPauseModal(false)}>
              Back to Report
            </Button>
            <Button variant="brand" onClick={() => proceedWithDownload(true)} disabled={pauseCountdown > 0}>
              {pauseCountdown > 0 ? `Wait ${pauseCountdown}s...` : "Confirm & Finalize"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
            <div className="flex items-center gap-3 text-slate-900 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <AlertTriangle size={24} className="text-slate-900" />
                <Typography variant="body" className="font-semibold text-slate-900">Reviewing Contradictory Evidence</Typography>
            </div>
            
            <Typography variant="body" className="text-slate-600 leading-relaxed">
                Before finalizing this report, the system requires an analytical pause to ensure you have considered these potentially contradictory data points:
            </Typography>

            <div className="space-y-3">
                {conflicts.length > 0 ? conflicts.map(conflict => (
                    <div key={conflict.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                        <Typography variant="body-sm" className="text-slate-700">{conflict.description}</Typography>
                    </div>
                )) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-3 italic text-slate-500">
                        No critical conflicts identified, but systemic verification is required.
                    </div>
                )}
            </div>

            <Typography variant="body-sm" className="text-slate-400 italic">
                Regulatory Compliance: HF-001 (Analytical Forcing Function)
            </Typography>
        </div>
      </Modal>
    </div>
  </AssessmentGate>
  );
}
