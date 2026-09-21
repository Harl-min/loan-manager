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

export type NextPayment = {
  amount: number;
  dueDate: string;
  installmentNo: number;
} | null;

function parseDueDate(dateString: string): Date | null {
  // API format: DD-MM-YYYY
  const [day, month, year] = dateString.split("-").map(Number);

  if (!day || !month || !year) {
    return null;
  }

  // Use local date to avoid timezone shifting
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfToday(): Date {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

export function getNextPayment(
  schedule: LoanScheduleItem[]
): NextPayment {
  const today = startOfToday();

  const unpaidSchedule = schedule
    .filter((item) => {
      const dueDate = parseDueDate(item.DueDate);

      return (
        dueDate &&
        item.EventType === "REPAYMENT" &&
        Number(item.UnservicedAmount) > 0
      );
    })
    .sort((a, b) => {
      const dateA = parseDueDate(a.DueDate)!.getTime();
      const dateB = parseDueDate(b.DueDate)!.getTime();

      return dateA - dateB;
    });

  // First unpaid installment that is due today or in the future
  const upcomingPayment = unpaidSchedule.find((item) => {
    const dueDate = parseDueDate(item.DueDate)!;

    return dueDate >= today;
  });

  if (upcomingPayment) {
    return {
      amount: Number(upcomingPayment.UnservicedAmount),
      dueDate: upcomingPayment.DueDate,
      installmentNo: upcomingPayment.InstallmentNo,
    };
  }

  // If there is no future installment, return null.
  return null;
}