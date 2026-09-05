import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  service: string
}

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking Chip...")

  useEffect(() => {
    fetch('http://127.0.0.1:8000/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed')
      }
      
      return response.json()
  })
    .then((data: HealthResponse) => {
      if (data.status === 'ok') {
        setBackendStatus('Chip backend is online.')
      }
      })
    .catch(() => {
      setBackendStatus('Chip backend is offline.')
    })
  }, 
  [])

  return (
    <main>
      <h1>Chip</h1>
      <p>Local-first weekly planning assistant.</p>
      <p>{backendStatus}</p>
    </main>
  )

}

export default App