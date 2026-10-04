// ============================================================================
// ADVMEN SalesOS — Core Type Definitions
// ============================================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_REP'
  | 'TELECALLER'
  | 'MARKETING_SDR'
  | 'FINANCE_VIEWER';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  employeeId?: string;
  permissions: string[];
  department?: string;
  phone?: string;
}

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'CONTACTED'
  | 'CONNECTED'
  | 'QUALIFIED'
  | 'UNQUALIFIED'
  | 'NURTURING'
  | 'MEETING'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'CONVERTED';

export type LeadScoreCategory = 'HOT' | 'WARM' | 'COLD';

export interface LeadQuery {
  id: string;
  text: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT';
  raisedBy: { id: string; name: string; email?: string };
  status: 'OPEN' | 'RESOLVED';
  reply?: string;
  createdAt: string;
  resolvedAt?: string;
  leadId?: string;
  leadCode?: string;
  leadName?: string;
  leadCompany?: string;
  leadPhone?: string;
  leadEmail?: string;
  leadCity?: string;
  leadAddress?: string;
  leadStatus?: LeadStatus;
}

export interface LeadClearedInfo {
  clearedAt: string;
  purpose: string;
  notes?: string;
  message?: string;
  dealId?: string;
  dealValue?: number;
  clearedBy?: { id: string; name: string };
  clearedByName?: string;
}

export interface EmployeeLeadStats {
  employeeId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  totalAssigned: number;
  completedCount: number;
  openQueriesCount: number;
  inProgressCount: number;
  conversionRate: number;
}

export interface Lead {
  id: string;
  organizationId: string;
  leadId?: string;
  name: string;
  title: string;
  company: string;
  city?: string;
  address?: string;
  email: string;
  phone: string;
  status: LeadStatus;
  score: number; // 0 - 100
  scoreCategory: LeadScoreCategory;
  ownerId?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  source: string;
  estimatedValue: number;
  budget?: number;
  requirement?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
  lastContactedAt?: string;
  createdAt: string;
  queries?: LeadQuery[];
  clearedInfo?: LeadClearedInfo;
  aiSummary?: {
    overview: string;
    intentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    suggestedAction: string;
    keyPoints: string[];
    isApproved?: boolean;
  };
}

export type DealStage = 'DISCOVERY' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Deal {
  id: string;
  organizationId: string;
  title: string;
  leadId?: string;
  company: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  value: number;
  stage: DealStage;
  probability: number; // 0 - 100
  expectedCloseDate: string;
  assignedTo: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  health: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  notes?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export type CallStatus = 'QUEUED' | 'RINGING' | 'CONNECTED' | 'COMPLETED' | 'MISSED' | 'BUSY';
export type CallDisposition = 'INTERESTED' | 'CALLBACK_REQUESTED' | 'NOT_INTERESTED' | 'WRONG_NUMBER' | 'MEETING_BOOKED' | 'VOICEMAIL';

export interface CallRecord {
  id: string;
  organizationId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadCompany: string;
  callerId: string;
  callerName: string;
  status: CallStatus;
  disposition?: CallDisposition;
  durationSeconds: number;
  recordingUrl?: string;
  transcriptSnippet?: string;
  aiSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  notes?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'CALL' | 'EMAIL' | 'WHATSAPP' | 'STAGE_CHANGE' | 'NOTE' | 'TASK' | 'MEETING' | 'AI_INSIGHT';
  title: string;
  description: string;
  actorName: string;
  actorAvatar?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  taskId?: string;
  organizationId: string;
  title: string;
  dueDate: string;
  isOverdue?: boolean;
  isCompleted: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  ownerId?: string;
  assignedToName: string;
  notes?: string;
  status?: string;
  relatedTo?: {
    type?: 'LEAD' | 'DEAL' | 'ACCOUNT' | 'GENERAL';
    id?: string;
    name?: string;
  };
  slaBreachInMinutes?: number;
  createdAt?: string;
}

export interface Proposal {
  id: string;
  proposalNumber: string;
  dealId: string;
  dealTitle: string;
  company: string;
  recipientName: string;
  recipientEmail: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED';
  validUntil: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dealId?: string;
  leadId?: string;
  company: string;
  amount: number;
  currency: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  contactName: string;
  contactChannel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  contactAddress: string;
  lastMessageSnippet: string;
  unreadCount: number;
  lastMessageAt: string;
  messages: Array<{
    id: string;
    sender: 'USER' | 'CONTACT' | 'AI_DRAFT';
    content: string;
    timestamp: string;
    status?: 'SENT' | 'DELIVERED' | 'READ' | 'SUGGESTED';
  }>;
}
