"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, ShieldAlert, UserCheck, Play, Send } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ActionType = "isolate_host" | "block_ip" | "wait_for_approval" | "send_email" | "create_ticket";

interface PlaybookStep {
 id: string;
 type: ActionType;
 params: Record<string, string>;
}

const AVAILABLE_ACTIONS: { type: ActionType; icon: React.ReactNode; label: string; desc: string }[] = [
 { type: "isolate_host", icon: <ShieldAlert className="w-4 h-4 text-[var(--ng-error)]" />, label: "Isolate Host", desc: "Block network access via EDR" },
 { type: "block_ip", icon: <ShieldAlert className="w-4 h-4 text-[var(--ng-magenta)]" />, label: "Block IP", desc: "Add IP to firewall deny list" },
 { type: "wait_for_approval", icon: <UserCheck className="w-4 h-4 text-[var(--ng-cyan-bright)]" />, label: "Wait for Approval", desc: "Pause until analyst approves" },
 { type: "send_email", icon: <Send className="w-4 h-4 text-[var(--ng-lime)]" />, label: "Send Notification", desc: "Email or webhook alert" },
 { type: "create_ticket", icon: <Plus className="w-4 h-4 text-[var(--ng-cyan)]" />, label: "Create Ticket", desc: "Jira / ServiceNow incident" },
];

function SortableStepItem({ step, removeStep }: { step: PlaybookStep; removeStep: (id: string) => void }) {
 const actionDef = AVAILABLE_ACTIONS.find(a => a.type === step.type);
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
 
 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 zIndex: isDragging ? 50 : 1,
 opacity: isDragging ? 0.8 : 1,
 };

 return (
 <div ref={setNodeRef} style={style} className="relative group">
 {/* Connector Line */}
 <div className={`absolute left-1/2 -top-4 w-px h-4 bg-ng-outline-dim/30 -translate-x-1/2 ${isDragging ? 'opacity-0' : ''}`} />
 
 <div className={`bg-ng-base border ${isDragging ? 'border-ng-cyan/50  scale-[1.02]' : 'border-ng-outline-dim/40'} group-hover:border-[var(--ng-cyan-bright)]/50 rounded-none p-4 flex items-center gap-4 transition-all `}>
 <div 
 {...attributes} 
 {...listeners} 
 className="cursor-grab active:cursor-grabbing p-1 text-ng-muted hover:text-ng-on focus:outline-none touch-none"
 >
 <GripVertical className="w-5 h-5" />
 </div>
 <div className="w-10 h-10 rounded-none bg-ng-mid flex items-center justify-center border border-ng-outline-dim/40">
 {actionDef?.icon}
 </div>
 <div className="flex-1">
 <p className="text-sm font-bold text-ng-on">{actionDef?.label}</p>
 <div className="text-[11px] text-ng-muted mt-1 font-mono">
 Action ID: {step.type}
 </div>
 </div>
 <button 
 onClick={() => removeStep(step.id)}
 className="p-2 text-ng-muted hover:text-[var(--ng-error)] hover:bg-[var(--ng-error)]/10 rounded-none transition-colors"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
}

