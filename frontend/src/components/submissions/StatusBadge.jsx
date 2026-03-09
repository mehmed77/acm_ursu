import Badge from '../ui/Badge';

const statusLabels = {
    pending: 'Pending',
    running: 'Running',
    accepted: 'Accepted',
    wrong_answer: 'Wrong Answer',
    time_limit_exceeded: 'Time Limit',
    memory_limit_exceeded: 'Memory Limit',
    runtime_error: 'Runtime Error',
    compilation_error: 'Compilation Error',
};

export default function StatusBadge({ status }) {
    return <Badge color={status}>{statusLabels[status] || status}</Badge>;
}
