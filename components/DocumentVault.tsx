"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";

type Doc = { id: string; title: string; category: string; periodLabel: string };

const categories = ["All documents", "Statements", "Tax Forms", "Contracts", "Modifications"];

const categoryMatch: Record<string, string> = {
  Statements: "Statement",
  "Tax Forms": "Tax Form",
  Contracts: "Contract",
  Modifications: "Modification",
};

export default function DocumentVault({ documents }: { documents: Doc[] }) {
  const [filter, setFilter] = useState("All documents");

  const visible = useMemo(() => {
    if (filter === "All documents") return documents;
    return documents.filter((d) => d.category === categoryMatch[filter]);
  }, [documents, filter]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          data-track-label="Document filter"
          className="rounded-brand border border-border px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {visible.map((doc) => (
          <Card key={doc.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-brand bg-muted/10 text-muted">
                📄
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{doc.title}</div>
                <div className="text-xs text-muted">
                  {doc.category} • {doc.periodLabel}
                </div>
              </div>
            </div>
            <button
              type="button"
              data-track-label={`Download document:${doc.title}`}
              className="rounded-brand border border-border p-1.5 text-muted hover:bg-muted/10"
              aria-label="Download"
            >
              ⬇
            </button>
          </Card>
        ))}
        {visible.length === 0 && <p className="text-sm text-muted">No documents in this category.</p>}
      </div>
    </div>
  );
}
