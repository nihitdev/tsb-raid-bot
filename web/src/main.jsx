import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(() => setStatus(null))
  }, [])

  return (
    <main className="page">
      <section className="hero">
        <div className="badge">THE STRONGEST BATTLEGROUNDS</div>

        <h1>K¥RØX LΞGIØN</h1>

        <p className="subtitle">
          Fast raid calls, backup alerts, role pings, join links, and clean Discord embeds for your TSB clan.
        </p>

        <div className="buttons">
          <a className="primary" href="/invite">Add Bot to Discord</a>
          <a className="secondary" href="#commands">View Commands</a>
        </div>

        <div className="status-card">
          <div>
            <span className={status?.discordReady ? 'dot online' : 'dot'}></span>
            Bot Status
          </div>
          <strong>{status?.discordReady ? 'Online' : 'Checking...'}</strong>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <span>{status?.guilds ?? '-'}</span>
          <p>Servers</p>
        </div>
        <div className="stat">
          <span>{status?.configuredServers ?? '-'}</span>
          <p>Configured</p>
        </div>
        <div className="stat">
          <span>{status?.uptimeSeconds ? Math.floor(status.uptimeSeconds / 60) : '-'}</span>
          <p>Uptime Minutes</p>
        </div>
      </section>

      <section id="commands" className="panel">
        <h2>Commands</h2>

        <div className="command">
          <code>/raid</code>
          <p>Call a big raid with target, allies, and Roblox/RoSeal join link.</p>
        </div>

        <div className="command">
          <code>/backup</code>
          <p>Request backup against teamers with instant role alerts.</p>
        </div>

        <div className="command">
          <code>/setup_raid</code>
          <p>Admin setup for raid channel, big raid role, and backup role.</p>
        </div>

        <div className="command">
          <code>/config</code>
          <p>Check current server configuration.</p>
        </div>
      </section>

      <section className="panel grid">
        <div>
          <h2>Why use it?</h2>
          <p>Built for clans that need fast calls, clean posts, and no messy copy-paste raid messages.</p>
        </div>

        <div>
          <h2>Safe setup</h2>
          <p>Only admins configure the bot. Normal members can call raids after setup.</p>
        </div>

        <div>
          <h2>End Raid button</h2>
          <p>The raid starter can end the raid directly from Discord.</p>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
