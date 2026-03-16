function GroupCard({ title = 'Untitled Group', members = 0 }) {
  return (
    <article style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
      <h3>{title}</h3>
      <p>{members} members</p>
    </article>
  );
}

export default GroupCard;
