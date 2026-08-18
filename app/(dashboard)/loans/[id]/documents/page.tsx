import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentVault from "@/components/DocumentVault";

export default async function DocumentsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const loan = await prisma.loanAccount.findFirst({
    where: { id: params.id, userId: (session!.user as any).id },
    include: { documents: { orderBy: { date: "desc" } } },
  });
  if (!loan) notFound();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Document Vault</h2>
      </div>
      <DocumentVault
        documents={loan.documents.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          periodLabel: d.periodLabel ?? "",
        }))}
      />
    </div>
  );
}
