import type { User } from '../types/erp.ts';
import {
  canApproveFactoryExpense,
  canAllocateManufacturingOverhead,
  canPostFactoryExpense,
  canRollbackCostAllocation,
  canViewManufacturingCostDashboard,
  canViewManufacturingCostSheet,
  hasAnyManufacturingCostingAccess,
  hasPageAccess,
} from '../types/pagePermissions.ts';
import {
  getFirstPermittedPayrollTab,
  isPayrollTabPermitted,
  payrollModuleIdToTab,
} from './payrollPermissions.ts';

/**
 * Exact top-to-bottom navigation order matching Sidebar.tsx navSections.
 * Used to determine the first authorized landing page when a user lacks Dashboard permission.
 */
export const SIDEBAR_ORDERED_MODULES: readonly string[] = [
  'dashboard',

  // Basic Data children
  'basic-data-raw-materials',
  'basic-data-raw-categories',
  'basic-data-raw-classifications',
  'basic-data-products',
  'basic-data-categories',
  'basic-data-brands',
  'basic-data-warehouses',
  'basic-data-distributors',
  'basic-data-customers',
  'basic-data-pricing-matrix',
  'basic-data-org-hierarchy',
  'basic-data-field-force',
  'basic-data-departments',
  'basic-data-banks',
  'basic-data-uom',
  'basic-data-offers',

  // Supply Chain & Factory
  'raw-material-receive',
  'raw-material-inventory',
  'procurement',
  'manufacturing',
  'manufacturing-costing',

  // Stock & Warehouse
  'stock-cid-receive',
  'stock-create-opening',
  'stock-upload-opening',
  'stock-upload-primary',
  'stock-issued',
  'stock-received',
  'stock-primary-return',
  'stock-damage-return',
  'stock-transfer',
  'stock-adjustment',
  'inventory-stock',
  'warehouse',

  // Field Force & Sales
  'field-tracker',
  'mobile-field',
  'sales-orders',
  'sales-orders-registry',
  'crm-agreements',
  'tada',

  // Accounts & Finance
  'finance-accounting-dashboard',
  'finance-coa',
  'finance-opening-balances',
  'finance-journal-vouchers',
  'finance-general-ledger',
  'finance-cash-book',
  'finance-bank-book',
  'finance-receivables',
  'finance-payables',
  'finance-trial-balance',
  'finance-balance-sheet',
  'finance-profit-loss',
  'finance-cash-flow',
  'finance-fiscal-years',
  'finance-cashbook',

  // Installment Management
  'installment-dashboard',
  'installment-new-plan',
  'installment-agreements',
  'installment-schedule',
  'installment-customers',
  'installment-due',
  'installment-overdue',
  'installment-payment-collection',
  'installment-payment-history',
  'installment-early-settlement',
  'installment',

  // Collection Management
  'collection-dashboard',
  'collection-target',
  'collection-upcoming',
  'collection-overdue',
  'collection-followup',
  'collection-assignments',
  'collection-history',
  'collection',

  // SMS & Notification Center
  'sms-dashboard',
  'sms-templates',
  'sms-rules',
  'sms-history',
  'sms-failed',
  'sms-settings',
  'sms',

  // Installment Reports
  'report-installment-receivable',
  'report-monthly-collection',
  'report-installment-overdue',
  'report-customer-ledger',
  'report-installment-aging',
  'report-officer-performance',
  'report-sms-delivery',

  // Payroll & HR / Overtime / Reports
  'payroll',
  'overtime-dashboard',
  'overtime-requests',
  'overtime-requisition',
  'overtime-attendance',
  'overtime-batch-allocation',
  'overtime-sync',
  'overtime-policies',
  'overtime-reports',
  'overtime-management',
  'reports',

  // Warranty & Service + User Management
  'warranty-dashboard',
  'warranty-complaints',
  'warranty-jobcards',
  'warranty-receiving',
  'warranty-verification',
  'warranty-inspection',
  'warranty-repair',
  'warranty-parts-consumption',
  'warranty-estimation',
  'warranty-billing',
  'warranty-qc',
  'warranty-dispatch',
  'warranty-policies',
  'warranty-history',
  'warranty-reports',
  'warranty-settings',
  'warranty',
  'users-permissions',
  'settings',
];

/**
 * Evaluates whether the user has existing ERP clearance to view a given module/route.
 * Preserves all existing page-wise, role-wise, and manufacturing costing checks without bypassing anything.
 */
export function isUserPermittedForModule(
  user: Partial<User> | null | undefined,
  moduleId: string
): boolean {
  if (!user || !user.id || user.id === 'guest') return false;
  if (user.status === 'Blocked' || user.status === 'Inactive') return false;
  if (user.role === 'Super Admin') return true;

  if (moduleId === 'manufacturing-cost-sheet') {
    return canViewManufacturingCostSheet(user);
  }
  if (moduleId === 'manufacturing-costing') {
    return hasAnyManufacturingCostingAccess(user);
  }
  if (moduleId === 'manufacturing-expenses') {
    return (
      canViewManufacturingCostDashboard(user) ||
      canPostFactoryExpense(user) ||
      canApproveFactoryExpense(user)
    );
  }
  if (moduleId === 'manufacturing-allocations') {
    return (
      canViewManufacturingCostDashboard(user) ||
      canAllocateManufacturingOverhead(user) ||
      canRollbackCostAllocation(user)
    );
  }

  if (moduleId === 'payroll') {
    return hasPageAccess(user, 'payroll') && getFirstPermittedPayrollTab(user) !== null;
  }
  if (moduleId.startsWith('payroll-')) {
    const tab = payrollModuleIdToTab(moduleId);
    return Boolean(tab && isPayrollTabPermitted(user, tab));
  }

  return hasPageAccess(user, moduleId);
}

/**
 * Returns all modules the user can access in sidebar menu order.
 */
export function getAccessibleModulesForUser(
  user: Partial<User> | null | undefined
): string[] {
  if (!user || !user.id || user.id === 'guest') return [];
  if (user.status === 'Blocked' || user.status === 'Inactive') return [];
  return SIDEBAR_ORDERED_MODULES.filter((mod) => isUserPermittedForModule(user, mod));
}

/**
 * Selects the first accessible page/module for the user following sidebar menu order.
 * Returns null if the user has no accessible modules at all.
 */
export function getFirstAccessibleModule(
  user: Partial<User> | null | undefined
): string | null {
  if (!user || !user.id || user.id === 'guest') return null;
  if (user.status === 'Blocked' || user.status === 'Inactive') return null;

  for (const mod of SIDEBAR_ORDERED_MODULES) {
    if (isUserPermittedForModule(user, mod)) {
      return mod;
    }
  }
  return null;
}

/**
 * Resolves the post-login landing module:
 * 1. Honors an explicit deep-link module if the user actually has permission for it.
 * 2. Uses 'dashboard' if the user has Dashboard permission.
 * 3. Otherwise falls back to the first accessible sidebar module (or null if none).
 */
export function resolvePostLoginModule(
  user: Partial<User> | null | undefined,
  intendedModule?: string | null
): string | null {
  if (!user || !user.id || user.id === 'guest') return null;

  if (
    intendedModule &&
    intendedModule !== 'dashboard' &&
    isUserPermittedForModule(user, intendedModule)
  ) {
    return intendedModule;
  }

  if (isUserPermittedForModule(user, 'dashboard')) {
    return 'dashboard';
  }

  return getFirstAccessibleModule(user);
}
