import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface MultiTechnicianFilterProps {
  technicians: Array<{ id: string; name: string }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}

const MultiTechnicianFilter: React.FC<MultiTechnicianFilterProps> = ({
  technicians,
  selected,
  onChange,
}) => {
  const [open, setOpen] = React.useState(false);

  const allChecked =
    technicians.length > 0 && selected.length === technicians.length;

  const toggleAll = () => {
    if (allChecked) {
      onChange([]);
    } else {
      onChange(technicians.map(t => t.id));
    }
  };

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...selected, id])]);
    } else {
      onChange(selected.filter(t => t !== id));
    }
  };

  const buttonLabel = allChecked
    ? 'Alle monteurs'
    : selected.length === 0
    ? 'Geen monteurs'
    : `${selected.length} monteurs`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-64 justify-between">
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="flex flex-col space-y-1 max-h-64 overflow-y-auto">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allChecked}
              onCheckedChange={toggleAll}
              id="tech-all"
            />
            <span>Alle monteurs</span>
          </label>
          {technicians.map(t => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selected.includes(t.id)}
                onCheckedChange={checked => toggle(t.id, checked as boolean)}
                id={`tech-${t.id}`}
              />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MultiTechnicianFilter;
