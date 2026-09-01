export type LoanScheduleItem = {
  InstallmentNo: number;
  LoanAccount: string;
  DueDate: string;
  EventType: string;
  CurrencyCode: string;
  PrincipalAmount: number;
  InterestAmount: number;
  FeeAmount: number;
  LateFeeAmount: number;
  TotalAmount: number;
  ServicedAmount: number;
  UnservicedAmount: number;
  ServicedDate: string | null;
};

export type LoanScheduleResponse = {
  loanScheduledbReferenceOutput: LoanScheduleItem[];
};

export type LoanAccountHistoryItem = {
  DebitAmt: number;
  TransactionReference: string;
  TransactionDescription: string;
  LoanAccount: string;
  Amount: number;
  CreditAmt: number;
  ClearedBalance: number;
  EventCode: string;
  ChannelDescription: string;
  LedgerBalance: number;
  BusinessUnit: string;
  Currency: string;
  ValueDate: string;
  DateTimestamp: string;
  DrCr: "DR" | "CR";
  ChequeNo: string;
  EventDescription: string;
  TransactionDate: string;
};

export type LoanAccountHistoryResponse = {
  loanAccountHistoryBusinessServiceOutput: LoanAccountHistoryItem[];
};