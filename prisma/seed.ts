import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const borrower = await prisma.user.upsert({
    where: { email: "harlmeen51@gmail.com" },
    update: {},
    create: {
      name: "Harl Meen",
      email: "harlmeen51@gmail.com",
      passwordHash,
      role: "BORROWER",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@neptune.dev" },
    update: {},
    create: {
      name: "neptune Admin",
      email: "admin@neptune.dev",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  const existingLoan = await prisma.loanAccount.findFirst({
    where: { userId: borrower.id },
  });
  if (existingLoan) {
    console.log("Seed data already present, skipping.");
    return;
  }

  const loan = await prisma.loanAccount.create({
    data: {
      userId: borrower.id,
      nickname: "Auto Loan — 2023",
      accountNumber: "1004829371",
      status: "Current",
      originalAmount: 28000,
      interestRate: 6.49,
      termMonths: 60,
      originationDate: new Date("2023-08-15"),
      maturityDate: new Date("2028-08-15"),
      monthlyPayment: 547.32,
      principal: 18500,
      accruedInterest: 42,
      lateFees: 0,
      escrow: 0,
      ytdInterestPaid: 980,
      ytdPrincipalPaid: 3200,
      dailyInterestRate: 3.29,
    },
  });

  const months = [
    "2025-09-15",
    "2025-10-15",
    "2025-11-15",
    "2025-12-15",
    "2026-01-15",
    "2026-02-15",
    "2026-03-15",
    "2026-04-15",
    "2026-05-15",
    "2026-06-15",
    "2026-07-15",
    "2026-08-15",
  ];
  let ref = 100000;
  for (const [i, d] of months.entries()) {
    if (d === "2025-12-15") {
      await prisma.transaction.create({
        data: {
          loanId: loan.id,
          type: "fee_waived",
          label: "Late fee — waived",
          amount: 25,
          date: new Date(d),
        },
      });
    }
    await prisma.transaction.create({
      data: {
        loanId: loan.id,
        type: "payment",
        label: "Monthly payment",
        reference: `CNF${ref + i}`,
        amount: -547.32,
        date: new Date(d),
      },
    });
  }
  await prisma.transaction.create({
    data: {
      loanId: loan.id,
      type: "disbursement",
      label: "Loan disbursement",
      amount: -28000,
      date: new Date("2023-08-15"),
    },
  });

  await prisma.document.createMany({
    data: [
      {
        loanId: loan.id,
        title: "Monthly Statement — July 2026",
        category: "Statement",
        periodLabel: "Aug 1, 2025 – Jul 2026",
        date: new Date("2026-08-01"),
      },
      {
        loanId: loan.id,
        title: "Monthly Statement — June 2026",
        category: "Statement",
        periodLabel: "Jul 1, 2026 – Jun 2026",
        date: new Date("2026-07-01"),
      },
      {
        loanId: loan.id,
        title: "Form 1098 — Tax Year 2025",
        category: "Tax Form",
        periodLabel: "Jan 31, 2026 · 2025",
        date: new Date("2026-01-31"),
      },
      {
        loanId: loan.id,
        title: "Loan Agreement",
        category: "Contract",
        periodLabel: "Aug 15, 2023",
        date: new Date("2023-08-15"),
      },
    ],
  });

  console.log("Seed complete. Login as harlmeen51@gmail.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
