import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SessionFiltersProps {
  onFilterChange: (filters: SessionFilterValues) => void;
  filters: SessionFilterValues;
}

export interface SessionFilterValues {
  subject: string;
  class: string;
  sessionType: string;
  duration: string;
}

const subjects = ["All Subjects", "Mathematics", "Physics", "Chemistry", "Biology", "English"];
const classes = ["All Classes", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const sessionTypes = ["All Types", "Mentorship", "Doubt"];
const durations = ["All Durations", "15 min", "30 min", "45 min", "60 min"];

export default function SessionFilters({ onFilterChange, filters }: SessionFiltersProps) {
  const hasActiveFilters =
    filters.subject !== "All Subjects" ||
    filters.class !== "All Classes" ||
    filters.sessionType !== "All Types" ||
    filters.duration !== "All Durations";

  const clearFilters = () => {
    onFilterChange({
      subject: "All Subjects",
      class: "All Classes",
      sessionType: "All Types",
      duration: "All Durations",
    });
  };

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/30 rounded-lg mb-4">
      <Select
        value={filters.subject}
        onValueChange={(value) => onFilterChange({ ...filters, subject: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject} value={subject}>
              {subject}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.class}
        onValueChange={(value) => onFilterChange({ ...filters, class: value })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Class" />
        </SelectTrigger>
        <SelectContent>
          {classes.map((cls) => (
            <SelectItem key={cls} value={cls}>
              {cls}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sessionType}
        onValueChange={(value) => onFilterChange({ ...filters, sessionType: value })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {sessionTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.duration}
        onValueChange={(value) => onFilterChange({ ...filters, duration: value })}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Duration" />
        </SelectTrigger>
        <SelectContent>
          {durations.map((dur) => (
            <SelectItem key={dur} value={dur}>
              {dur}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
