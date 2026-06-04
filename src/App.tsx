import { BrowserRouter } from 'react-router-dom'
import Nav from './components/Nav'
import AppRoutes from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main>
        <AppRoutes />
      </main>
    </BrowserRouter>
  )
}
