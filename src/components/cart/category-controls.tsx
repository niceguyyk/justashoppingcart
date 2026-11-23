"use client";

import { useId, useState } from "react";
import { ListFilter, Plus, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CATEGORY_NAME_LIMIT,
  MAX_PRODUCT_CATEGORIES,
  UNCATEGORIZED,
  newCategoryName,
} from "@/lib/cart";

export function CategoryPicker({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (categories: string[]) => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const categories = [...new Set([...available, ...selected])];
  function create() {
    try {
      const category = newCategoryName(categories, name);
      if (selected.length >= MAX_PRODUCT_CATEGORIES)
        throw new Error(`A product can have up to ${MAX_PRODUCT_CATEGORIES} categories.`);
      onChange([...selected, category]);
      setName("");
      setError("");
    } catch (problem) {
      setError((problem as Error).message);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Categories</span>
      <p className="text-xs text-muted-foreground">
        Choose several categories or create one for this product.
      </p>
      {categories.length > 0 && (
        <div className="grid max-h-36 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {categories.map((category, index) => (
            <Field key={category} orientation="horizontal" className="min-w-0 gap-2">
              <Checkbox
                id={`${id}-category-${index}`}
                checked={selected.includes(category)}
                disabled={!selected.includes(category) && selected.length >= MAX_PRODUCT_CATEGORIES}
                onCheckedChange={(checked) => {
                  onChange(checked
                    ? [...selected, category]
                    : selected.filter((item) => item !== category));
                  setError("");
                }}
              />
              <FieldLabel htmlFor={`${id}-category-${index}`} className="min-w-0 truncate font-normal">
                {category}
              </FieldLabel>
            </Field>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          aria-label="New category name"
          placeholder="e.g. Helmet or RAM"
          value={name}
          maxLength={CATEGORY_NAME_LIMIT}
          onChange={(event) => { setName(event.target.value); setError(""); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); create(); } }}
        />
        <Button type="button" variant="outline" disabled={!name.trim()} onClick={create}>
          <Plus data-icon="inline-start" />Add
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CategoryFilter({
  categories,
  selected,
  mode,
  onSelectedChange,
  onModeChange,
}: {
  categories: string[];
  selected: string[];
  mode: "show" | "hide";
  onSelectedChange: (categories: string[]) => void;
  onModeChange: (mode: "show" | "hide") => void;
}) {
  const id = useId();
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="max-w-full" />}>
        <ListFilter data-icon="inline-start" />
        <span className="truncate">{selected.length ? `${mode === "hide" ? "Hidden" : "Showing"}: ${selected.length}` : "Categories"}</span>
        {selected.length > 0 && <Badge variant="secondary" className="ml-1">{selected.length}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>Filter categories</PopoverTitle>
          <PopoverDescription>Select multiple categories to show or hide.</PopoverDescription>
        </PopoverHeader>
        <ToggleGroup
          aria-label="Category filter mode"
          className="w-full"
          value={[mode]}
          onValueChange={(value) => { if (value[0]) onModeChange(value[0] as "show" | "hide"); }}
          variant="outline"
          size="sm"
          spacing={0}
        >
          <ToggleGroupItem className="flex-1" value="show">Show only</ToggleGroupItem>
          <ToggleGroupItem className="flex-1" value="hide">Hide</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto py-1">
          {[...categories, UNCATEGORIZED].map((category, index) => (
            <Field key={category} orientation="horizontal" className="gap-2">
              <Checkbox
                id={`${id}-filter-${index}`}
                checked={selected.includes(category)}
                onCheckedChange={(checked) => onSelectedChange(checked
                  ? [...selected, category]
                  : selected.filter((item) => item !== category))}
              />
              <FieldLabel htmlFor={`${id}-filter-${index}`} className="min-w-0 flex-1 font-normal">
                {category === UNCATEGORIZED ? "Uncategorized" : category}
              </FieldLabel>
            </Field>
          ))}
        </div>
        <Button variant="ghost" size="sm" disabled={!selected.length} onClick={() => onSelectedChange([])}>
          Clear filter
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function ProductCategoryBadges({ categories }: { categories?: string[] }) {
  if (!categories?.length) return null;
  return (
    <div className="flex flex-wrap gap-1" aria-label="Product categories">
      {categories.map((category) => <Badge key={category} variant="secondary" className="max-w-full truncate"><Tags className="size-3" />{category}</Badge>)}
    </div>
  );
}
