const rankStyles = {
    Newbie: { color: '#808080', bg: 'rgba(128,128,128,0.1)' },
    Pupil: { color: '#008000', bg: 'rgba(0,128,0,0.1)' },
    Specialist: { color: '#03a89e', bg: 'rgba(3,168,158,0.1)' },
    Expert: { color: '#0000ff', bg: 'rgba(0,0,255,0.1)' },
    'Candidate Master': { color: '#aa00aa', bg: 'rgba(170,0,170,0.1)' },
    Master: { color: '#ff8c00', bg: 'rgba(255,140,0,0.1)' },
};

export default function RankBadge({ title, username }) {
    const style = rankStyles[title] || rankStyles.Newbie;
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ color: style.color, backgroundColor: style.bg, borderColor: style.color, borderWidth: 1 }}
        >
            {username && <span style={{ color: style.color }}>{username}</span>}
            {!username && title}
        </span>
    );
}
