import { useEffect, useState } from 'react'
import './App.css'

const days = [
  { short: 'MON', long: 'Monday' },
  { short: 'TUE', long: 'Tuesday' },
  { short: 'WED', long: 'Wednesday' },
  { short: 'THU', long: 'Thursday' },
  { short: 'FRI', long: 'Friday' },
  { short: 'SAT', long: 'Saturday' },
  { short: 'SUN', long: 'Sunday' },
]

type ScheduleBlock = {
  id: string
  title: string
  day: number
  startHour: number
  endHour: number
  category: 'class' | 'church' | 'task'
  status: 'confirmed' | 'proposed'
  reason?: string
}

const initialBlocks: ScheduleBlock[] = [
  {
    id: 'mon-1',
    title: 'Class',
    day: 0,
    startHour: 9,
    endHour: 11,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'mon-2',
    title: 'Classes',
    day: 0,
    startHour: 15,
    endHour: 19,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'tue-1',
    title: 'Classes',
    day: 1,
    startHour: 9,
    endHour: 13,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'tue-2',
    title: 'Classes',
    day: 1,
    startHour: 15,
    endHour: 19,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'thu-1',
    title: 'Class',
    day: 3,
    startHour: 9,
    endHour: 11,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'thu-2',
    title: 'Class',
    day: 3,
    startHour: 17,
    endHour: 19,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'fri-1',
    title: 'Classes',
    day: 4,
    startHour: 9,
    endHour: 13,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'fri-2',
    title: 'Class',
    day: 4,
    startHour: 17,
    endHour: 19,
    category: 'class',
    status: 'confirmed',
  },
  {
    id: 'sun-1',
    title: 'Church',
    day: 6,
    startHour: 8,
    endHour: 12,
    category: 'church',
    status: 'confirmed',
  },
  {
    id: 'proposal-1',
    title: 'School assignment',
    day: 3,
    startHour: 13,
    endHour: 14,
    category: 'task',
    status: 'proposed',
    reason:
      'This slot gives you time to finish before Friday without crowding your busiest days or taking away your evening.',
  },
]

const startHour = 6
const endHour = 24
const hourHeight = 56

function formatTime(hour: number) {
  const wholeHour = Math.floor(hour) % 24
  const minutes = hour % 1 === 0 ? '00' : '30'
  const displayHour = wholeHour % 12 || 12
  const period = wholeHour < 12 ? 'AM' : 'PM'

  return `${displayHour}:${minutes} ${period}`
}

function getWeekStart(weekOffset: number) {
  const today = new Date()
  const currentDay = today.getDay()
  const distanceFromMonday = currentDay === 0 ? -6 : 1 - currentDay

  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(today.getDate() + distanceFromMonday + weekOffset * 7)

  return monday
}

