import EventMap from './components/EventMap'

function App() {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">PopMap</h1>
        <p className="text-sm">Discover local popup events</p>
      </header>
      <main className="flex-1">
        <EventMap />
      </main>
    </div>
  )
}

export default App
