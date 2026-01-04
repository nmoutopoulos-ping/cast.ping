import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Filter, Download } from "lucide-react";

export function TransactionFilters() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Input type="date" className="w-36 h-9" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" className="w-36 h-9" />
      </div>

      <Select defaultValue="all">
        <SelectTrigger className="w-32 h-9">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="in">IN</SelectItem>
          <SelectItem value="out">OUT</SelectItem>
          <SelectItem value="self">SELF</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input type="number" placeholder="Min ETH" className="w-24 h-9" />
        <span className="text-muted-foreground">-</span>
        <Input type="number" placeholder="Max ETH" className="w-24 h-9" />
      </div>

      <Button variant="outline" size="sm" className="gap-2 ml-auto">
        <Download className="w-4 h-4" />
        Export CSV
      </Button>
    </div>
  );
}
