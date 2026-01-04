import { useState } from "react";
import { Search, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockSavedQueries } from "@/lib/mockData";

interface WalletSearchBarProps {
  onSearch?: (address: string, queryId: string) => void;
  size?: "default" | "large";
}

export function WalletSearchBar({ onSearch, size = "default" }: WalletSearchBarProps) {
  const [address, setAddress] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(mockSavedQueries[0]);

  const handleSearch = () => {
    if (address && onSearch) {
      onSearch(address, selectedQuery.id);
    }
  };

  const isLarge = size === "large";

  return (
    <div className={`flex gap-3 ${isLarge ? "max-w-3xl" : "max-w-2xl"}`}>
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${isLarge ? "w-5 h-5" : "w-4 h-4"}`} />
        <Input
          type="text"
          placeholder="Paste wallet address or ENS..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={`${isLarge ? "pl-11 h-12 text-base" : "pl-9 h-10"} font-mono`}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`gap-2 min-w-[200px] justify-between ${isLarge ? "h-12" : "h-10"}`}>
            <span className="truncate text-sm">{selectedQuery.name}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px]">
          {mockSavedQueries.map((query) => (
            <DropdownMenuItem
              key={query.id}
              onClick={() => setSelectedQuery(query)}
              className="flex flex-col items-start gap-1"
            >
              <span className="font-medium">{query.name}</span>
              <span className="text-xs text-muted-foreground">{query.description}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button 
        onClick={handleSearch} 
        className={`gap-2 ${isLarge ? "h-12 px-6" : "h-10"}`}
        disabled={!address}
      >
        <Play className="w-4 h-4" />
        Run Query
      </Button>
    </div>
  );
}
