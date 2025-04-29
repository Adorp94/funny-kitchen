"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean;
  searchValue?: string;
  onSearchValueChange?: (search: string) => void;
  loadingPlaceholder?: string;
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...",
  searchPlaceholder = "Search option...",
  emptyMessage = "No option found.",
  triggerClassName,
  contentClassName,
  isLoading = false,
  searchValue,
  onSearchValueChange,
  loadingPlaceholder = "Loading..."
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const [internalSearchValue, setInternalSearchValue] = React.useState('');
  const effectiveSearchValue = searchValue !== undefined ? searchValue : internalSearchValue;
  const effectiveOnSearchChange = onSearchValueChange !== undefined ? onSearchValueChange : setInternalSearchValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", triggerClassName)}
        >
          {value
            ? options.find((option) => option.value === value)?.label ?? placeholder
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}>
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={effectiveSearchValue} 
            onValueChange={effectiveOnSearchChange}
          />
          <CommandList>
            {isLoading && (
              <div className="p-4 py-6 text-center text-sm flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {loadingPlaceholder}
              </div>
            )}
            {!isLoading && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            {!isLoading && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 