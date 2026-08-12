import LegalPage from '../components/LegalPage'

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p><strong>The People App</strong> respects your privacy. This policy explains what we collect and how we use it.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Data we collect</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>Account info: email, name, username, city, interests, bio, avatar</li>
        <li>Content you post: messages, videos (Moments), group/event participation</li>
        <li>Usage analytics via PostHog (anonymized where possible)</li>
        <li>Error reports via Sentry in production</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>How we use it</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>To show you people, events, and local listings in your chosen city</li>
        <li>To enable chat, notifications, and social features</li>
        <li>To improve the app and fix bugs</li>
        <li>To moderate content and enforce community guidelines</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Data storage</h2>
      <p>Data is stored on Supabase (PostgreSQL) with row-level security. Videos are hosted on Cloudinary. We do not sell your personal data.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Your rights</h2>
      <p>You can update your profile in Settings or permanently delete your account (Settings → Delete account). Deletion removes your auth account and cascades related profile data.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Contact</h2>
      <p>Questions? Email us via the contact details in Settings → List your business.</p>
    </LegalPage>
  )
}
