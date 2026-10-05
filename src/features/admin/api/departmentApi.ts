import { apiClient } from '@/lib/apiClient';

export const DEFAULT_DEPARTMENTS = [
  'Sales',
  'Intern',
  'IT Department',
  'SEO',
  'Marketing',
  'Operations',
  'Customer Support',
  'Finance & Accounts',
  'Human Resources',
];

export interface DepartmentRoleItem {
  role: string;
  label: string;
  description: string;
}

export const DEFAULT_DEPARTMENT_ROLES: Record<string, DepartmentRoleItem[]> = {
  Sales: [
    { role: 'SALES_REP', label: 'Sales Representative (Executive)', description: 'Manages sales deals, leads, quotes and client pipelines.' },
    { role: 'TELECALLER', label: 'Telecaller / Outreach Agent', description: 'Autodialer queue, calling contacts, disposition logging.' },
    { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Team leaderboards, lead quota approvals, sales performance.' },
    { role: 'BDE', label: 'Business Development Executive (BDE)', description: 'Generates new commercial leads and client partnerships.' },
    { role: 'ACCOUNT_EXECUTIVE', label: 'Account Executive', description: 'Manages key client accounts and enterprise closures.' },
  ],
  Intern: [
    { role: 'SALES_INTERN', label: 'Sales Intern', description: 'Assists sales team with lead research and outbound support.' },
    { role: 'IT_INTERN', label: 'IT / Web Development Intern', description: 'Assists engineering team with frontend/backend tasks.' },
    { role: 'SEO_INTERN', label: 'SEO & Content Intern', description: 'Assists with keyword research, backlinks and site audits.' },
    { role: 'MARKETING_INTERN', label: 'Digital Marketing Intern', description: 'Assists with social media, creatives and campaigns.' },
    { role: 'HR_INTERN', label: 'HR Operations Intern', description: 'Assists HR with candidate screening and onboardings.' },
    { role: 'OPERATIONS_INTERN', label: 'Operations Intern', description: 'Assists with operations workflow and client logistics.' },
    { role: 'GENERAL_INTERN', label: 'Intern / Trainee', description: 'General internship and trainee tasks across teams.' },
  ],
  'IT Department': [
    { role: 'IT_SUPPORT', label: 'IT Support Engineer', description: 'Technical assistance, office networking, and hardware setup.' },
    { role: 'FULL_STACK_DEV', label: 'Full Stack Developer', description: 'Full-stack software engineering and application development.' },
    { role: 'FRONTEND_DEV', label: 'Frontend Developer', description: 'Builds responsive UI, interactive dashboards and web apps.' },
    { role: 'BACKEND_DEV', label: 'Backend Developer', description: 'Designs scalable APIs, databases and microservices.' },
    { role: 'DEVOPS_SYSADMIN', label: 'System Administrator / DevOps', description: 'Cloud infrastructure, CI/CD, deployments and servers.' },
    { role: 'QA_TESTER', label: 'QA / Software Tester', description: 'Quality assurance, functional and automation testing.' },
    { role: 'IT_MANAGER', label: 'IT Team Lead / Manager', description: 'Oversees IT infrastructure, projects and developer team.' },
  ],
  SEO: [
    { role: 'SEO_EXECUTIVE', label: 'SEO Executive', description: 'On-page and off-page search engine optimization.' },
    { role: 'SEO_ANALYST', label: 'SEO Analyst / Specialist', description: 'Technical SEO audits, keyword ranking and traffic analysis.' },
    { role: 'LINK_BUILDER', label: 'Link Building & Outreach Specialist', description: 'High-authority backlink outreach and partner PR.' },
    { role: 'CONTENT_STRATEGIST', label: 'SEO Content Strategist', description: 'SEO-driven articles, landing page copy and content calendar.' },
    { role: 'SEO_MANAGER', label: 'SEO Team Lead / Manager', description: 'Overall organic search strategy, Google analytics and growth.' },
  ],
  Marketing: [
    { role: 'MARKETING_SDR', label: 'Marketing / Inbound SDR', description: 'Lead generation, campaign imports, and early qualification.' },
    { role: 'DIGITAL_MARKETER', label: 'Digital Marketing Executive', description: 'Online brand promotions, social ads and email blasts.' },
    { role: 'PERFORMANCE_MARKETER', label: 'Performance Marketing Specialist', description: 'Google Ads, Meta Ads (PPC) and conversion tracking.' },
    { role: 'SOCIAL_MEDIA_MGR', label: 'Social Media & Content Manager', description: 'Social media growth, creative designs and viral hooks.' },
    { role: 'MARKETING_MANAGER', label: 'Marketing Manager', description: 'Comprehensive marketing campaigns and budget execution.' },
  ],
  Operations: [
    { role: 'OPERATIONS_EXECUTIVE', label: 'Operations Executive', description: 'Day-to-day business operations and process coordination.' },
    { role: 'PROJECT_COORDINATOR', label: 'Project Coordinator', description: 'Project timelines, resource delivery and cross-team sync.' },
    { role: 'OPERATIONS_MANAGER', label: 'Operations Manager', description: 'Streamlining business workflows, vendor SLAs and efficiency.' },
  ],
  'Customer Support': [
    { role: 'SUPPORT_EXECUTIVE', label: 'Customer Support Executive', description: 'Handling client queries, tickets, live chat and support emails.' },
    { role: 'CLIENT_SUCCESS_REP', label: 'Customer Success Specialist', description: 'Client onboarding, retention, relationship and NPS tracking.' },
    { role: 'SUPPORT_LEAD', label: 'Customer Support Lead', description: 'Escalation resolution, support SLAs and team coaching.' },
  ],
  'Finance & Accounts': [
    { role: 'FINANCE_VIEWER', label: 'Finance Viewer', description: 'View invoices, payment reconciliations, and revenue ledger.' },
    { role: 'ACCOUNTANT', label: 'Accounts Executive / Accountant', description: 'Bookkeeping, tax compliance, invoices and payment tracking.' },
    { role: 'BILLING_EXECUTIVE', label: 'Billing & Collection Specialist', description: 'Client billing, receivables follow-ups and statements.' },
    { role: 'FINANCE_MANAGER', label: 'Finance & Accounts Manager', description: 'Financial planning, audits, payroll and cash flow oversight.' },
  ],
  'Human Resources': [
    { role: 'HR_EXECUTIVE', label: 'HR Executive', description: 'Day-to-day employee lifecycle, attendance and documentation.' },
    { role: 'HR_RECRUITER', label: 'Talent Acquisition / Recruiter', description: 'Sourcing, screening, scheduling and hiring candidates.' },
    { role: 'HR_OPERATIONS', label: 'HR Operations Specialist', description: 'HR process compliance, employee benefits and payroll coordination.' },
    { role: 'HR_MANAGER', label: 'Human Resources Manager', description: 'HR policy management, employee engagement and appraisals.' },
  ],
  'General Sales': [
    { role: 'SALES_REP', label: 'Sales Representative (Executive)', description: 'Manages sales deals, leads, quotes and client pipelines.' },
    { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Team leaderboards, lead quota approvals, sales performance.' },
  ],
  'Sales & Business Development': [
    { role: 'SALES_REP', label: 'Sales Representative', description: 'Direct sales, customer demos and closing deals.' },
    { role: 'BDE', label: 'Business Development Executive', description: 'Lead prospecting and outbound B2B relationship building.' },
    { role: 'SALES_MANAGER', label: 'Sales Manager', description: 'Sales pipeline direction, quotas and rep mentorship.' },
  ],
};

export interface DepartmentListResponse {
  departments: string[];
}

export interface AddDepartmentResponse {
  department: string;
  departments: string[];
}

export const departmentApi = {
  getDepartments: async (): Promise<string[]> => {
    try {
      const res = await apiClient.get<DepartmentListResponse | string[]>('/departments');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as any).departments)) return (res as any).departments;
      return DEFAULT_DEPARTMENTS;
    } catch (err) {
      console.warn('Failed to load departments from API, using defaults:', err);
      return DEFAULT_DEPARTMENTS;
    }
  },

  createDepartment: async (name: string): Promise<string[]> => {
    try {
      const res = await apiClient.post<AddDepartmentResponse>('/departments', { name });
      if (res && Array.isArray(res.departments)) {
        return res.departments;
      }
      return DEFAULT_DEPARTMENTS;
    } catch (err) {
      console.error('Failed to create department on server:', err);
      throw err;
    }
  },

  getDepartmentRoles: async (): Promise<Record<string, DepartmentRoleItem[]>> => {
    try {
      const res = await apiClient.get<{ roles: Record<string, DepartmentRoleItem[]> }>('/departments/roles');
      if (res && res.roles && typeof res.roles === 'object') {
        return { ...DEFAULT_DEPARTMENT_ROLES, ...res.roles };
      }
      return DEFAULT_DEPARTMENT_ROLES;
    } catch (err) {
      console.warn('Failed to fetch department roles, using defaults:', err);
      return DEFAULT_DEPARTMENT_ROLES;
    }
  },

  addDepartmentRole: async (
    department: string,
    roleData: { role?: string; label: string; description?: string }
  ): Promise<DepartmentRoleItem[]> => {
    try {
      const res = await apiClient.post<{ department: string; roles: DepartmentRoleItem[] }>('/departments/roles', {
        department,
        ...roleData,
      });
      if (res && Array.isArray(res.roles)) {
        return res.roles;
      }
      return DEFAULT_DEPARTMENT_ROLES[department] || [];
    } catch (err) {
      console.error('Failed to add department role:', err);
      throw err;
    }
  },
};
