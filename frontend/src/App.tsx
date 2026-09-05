import { useEffect, useState } from 'react'
import './App.css'

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
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
  { id: 'mon-1', title: 'Class', day: 0, startHour: 9, endHour: 11, category: 'class', status: 'confirmed' },
  { id: 'mon-2', title: 'Classes', day: 0, startHour: 15, endHour: 19, category: 'class', status: 'confirmed' },

  { id: 'tue-1', title: 'Classes', day: 1, startHour: 9, endHour: 13, category: 'class', status: 'confirmed' },
  { id: 'tue-2', title: 'Classes', day: 1, startHour: 15, endHour: 19, category: 'class', status: 'confirmed' },

  { id: 'thu-1', title: 'Class', day: 3, startHour: 9, endHour: 11, category: 'class', status: 'confirmed' },
  { id: 'thu-2', title: 'Class', day: 3, startHour: 17, endHour: 19, category: 'class', status: 'confirmed' },

  { id: 'fri-1', title: 'Classes', day: 4, startHour: 9, endHour: 13, category: 'class', status: 'confirmed' },
  { id: 'fri-2', title: 'Class', day: 4, startHour: 17, endHour: 19, category: 'class', status: 'confirmed' },

  { id: 'sun-1', title: 'Church', day: 6, startHour: 8, endHour: 12, category: 'church', status: 'confirmed' },

  {
    id: 'proposal-1',
    title: 'School assignment',
    day: 3,
    startHour: 13,
    endHour: 14,
    category: 'task',
    status: 'proposed',
    reason:
      'I placed this on Thursday from 1–2 PM because you have a long vacancy and it finishes the assignment before the deadline.',
  },
]

const startHour = 6
const endHour = 24
const hourHeight = 56

function formatHour(hour: number) {
  const normalizedHour = hour % 12 || 12
  const period = hour < 12 ? 'AM' : 'PM'

  return `${normalizedHour} ${period}`
}

function App() {
  const [backendOnline, setBackendOnline] = useState(false)
  const [blocks, setBlocks] = useState(initialBlocks)

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

  function acceptProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.status === 'proposed'
          ? { ...block, status: 'confirmed' }
          : block,
      ),
    )
  }

  function dismissProposal() {
    setBlocks((currentBlocks) =>
      currentBlocks.filter((block) => block.status !== 'proposed'),
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Chip</h1>
          <p>Your weekly planning assistant</p>
        </div>

        <span className={`status ${backendOnline ? 'online' : 'offline'}`}>
          {backendOnline ? 'Backend online' : 'Backend offline'}
        </span>
      </header>

      <div className="workspace">
        <section className="calendar-panel">
          <div className="week-controls">
            <button type="button">←</button>
            <h2>This week</h2>
            <button type="button">→</button>
          </div>

          <div className="calendar">
            <div className="calendar-header">
              <div className="time-corner" />

              {days.map((day) => (
                <div className="day-heading" key={day}>
                  {day}
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
                    {formatHour(hour)}
                  </span>
                ))}
              </div>

              {days.map((day, dayIndex) => (
                <div
                  className="day-column"
                  key={day}
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
                          <small>Chip proposal</small>
                        )}

                        <strong>{block.title}</strong>
                        <span>
                          {formatHour(block.startHour)}–
                          {formatHour(block.endHour)}
                        </span>
                      </article>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="chip-panel">
          <div>
            <span className="eyebrow">CHIP SAYS</span>

            {proposedBlock ? (
              <>
                <h2>I found a suitable opening.</h2>
                <p>{proposedBlock.reason}</p>

                <div className="proposal-key">
                  <span />
                  The highlighted block is awaiting your approval.
                </div>

                <div className="proposal-actions">
                  <button className="primary" onClick={acceptProposal}>
                    Accept
                  </button>

                  <button className="secondary" onClick={dismissProposal}>
                    Reject
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Your timetable is up to date.</h2>
                <p>Tell me whenever you want to add or adjust something.</p>
              </>
            )}
          </div>

          <div className="chat-box">
            <textarea
              disabled
              placeholder="Chat will be connected in a later slice..."
            />
            <button disabled>Send</button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App