function App() {
  const [backendOnline, setBackendOnline] = useState(false)
  const [blocks, setBlocks] = useState(initialBlocks)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed')
        }

        return response.json()
      })
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
  }, [])

  const proposedBlock = blocks.find((block) => block.status === 'proposed')
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  )

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const weekDates = days.map((_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  const weekLabel = `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`

  function acceptProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.status === 'proposed'
          ? { ...block, status: 'confirmed' as const }
          : block,
      ),
    )
  }

  function rejectProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.filter((block) => block.status !== 'proposed'),
    )
  }

  function moveProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.status === 'proposed'
          ? {
              ...block,
              day: 4,
              startHour: 14,
              endHour: 15,
              reason:
                'I moved it to Friday from 2–3 PM. This still leaves time before your evening class.',
            }
          : block,
      ),
    )
  }

  function shortenProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.status === 'proposed'
          ? {
              ...block,
              endHour: block.startHour + 0.5,
              reason:
                'I shortened this to a 30-minute starter session so you can make progress without using the whole hour.',
            }
          : block,
      ),
    )
  }

  return (
    <div className="app-shell">
      <header className="command-bar">
        <div className="brand">
          <span className="brand-word">CHIP</span>
          <span className="brand-role">Your weekly planning assistant</span>
        </div>

        <div className="deck-title">
          <strong>WEEK DECK</strong>
          <span>Plan today. Breathe tomorrow.</span>
        </div>

        <div className="week-navigation">
          <button
            aria-label="Previous week"
            onClick={() => setWeekOffset((current) => current - 1)}
          >
            ‹
          </button>

          <div>
            <small>THIS WEEK</small>
            <strong>{weekLabel}</strong>
          </div>

          <button
            aria-label="Next week"
            onClick={() => setWeekOffset((current) => current + 1)}
          >
            ›
          </button>
        </div>

        <span className={`status ${backendOnline ? 'online' : 'offline'}`}>
          <i />
          {backendOnline ? 'Backend online' : 'Backend offline'}
        </span>
      </header>

      <main className="workspace">
        <section className="calendar-frame">
          <div className="calendar-toolbar">
            <div>
              <span className="section-kicker">TIMETABLE</span>
              <h1>{weekOffset === 0 ? 'This week' : weekLabel}</h1>
            </div>

            <button
              className="today-button"
              onClick={() => setWeekOffset(0)}
              type="button"
            >
              Today
            </button>
          </div>

          <div className="calendar">
            <div className="calendar-header">
              <div className="time-corner">TIME</div>

              {days.map((day, index) => (
                <div className="day-heading" key={day.short}>
                  <strong>{day.short}</strong>
                  <span>
                    {weekDates[index].toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>

            <div className="calendar-body">
              <div
                className="time-column"
                style={{ height: (endHour - startHour) * hourHeight }}
              >
                {hours.map((hour) => (
                  <span
                    className="time-label"
                    key={hour}
                    style={{ top: (hour - startHour) * hourHeight }}
                  >
                    {formatTime(hour)}
                  </span>
                ))}
              </div>

              {days.map((day, dayIndex) => (
                <div
                  className="day-column"
                  key={day.short}
                  style={{ height: (endHour - startHour) * hourHeight }}
                >
                  {hours.map((hour) => (
                    <div
                      className="hour-line"
                      key={hour}
                      style={{ top: (hour - startHour) * hourHeight }}
                    />
                  ))}

                  {blocks
                    .filter((block) => block.day === dayIndex)
                    .map((block) => (
                      <article
                        className={`schedule-block ${block.category} ${block.status}`}
                        key={block.id}
                        style={{
                          top:
                            (block.startHour - startHour) * hourHeight + 3,
                          height:
                            (block.endHour - block.startHour) * hourHeight - 6,
                        }}
                      >
                        {block.status === 'proposed' && (
                          <small>NEW FROM CHIP</small>
                        )}

                        <strong>{block.title}</strong>

                        <span>
                          {formatTime(block.startHour)}–
                          {formatTime(block.endHour)}
                        </span>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="chip-panel">
          <header className="panel-header">
            <span>CHIP SAYS</span>
            <i className={proposedBlock ? 'thinking' : ''} />
          </header>

          <div className="panel-content">
            {proposedBlock ? (
              <>
                <section className="message-card">
                  <span className="patch-label">NEW PLAN PATCH</span>
                  <h2>I found a good opening.</h2>
                  <p>{proposedBlock.reason}</p>
                </section>

                <section className="proposal-card">
                  <div className="proposal-heading">
                    <div>
                      <small>PROPOSED EVENT</small>
                      <h3>{proposedBlock.title}</h3>
                    </div>

                    <span className="new-badge">NEW</span>
                  </div>

                  <dl className="proposal-details">
                    <div>
                      <dt>Day</dt>
                      <dd>{days[proposedBlock.day].long}</dd>
                    </div>

                    <div>
                      <dt>Time</dt>
                      <dd>
                        {formatTime(proposedBlock.startHour)}–
                        {formatTime(proposedBlock.endHour)}
                      </dd>
                    </div>
                  </dl>

                  <div className="reason-box">
                    <strong>Why this time?</strong>
                    <ul>
                      <li>Finishes before Friday</li>
                      <li>Uses a natural gap between classes</li>
                      <li>Preserves your evening for rest</li>
                    </ul>
                  </div>
                </section>

                <div className="proposal-actions">
                  <button className="accept" onClick={acceptProposal}>
                    ✓ Accept
                  </button>

                  <button className="adjust" onClick={moveProposal}>
                    Adjust
                  </button>

                  <button className="reject" onClick={rejectProposal}>
                    Reject
                  </button>
                </div>

                <div className="quick-actions">
                  <button onClick={moveProposal}>Find another time</button>
                  <button onClick={moveProposal}>Move to another day</button>
                  <button onClick={shortenProposal}>Shorten to 30 min</button>
                </div>
              </>
            ) : (
              <section className="empty-message">
                <span>ALL CLEAR</span>
                <h2>Your timetable is up to date.</h2>
                <p>Tell me whenever you want to add or adjust something.</p>
              </section>
            )}
          </div>

          <div className="chat-area">
            <label htmlFor="chip-message">ASK CHIP</label>

            <div className="chat-input">
              <textarea
                disabled
                id="chip-message"
                placeholder="Chat will be connected in a later slice..."
              />
              <button disabled aria-label="Send message">
                ➤
              </button>
            </div>
          </div>
        </aside>
      </main>

      <footer className="footer-strip">
        <span>CHIP v0.1</span>
        <span>Plans. Progress. More good days.</span>
        <span>Local-first</span>
      </footer>
    </div>
  )
}

export default App