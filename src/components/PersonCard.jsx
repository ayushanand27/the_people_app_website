function PersonCard({ name = 'Anonymous', bio = 'No bio yet.' }) {
  return (
    <article style={{ border: '1px solid #e5e7eb', padding: 12, borderRadius: 8 }}>
      <h3>{name}</h3>
      <p>{bio}</p>
    </article>
  );
}

export default PersonCard;
