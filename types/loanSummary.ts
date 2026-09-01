export type LoanStatistics = {
  ACCT_NO: string;
  ACCT_NM: string;
  OVERDUE_PRINCIPAL: number;
  OVERDUE_INTEREST: number;
  DUE_PRINCIPAL: number;
  DUE_INTEREST: number;
  TOTAL_PRINCIPAL_OUTSTANDING: number;
  TOTAL_INTEREST_OUTSTANDING: number;
  PRINCIPAL_PAID: number;
  INTEREST_PAID: number;
  TOTAL_PAID: number;
  TOTAL_OVERDUE: number;
  TOTAL_DUE_NEXT: number;
  TOTAL_OUTSTANDING_ALL: number;
  TOTAL_DUE_NOW: number;
  ORIGINAL_LOAN_AMOUNT: number;
  CHARGES: number;
  INTEREST_RATE: number;
  ACCT_ID: number;
  TERM_VALUE: number;
  TERM_CD: string;
  CLEARED_BAL: number;
  DR_INT_ACCRUED: number;
  LAST_ACCRUAL_DT: string;
  DR_INT_PER_DAY: number;
  DR_INT_ACCRUED_YTD: number;
  TOTAL_CHRGS: number;
  ACCOUNT_STATUS: string;
  DISBURSED_BAL: number;
  STATUS_EFFECTIVE_DT: string;
  MATURITY_DT: string;
};

export type LoanStatisticsResponse = {
  loanstatisticsdbReferenceOutput: LoanStatistics[];
};