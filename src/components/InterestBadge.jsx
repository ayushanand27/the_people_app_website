function InterestBadge({ label = 'General' }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: '#eef2ff',
        color: '#3730a3',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

export default InterestBadge;
