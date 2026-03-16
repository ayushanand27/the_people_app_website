function EventCard({ name = 'Untitled Event', date = 'TBD' }) {
  return (
    <article style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
      <h3>{name}</h3>
      <p>{date}</p>
    </article>
  );
}

export default EventCard;
