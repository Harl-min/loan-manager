import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AmortizationSchedule from "@/components/AmortizationSchedule";

export default async function SchedulePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session!.user as any).id },
  });
  if (!loan) notFound();

  return (
    <div>
      <h2 className="mb-3 font-semibold text-foreground">Amortization Schedule</h2>
      <AmortizationSchedule
        principal={loan.principal}
        annualRate={loan.interestRate}
        monthlyPayment={loan.monthlyPayment}
        remainingMonths={Math.max(
          1,
          Math.round(
            (loan.maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44)
          )
        )}
      />
    </div>
  );
}