export default function PlaybookEditorPage() {
 const [name, setName] = useState("New Security Playbook");
 const [description, setDescription] = useState("Description of the automated response sequence.");
 const [steps, setSteps] = useState<PlaybookStep[]>([]);
 const [saveStatus, setSaveStatus] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const addStep = (type: ActionType) => {
 setSteps([...steps, { id: Math.random().toString(36).substring(7), type, params: {} }]);
 };

 const removeStep = (id: string) => {
 setSteps(steps.filter(s => s.id !== id));
 };

 const handleSave = async () => {
 setSaving(true);
 setSaveStatus(null);
 try {
 const res = await fetch('/api/proxy/api/v1/soar/playbooks', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 name,
 description,
 nodes: steps.map(s => ({
 id: s.id,
 action_type: s.type,
 provider: s.type === 'isolate_host' ? 'crowdstrike' : s.type === 'block_ip' ? 'paloalto' : 'system',
 params: s.params,
 })),
 }),
 });
 if (!res.ok) throw new Error(`Save failed: ${res.status}`);
 setSaveStatus('Saved!');
 } catch (e) {
 setSaveStatus('Save failed');
 } finally {
 setSaving(false);
 }
 };

 const sensors = useSensors(
 useSensor(PointerSensor),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const handleDragEnd = (event: any) => {
 const { active, over } = event;
 if (over && active.id !== over.id) {
 setSteps((items) => {
 const oldIndex = items.findIndex(i => i.id === active.id);
 const newIndex = items.findIndex(i => i.id === over.id);
 return arrayMove(items, oldIndex, newIndex);
 });
 }
 };

 return (
 <div className="flex-1 flex flex-col h-full bg-ng-base">
 {/* Header */}
 <header className="h-16 border-b border-ng-outline-dim/40 bg-ng-base/50 flex items-center justify-between px-6 shrink-0">
 <div className="flex items-center gap-4">
 <Link href="/soar" className="text-ng-muted hover:text-ng-on transition-colors">
 <ArrowLeft className="w-5 h-5" />
 </Link>
 <div className="w-px h-6 bg-ng-outline-dim/30" />
 <input 
 type="text" 
 value={name} 
 onChange={e => setName(e.target.value)} 
 className="bg-transparent border-none text-lg font-bold font-mono text-ng-on focus:ring-0 p-0 w-[400px]"
 />
 </div>
 <button 
 onClick={handleSave}
 className="flex items-center gap-2 bg-[var(--ng-cyan-bright)] hover:bg-ng-cyan-bright text-ng-base px-4 py-2 rounded-none font-bold text-xs transition-colors"
 >
 <Save className="w-4 h-4" />
 {saving ? "Saving..." : "Save Playbook"}
 </button>
 </header>

 <div className="flex flex-1 overflow-hidden">
 {/* Editor Canvas */}
 <div className="flex-1 overflow-y-auto p-8 relative">
 <div className="max-w-3xl mx-auto">
 <div className="mb-8">
 <label className="text-xs font-bold text-ng-muted uppercase tracking-wider mb-2 block">Description</label>
 <input 
 type="text"
 value={description}
 onChange={e => setDescription(e.target.value)}
 className="w-full bg-ng-base/50 border border-ng-outline-dim/40 rounded-none p-3 text-sm text-ng-on focus:outline-none focus:border-[var(--ng-cyan-bright)]/50 transition-colors"
 />
 </div>

 <div className="space-y-4 relative">
 {/* Start Node */}
 <div className="w-48 mx-auto bg-ng-mid border border-ng-outline-dim/40 rounded-full py-2 px-4 flex items-center justify-center gap-2  z-10 relative">
 <Play className="w-4 h-4 text-[var(--ng-lime)]" />
 <span className="text-sm font-bold text-ng-on uppercase tracking-wider">Trigger Event</span>
 </div>

 {steps.length === 0 && (
 <div className="text-center py-12 border-2 border-dashed border-ng-outline-dim/40 rounded-none bg-ng-base/20">
 <p className="text-ng-muted text-sm">Add actions from the right panel to build your playbook.</p>
 </div>
 )}

 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
 <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
 {steps.map((step) => (
 <SortableStepItem key={step.id} step={step} removeStep={removeStep} />
 ))}
 </SortableContext>
 </DndContext>
 </div>
 </div>
 </div>

 {/* Right Action Palette */}
 <div className="w-80 bg-ng-base border-l border-ng-outline-dim/40 flex flex-col items-stretch overflow-y-auto">
 <div className="p-4 border-b border-ng-outline-dim/40 bg-ng-base/80 sticky top-0 z-10 backdrop-blur-sm">
 <h2 className="font-headline tracking-widest uppercase text-sm font-bold text-ng-on uppercase tracking-wider">Available Actions</h2>
 <p className="text-[10px] text-ng-muted mt-1 uppercase tracking-widest">Click to append to sequence</p>
 </div>
 <div className="p-4 space-y-3">
 {AVAILABLE_ACTIONS.map(action => (
 <button
 key={action.type}
 onClick={() => addStep(action.type)}
 className="w-full text-left bg-ng-mid/50 hover:bg-ng-mid border border-ng-outline-dim/40 hover:border-ng-on p-3 rounded-none flex items-start gap-3 transition-all group"
 >
 <div className="mt-0.5 w-8 h-8 rounded shrink-0 bg-ng-base border border-ng-outline-dim/40 flex items-center justify-center group-hover:scale-110 transition-transform">
 {action.icon}
 </div>
 <div>
 <p className="text-xs font-bold text-ng-on mb-1">{action.label}</p>
 <p className="text-[10px] text-ng-muted leading-tight">{action.desc}</p>
 </div>
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
