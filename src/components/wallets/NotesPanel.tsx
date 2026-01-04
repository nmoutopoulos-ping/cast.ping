import { FileText, Upload, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockActivityLog, mockDocuments } from "@/lib/mockData";
import { formatDistanceToNow, format } from "date-fns";
import type { WalletProfile } from "@/types/wallet";

interface NotesPanelProps {
  wallet: WalletProfile;
}

export function NotesPanel({ wallet }: NotesPanelProps) {
  return (
    <div className="w-80 border-l border-border bg-card p-6 space-y-6 overflow-y-auto scrollbar-thin">
      {/* Wallet Profile */}
      <div>
        <p className="section-header">Wallet Profile</p>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea 
              className="mt-1 min-h-[100px]" 
              defaultValue={wallet.notes}
              placeholder="Add notes about this wallet..."
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Associated Entity</Label>
            <Input className="mt-1" defaultValue={wallet.entityName} placeholder="e.g., Acme Corp" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Client / Ticket ID</Label>
            <Input className="mt-1" defaultValue={wallet.clientId} placeholder="e.g., CLIENT-001" />
          </div>
        </div>
      </div>

      {/* Documents */}
      <div>
        <p className="section-header">Documents</p>
        {mockDocuments.length > 0 ? (
          <div className="space-y-2">
            {mockDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(doc.size / 1024).toFixed(0)} KB • {format(doc.uploadedAt, "MMM d")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents attached</p>
        )}
        <Button variant="outline" className="w-full mt-3 gap-2">
          <Upload className="w-4 h-4" />
          Attach Document
        </Button>
      </div>

      {/* Activity Log */}
      <div>
        <p className="section-header">Activity Log</p>
        <div className="space-y-3">
          {mockActivityLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.action}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
