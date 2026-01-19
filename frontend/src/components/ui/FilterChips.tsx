interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  selected: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
}

export default function FilterChips({
  options,
  selected,
  onChange,
  multiple = false,
  showAll = true,
  allLabel = 'All',
  className = '',
}: FilterChipsProps) {
  const selectedArray = Array.isArray(selected) ? selected : [selected].filter(Boolean);
  const isAllSelected = selectedArray.length === 0;

  const handleClick = (value: string) => {
    if (value === 'all') {
      onChange(multiple ? [] : '');
      return;
    }

    if (multiple) {
      const newSelected = selectedArray.includes(value)
        ? selectedArray.filter(v => v !== value)
        : [...selectedArray, value];
      onChange(newSelected);
    } else {
      onChange(selectedArray.includes(value) ? '' : value);
    }
  };

  return (
    <div className={`filter-chips ${className}`}>
      {showAll && (
        <button
          className={`filter-chip ${isAllSelected ? 'active' : ''}`}
          onClick={() => handleClick('all')}
        >
          {allLabel}
        </button>
      )}
      {options.map(option => (
        <button
          key={option.value}
          className={`filter-chip ${selectedArray.includes(option.value) ? 'active' : ''}`}
          onClick={() => handleClick(option.value)}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-60">({option.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

// Player type filter specifically for cricket
export function PlayerTypeFilter({
  selected,
  onChange,
  counts,
}: {
  selected: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
}) {
  const options: FilterOption[] = [
    { value: 'batsman', label: 'Batsman', count: counts?.batsman },
    { value: 'bowler', label: 'Bowler', count: counts?.bowler },
    { value: 'all_rounder', label: 'All-Rounder', count: counts?.all_rounder },
    { value: 'wicket_keeper', label: 'Wicket Keeper', count: counts?.wicket_keeper },
  ];

  return (
    <FilterChips
      options={options}
      selected={selected}
      onChange={v => onChange(v as string)}
    />
  );
}

// Team filter for IPL teams
export function TeamFilter({
  teams,
  selected,
  onChange,
}: {
  teams: string[];
  selected: string;
  onChange: (value: string) => void;
}) {
  const options: FilterOption[] = teams.map(team => ({
    value: team,
    label: team,
  }));

  return (
    <FilterChips
      options={options}
      selected={selected}
      onChange={v => onChange(v as string)}
      allLabel="All Teams"
    />
  );
}
