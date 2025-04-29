"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value | undefined) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, ...props }, ref) => {
      return (
        <RPNInput.default
          ref={ref}
          className={cn("flex", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false} // Avoids caret jumping issues
          /**
           * Handles the onChange event.
           *
           * react-phone-number-input might trigger the onChange event as undefined
           * when a valid phone number is not entered. To prevent this,
           * the value is coerced to an empty string or undefined if preferred.
           * Here we pass undefined if the value is falsy.
           *
           * @param {RPNInput.Value | undefined} value - The entered value
           */
          onChange={(value) => onChange?.(value)}
          {...props}
        />
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn("rounded-e-lg rounded-s-none h-10", className)} // Ensure height consistency
    {...props}
    ref={ref}
  />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const [open, setOpen] = React.useState(false); // Control popover state

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "flex gap-1 rounded-e-none rounded-s-lg px-3 h-10", // Ensure height consistency
            "border-r-0" // Keep border consistent
          )}
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "h-4 w-4 opacity-50",
              disabled ? "cursor-not-allowed opacity-50" : ""
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Buscar país..." />
          <CommandList>
            <ScrollArea className="h-72">
              <CommandEmpty>No se encontró el país.</CommandEmpty>
              <CommandGroup>
                {countryList
                  .filter((country) => country.value) // Filter out placeholder
                  .map(({ value, label }) =>
                    value ? (
                      <CountrySelectOption
                        key={value}
                        country={value}
                        countryName={label}
                        selectedCountry={selectedCountry}
                        onChange={(newCountry) => {
                            onChange(newCountry);
                            setOpen(false); // Close popover on selection
                        }}
                      />
                    ) : null,
                  )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
}: CountrySelectOptionProps) => {
  return (
    <CommandItem
        key={country}
        className="gap-2 cursor-pointer"
        onSelect={() => {
            console.log(`CountrySelectOption clicked/selected: ${countryName} (${country})`);
            onChange(country);
        }}
    >
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      {RPNInput.getCountryCallingCode && ( // Check if function exists
        <span className="text-sm text-foreground/50">
          {`+${RPNInput.getCountryCallingCode(country)}`}
        </span>
      )}
      <CheckIcon
        className={cn(
            "ml-auto h-4 w-4",
            country === selectedCountry ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        // Fallback or placeholder for missing flags
        <div className="h-full w-full bg-gray-200" />
      )}
    </span>
  );
};
FlagComponent.displayName = "FlagComponent";

export { PhoneInput }; 