import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

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
  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, id]);
    } else {
      onChange(selected.filter(t => t !== id));
    }
  };

  const allSelected = selected.length === 0;

  const toggleAll = () => {
    if (allSelected) {
      onChange(technicians.map(t => t.id));
    } else {
      onChange([]);
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={allSelected} onCheckedChange={toggleAll} id="tech-all" />
        <span>Alle monteurs</span>
      </label>
      {technicians.map(t => (
        <label key={t.id} className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={allSelected ? true : selected.includes(t.id)}
            onCheckedChange={checked => toggle(t.id, checked as boolean)}
            id={`tech-${t.id}`}
          />
          <span>{t.name}</span>
        </label>
      ))}
    </div>
  );
};

export default MultiTechnicianFilter;
