import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface MultiTechnicianFilterProps {
  technicians: Array<{ id: string; name: string }>;
  /**
   * Selected technician ids. Use `null` for "all" and an empty array for "none".
   */
  selected: string[] | null;
  onChange: (ids: string[] | null) => void;
}

const MultiTechnicianFilter: React.FC<MultiTechnicianFilterProps> = ({
  technicians,
  selected,
  onChange,
}) => {
  const allSelected = selected === null;

  const toggle = (id: string, checked: boolean) => {
    if (allSelected) {
      const ids = technicians.map(t => t.id);
      const newIds = checked ? ids : ids.filter(t => t !== id);
      onChange(newIds);
    } else {
      const current = selected || [];
      const newIds = checked ? [...current, id] : current.filter(t => t !== id);
      onChange(newIds);
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      onChange(null);
    } else {
      onChange([]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Monteurs
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 space-y-1">
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={toggleAll}
          onSelect={e => e.preventDefault()}
        >
          Alle monteurs
        </DropdownMenuCheckboxItem>
        {technicians.map(t => (
          <DropdownMenuCheckboxItem
            key={t.id}
            checked={allSelected ? true : (selected || []).includes(t.id)}
            onCheckedChange={checked => toggle(t.id, checked as boolean)}
            onSelect={e => e.preventDefault()}
          >
            {t.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiTechnicianFilter;
