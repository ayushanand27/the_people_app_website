import LegalPage from '../components/LegalPage'

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>By using <strong>The People App</strong>, you agree to these terms.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Eligibility</h2>
      <p>You must be at least 13 years old. You are responsible for keeping your login credentials secure.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Acceptable use</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>Be respectful — no harassment, hate speech, or spam</li>
        <li>Do not post illegal, harmful, or non-consensual content</li>
        <li>Do not impersonate others or scrape the platform</li>
        <li>Local business listings must be accurate; false listings may be removed</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Content moderation</h2>
      <p>We may remove content, ban accounts, or restrict features if you violate these terms. Video uploads may be held for review before publishing.</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Disclaimer</h2>
      <p>The app is provided &quot;as is.&quot; We are not liable for user-generated content, meetups, or third-party services (e.g. local businesses listed on the platform).</p>

      <h2 style={{ fontSize: 18, fontWeight: 900, margin: '20px 0 8px' }}>Changes</h2>
      <p>We may update these terms. Continued use after changes means you accept the updated terms.</p>
    </LegalPage>
  )
}
