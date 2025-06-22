
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TechnicianFilterProps {
  technicians: Array<{ id: string; name: string }>;
  selectedTechnician: string;
  onTechnicianChange: (technicianId: string) => void;
}

const TechnicianFilter: React.FC<TechnicianFilterProps> = ({
  technicians,
  selectedTechnician,
  onTechnicianChange
}) => {
  return (
    <div className="mb-6">
      <Select value={selectedTechnician} onValueChange={onTechnicianChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Filter op monteur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle monteurs</SelectItem>
          {technicians.map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              {tech.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TechnicianFilter;
