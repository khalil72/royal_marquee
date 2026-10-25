"use client";

import { useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";

export function CustomerPicker({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [open, setOpen] = useState(false);
  const customers = useStore((s) => s.customers);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="lg">
          <Search /> Find existing customer
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,380px)] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search by name, mobile or CNIC…" />
          <CommandList>
            <CommandEmpty>No customer found. Fill in the form to add a new one.</CommandEmpty>
            <CommandGroup heading={`${customers.length} customers`}>
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.mobile} ${c.cnic ?? ""} ${c.id}`}
                  onSelect={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.mobile} · {c.address}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
