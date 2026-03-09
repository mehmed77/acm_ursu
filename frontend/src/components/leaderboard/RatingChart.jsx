import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function RatingChart({ data }) {
    if (!data || data.length === 0) {
        return <p className="text-text-muted text-sm text-center py-8">Rating tarixi yo'q</p>;
    }

    return (
        <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                        dataKey="contest"
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        stroke="var(--color-border)"
                        angle={-20}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                        stroke="var(--color-border)"
                        domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 8,
                            color: 'var(--color-text-primary)',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="var(--color-accent)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--color-accent)', r: 4 }}
                        activeDot={{ r: 6, fill: 'var(--color-accent-hover)' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
