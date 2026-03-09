import Badge from '../ui/Badge';

const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export default function DifficultyBadge({ difficulty }) {
    return <Badge color={difficulty}>{labels[difficulty] || difficulty}</Badge>;
}
