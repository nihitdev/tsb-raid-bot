import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const INVITE_URL =
  'https://discord.com/oauth2/authorize?client_id=1522564051421364344&permissions=2147485696&integration_type=0&scope=bot%20applications.commands'

function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="badge">THE STRONGEST BATTLEGROUNDS</div>

        <h1>TSB Raid Bot</h1>

        <p className="subtitle">
          Fast raid calls, backup alerts, role pings, Roblox/RoSeal join links,
          and clean Discord embeds for your TSB server.
        </p>

        <div className="buttons">
          <a className="primary" href={INVITE_URL} target="_blank" rel="noreferrer">
            Invite Bot
          </a>
          <a className="secondary" href="#commands">
            View Commands
          </a>
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
          <h2>Fast Alerts</h2>
          <p>Ping the right raid or backup role instantly.</p>
        </div>

        <div>
          <h2>Clean Posts</h2>
          <p>Every raid call is posted as a clean Discord embed.</p>
        </div>

        <div>
          <h2>End Raid Button</h2>
          <p>The raid starter can end the raid directly from Discord.</p>
        </div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
